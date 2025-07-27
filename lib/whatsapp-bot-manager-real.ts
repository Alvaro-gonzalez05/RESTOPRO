import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  MessageUpsertType,
  WAMessage,
  proto
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode-terminal'
import OpenAI from 'openai'
import { sql } from '@/lib/db'
import pino from 'pino'
import fs from 'fs'
import path from 'path'

const logger = pino({ level: 'warn' })

export interface BotInstance {
  id: string
  userId: number
  socket?: any
  openai?: OpenAI
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  qrCode?: string
}

export class WhatsAppBotManager {
  private static instances: Map<number, BotInstance> = new Map()
  private static authDir = path.join(process.cwd(), 'auth-sessions')
  private static cooldownUsers: Map<number, number> = new Map() // Para manejar el cooldown después del error 515
  private static userTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private static userMessages: Map<string, { remoteJid: string, messages: string[] }> = new Map();


  // Asegurar que existe el directorio de autenticación
  static ensureAuthDir() {
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true })
    }
  }

  // Crear una nueva instancia de bot para un usuario
  static async createBotInstance(userId: number, openaiApiKey?: string): Promise<BotInstance> {
    try {
      console.log(`🤖 Creando bot real con Baileys para usuario ${userId}`)
      
      // Verificar cooldown después de error 515
      const cooldownUntil = this.cooldownUsers.get(userId)
      if (cooldownUntil && Date.now() < cooldownUntil) {
        const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000)
        throw new Error(`⏰ Debe esperar ${remainingSeconds} segundos más antes de generar un nuevo QR (después del error 515)`)
      }
      
      // Verificar si ya existe una instancia
      if (this.instances.has(userId)) {
        console.log(`⚠️ Ya existe una instancia para usuario ${userId}`)
        const existingInstance = this.instances.get(userId)!
        if (existingInstance.status !== 'error') {
          return existingInstance
        } else {
          // Si está en error, limpiar y continuar
          this.instances.delete(userId)
        }
      }
      
      // Configurar OpenAI si se proporciona API key
      let openai: OpenAI | undefined
      if (openaiApiKey) {
        openai = new OpenAI({
          apiKey: openaiApiKey
        })
      }

      // Verificar si ya existe una instancia
      const existingInstance = this.instances.get(userId)
      if (existingInstance) {
        console.log(`⚠️ Ya existe una instancia para usuario ${userId}`)
        return existingInstance
      }

      this.ensureAuthDir()
      
      // Limpiar cualquier sesión existente antes de crear una nueva
      const authPath = path.join(this.authDir, `session-${userId}`)
      if (fs.existsSync(authPath)) {
        console.log(`🧹 Limpiando sesión existente para usuario ${userId}`)
        fs.rmSync(authPath, { recursive: true, force: true })
      }
      
      // Configurar autenticación con sesión limpia
      const { state, saveCreds } = await useMultiFileAuthState(authPath)

      // Crear socket de WhatsApp con configuración optimizada
      const socket = makeWASocket({
        auth: state,
        logger: logger,
        browser: ['RestoPro Bot', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      })

      const instance: BotInstance = {
        id: `bot-user-${userId}`,
        userId,
        socket,
        openai,
        status: 'connecting'
      }

      this.instances.set(userId, instance)
      await this.updateBotStatus(userId, 'connecting')

      // Manejar eventos del socket
      socket.ev.on('creds.update', saveCreds)

      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          console.log(`📱 QR Code generado para usuario ${userId}`)
          console.log(`📱 QR Length: ${qr.length}`)
          console.log(`📱 QR Preview: ${qr.substring(0, 50)}...`)
          
          // Pequeño retraso para estabilizar la conexión
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          QRCode.generate(qr, { small: true })
          
          // Guardar QR en base de datos
          instance.qrCode = qr
          await this.saveQRCode(userId, qr)
          
          console.log(`✅ QR listo para escanear - NO SE CAMBIARÁ AUTOMÁTICAMENTE`)
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
          const errorCode = (lastDisconnect?.error as Boom)?.output?.statusCode
          const errorMessage = lastDisconnect?.error?.message
          
          console.log(`❌ Conexión cerrada para usuario ${userId}`)
          console.log(`📋 Detalles de desconexión:`)
          console.log(`   - Error Code: ${errorCode}`)
          console.log(`   - Error Message: ${errorMessage}`)
          console.log(`   - Should Reconnect: ${shouldReconnect}`)
          console.log(`   - Disconnect Reason: ${JSON.stringify(DisconnectReason)}`)
          
          // Error 515 = restartRequired - estrategia especial
          if (errorCode === 515) {
            console.log(`🧹 Error 515 detectado - aplicando estrategia de limpieza profunda para usuario ${userId}`)
            
            // Cerrar socket existente completamente
            try {
              await socket.logout()
            } catch (e) {
              console.log(`⚠️ Error cerrando socket:`, e)
            }
            
            // Limpiar todas las sesiones del usuario
            const sessionPath = path.join(process.cwd(), 'auth-sessions', `session-${userId}`)
            try {
              if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true })
                console.log(`✅ Sesión completamente eliminada: ${sessionPath}`)
              }
            } catch (err) {
              console.error(`Error limpiando sesión:`, err)
            }
            
            // Limpiar instancia completamente
            instance.status = 'disconnected'
            await this.updateBotStatus(userId, 'disconnected')
            await this.saveQRCode(userId, null)
            this.instances.delete(userId)
            
            // Establecer cooldown de 15 segundos
            this.cooldownUsers.set(userId, Date.now() + 15000)
            
            console.log(`⏰ Usuario ${userId} debe esperar 15 segundos antes de generar nuevo QR`)
            console.log(`💡 Recomendación: Cerrar WhatsApp Web en otros dispositivos antes de escanear`)
          } else if (shouldReconnect) {
            instance.status = 'connecting'
            await this.updateBotStatus(userId, 'connecting')
            // Reintentar conexión solo para otros errores
            setTimeout(() => {
              this.createBotInstance(userId, openaiApiKey)
            }, 3000)
          } else {
            instance.status = 'disconnected'
            await this.updateBotStatus(userId, 'disconnected')
            this.instances.delete(userId)
          }
        } else if (connection === 'open') {
          console.log(`✅ Bot conectado para usuario ${userId}`)
          instance.status = 'connected'
          await this.updateBotStatus(userId, 'connected')
          
          // Limpiar cooldown en caso de conexión exitosa
          this.cooldownUsers.delete(userId)
          
          // Limpiar QR code cuando se conecta
          instance.qrCode = undefined
          await this.saveQRCode(userId, null)
        }
      })

      // Manejar mensajes entrantes
      socket.ev.on('messages.upsert', async ({ messages, type }: { messages: WAMessage[], type: MessageUpsertType }) => {
        if (type === 'notify') {
          for (const message of messages) {
            this.queueIncomingMessage(userId, message, openai);
          }
        }
      });

      console.log(`✅ Instancia de bot creada para usuario ${userId}`)
      return instance
    } catch (error) {
      console.error(`❌ Error creando bot para usuario ${userId}:`, error)
      await this.updateBotStatus(userId, 'error')
      throw error
    }
  }

  private static queueIncomingMessage(userId: number, message: WAMessage, openai?: OpenAI) {
    const instance = this.instances.get(userId);
    if (!instance?.socket) return;

    if (!message.message?.conversation && !message.message?.extendedTextMessage?.text) return;
    if (message.key.fromMe) return;

    const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const remoteJid = message.key.remoteJid || '';
    const phoneNumber = remoteJid.replace('@s.whatsapp.net', '') || '';
    const conversationKey = `${userId}-${phoneNumber}`;

    // Add message to queue
    let conversationData = this.userMessages.get(conversationKey);
    if (!conversationData) {
      conversationData = { remoteJid, messages: [] };
      this.userMessages.set(conversationKey, conversationData);
    }
    conversationData.messages.push(messageText);

    // Clear existing timer
    if (this.userTimeouts.has(conversationKey)) {
      clearTimeout(this.userTimeouts.get(conversationKey));
    }

    // Set a new timer
    const timer = setTimeout(() => {
      this.handleIncomingMessage(userId, remoteJid, openai);
      this.userMessages.delete(conversationKey);
      this.userTimeouts.delete(conversationKey);
    }, 3000); // 3-second delay

    this.userTimeouts.set(conversationKey, timer);
  }

  // Manejar mensaje entrante
  private static async handleIncomingMessage(userId: number, remoteJid: string, openai?: OpenAI) {
    try {
      const instance = this.instances.get(userId)
      if (!instance?.socket) return

      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '') || ''
      const conversationKey = `${userId}-${phoneNumber}`;
      const conversationData = this.userMessages.get(conversationKey);

      if (!conversationData || conversationData.messages.length === 0) {
        return;
      }

      const fullMessage = conversationData.messages.join('\n');

      console.log(`💬 Mensaje recibido de ${phoneNumber}: ${fullMessage}`)

      // Guardar mensaje entrante
      await this.saveIncomingMessage(userId, phoneNumber, fullMessage)

      // Procesar respuesta
      const response = await this.processMessage(userId, fullMessage, openai)

      if (response) {
        // Enviar respuesta
        await instance.socket.sendMessage(remoteJid, { text: response })
        
        // Guardar mensaje saliente
        await this.saveOutgoingMessage(userId, phoneNumber, response)
        
        console.log(`🤖 Respuesta enviada a ${phoneNumber}: ${response}`)
      }
    } catch (error) {
      console.error('Error manejando mensaje entrante:', error)
    }
  }

  // Procesar mensaje con IA o respuesta predefinida
  private static async processMessage(userId: number, message: string, openai?: OpenAI): Promise<string> {
    try {
      const botConfig = await sql(
        'SELECT ai_role, ai_prompt, default_response FROM user_bots WHERE user_id = $1 AND is_active = true',
        [userId]
      )

      if (botConfig.length === 0) {
        return "Lo siento, no tengo configuración disponible."
      }

      const config = botConfig[0]

      // Si hay OpenAI configurado, usar IA
      if (openai && config.ai_role && config.ai_prompt) {
        try {
          const systemPrompt = `Rol: ${config.ai_role}\n\nInstrucciones: ${config.ai_prompt}`
          
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ],
            max_tokens: 500,
            temperature: 0.7
          })

          return completion.choices[0]?.message?.content || config.default_response || "Gracias por tu mensaje."
        } catch (openaiError) {
          console.error('Error con OpenAI:', openaiError)
          return config.default_response || "Lo siento, hay un problema temporal con la IA."
        }
      }

      // Si no hay IA, usar respuesta por defecto
      return config.default_response || "Gracias por tu mensaje. En breve te responderemos."
    } catch (error) {
      console.error(`Error procesando mensaje para usuario ${userId}:`, error)
      return "Lo siento, ocurrió un error procesando tu mensaje."
    }
  }

  // Detener un bot de usuario
  static async stopBotInstance(userId: number): Promise<void> {
    const instance = this.instances.get(userId)
    if (!instance) {
      throw new Error(`No se encontró instancia para usuario ${userId}`)
    }

    try {
      console.log(`🛑 Deteniendo bot para usuario ${userId}`)
      
      if (instance.socket) {
        await instance.socket.logout()
        instance.socket.end()
      }
      
      await this.updateBotStatus(userId, 'disconnected')
      this.instances.delete(userId)
      
      // Limpiar archivos de sesión
      const authPath = path.join(this.authDir, `session-${userId}`)
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true })
      }
      
      console.log(`✅ Bot detenido para usuario ${userId}`)
    } catch (error) {
      console.error(`Error deteniendo bot para usuario ${userId}:`, error)
      throw error
    }
  }

  // Obtener instancia de bot de un usuario
  static getBotInstance(userId: number): BotInstance | undefined {
    return this.instances.get(userId)
  }

  // Listar todas las instancias activas
  static getAllInstances(): BotInstance[] {
    return Array.from(this.instances.values())
  }

  // Actualizar estado del bot en la base de datos
  private static async updateBotStatus(userId: number, status: BotInstance['status']): Promise<void> {
    try {
      await sql(
        'UPDATE user_bots SET status = $1, updated_at = NOW() WHERE user_id = $2',
        [status, userId]
      )
    } catch (error) {
      console.error(`Error actualizando estado del bot para usuario ${userId}:`, error)
    }
  }

  // Guardar QR code en la base de datos
  private static async saveQRCode(userId: number, qrCode: string | null): Promise<void> {
    try {
      await sql(
        'UPDATE user_bots SET qr_code = $1, updated_at = NOW() WHERE user_id = $2',
        [qrCode, userId]
      )
    } catch (error) {
      console.error(`Error guardando QR code para usuario ${userId}:`, error)
    }
  }

  // Guardar mensaje entrante en la base de datos
  private static async saveIncomingMessage(userId: number, phoneNumber: string, message: string): Promise<void> {
    try {
      // Primero obtener el user_bot_id
      const userBot = await sql(
        'SELECT id FROM user_bots WHERE user_id = $1 AND is_active = true',
        [userId]
      )

      if (userBot.length === 0) {
        console.error(`No se encontró bot activo para usuario ${userId}`)
        return
      }

      const userBotId = userBot[0].id

      // Buscar o crear conversación
      let conversation = await sql(
        'SELECT id FROM bot_conversations WHERE user_bot_id = $1 AND contact_number = $2',
        [userBotId, phoneNumber]
      )

      let conversationId: number
      if (conversation.length === 0) {
        const newConversation = await sql(
          'INSERT INTO bot_conversations (user_bot_id, contact_number, last_message, last_message_at, created_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
          [userBotId, phoneNumber, message]
        )
        conversationId = newConversation[0].id
      } else {
        conversationId = conversation[0].id
        // Actualizar última mensaje en conversación
        await sql(
          'UPDATE bot_conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2',
          [message, conversationId]
        )
      }

      // Guardar mensaje
      await sql(
        'INSERT INTO bot_messages (conversation_id, message_type, content, created_at) VALUES ($1, $2, $3, NOW())',
        [conversationId, 'incoming', message]
      )
    } catch (error) {
      console.error(`Error guardando mensaje entrante para usuario ${userId}:`, error)
    }
  }

  // Guardar mensaje saliente en la base de datos
  private static async saveOutgoingMessage(userId: number, phoneNumber: string, message: string): Promise<void> {
    try {
      // Primero obtener el user_bot_id
      const userBot = await sql(
        'SELECT id FROM user_bots WHERE user_id = $1 AND is_active = true',
        [userId]
      )

      if (userBot.length === 0) {
        console.error(`No se encontró bot activo para usuario ${userId}`)
        return
      }

      const userBotId = userBot[0].id

      // Buscar conversación existente
      const conversation = await sql(
        'SELECT id FROM bot_conversations WHERE user_bot_id = $1 AND contact_number = $2',
        [userBotId, phoneNumber]
      )

      if (conversation.length > 0) {
        const conversationId = conversation[0].id

        // Guardar mensaje
        await sql(
          'INSERT INTO bot_messages (conversation_id, message_type, content, created_at) VALUES ($1, $2, $3, NOW())',
          [conversationId, 'outgoing', message]
        )

        // Actualizar última mensaje en conversación
        await sql(
          'UPDATE bot_conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2',
          [message, conversationId]
        )
      }
    } catch (error) {
      console.error(`Error guardando mensaje saliente para usuario ${userId}:`, error)
    }
  }

  // Obtener conversaciones de un bot
  static async getBotConversations(userId: number): Promise<any[]> {
    try {
      const conversations = await sql(
        `SELECT 
          bc.id,
          bc.contact_number,
          bc.contact_name,
          bc.last_message,
          bc.last_message_at,
          bc.created_at,
          COUNT(bm.id) as message_count
        FROM bot_conversations bc
        LEFT JOIN bot_messages bm ON bc.id = bm.conversation_id
        LEFT JOIN user_bots ub ON bc.user_bot_id = ub.id
        WHERE ub.user_id = $1
        GROUP BY bc.id, bc.contact_number, bc.contact_name, bc.last_message, bc.last_message_at, bc.created_at
        ORDER BY bc.last_message_at DESC NULLS LAST`,
        [userId]
      )
      
      return conversations
    } catch (error) {
      console.error(`Error obteniendo conversaciones para usuario ${userId}:`, error)
      return []
    }
  }

  // Obtener mensajes de una conversación
  static async getConversationMessages(conversationId: number): Promise<any[]> {
    try {
      const messages = await sql(
        `SELECT id, message_type, content, created_at
        FROM bot_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC`,
        [conversationId]
      )
      
      return messages
    } catch (error) {
      console.error(`Error obteniendo mensajes de conversación ${conversationId}:`, error)
      return []
    }
  }
}
