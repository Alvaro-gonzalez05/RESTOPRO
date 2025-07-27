// VERSION SIMPLIFICADA TEMPORAL - Para permitir funcionalidad básica sin bot activo
import OpenAI from 'openai'
import { sql } from '@/lib/db'

export interface BotInstance {
  id: string
  userId: number
  openai?: OpenAI
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
}

export class WhatsAppBotManager {
  private static instances: Map<number, BotInstance> = new Map()

  // Crear una nueva instancia de bot para un usuario (SIMULADO)
  static async createBotInstance(userId: number, openaiApiKey?: string): Promise<BotInstance> {
    try {
      console.log(`⚠️ Creando bot simulado para usuario ${userId}`)
      
      // Configurar OpenAI si se proporciona API key
      let openai: OpenAI | undefined
      if (openaiApiKey) {
        openai = new OpenAI({
          apiKey: openaiApiKey
        })
      }

      // SIMULADO: Solo crear la instancia sin bot real de Baileys
      const instance: BotInstance = {
        id: `bot-user-${userId}`,
        userId,
        openai,
        status: 'connecting'
      }

      this.instances.set(userId, instance)
      await this.updateBotStatus(userId, 'connecting')

      // Simular QR code temporal (en producción vendría de Baileys)
      const simulatedQR = `qr-simulation-${userId}-${Date.now()}`
      await this.saveQRCode(userId, simulatedQR)

      // Simular conexión exitosa después de un momento
      setTimeout(async () => {
        instance.status = 'connected'
        await this.updateBotStatus(userId, 'connected')
        console.log(`✅ Bot simulado conectado para usuario ${userId}`)
      }, 2000)

      console.log(`✅ Instancia simulada creada para usuario ${userId}`)
      return instance
    } catch (error) {
      console.error(`Error creando bot simulado para usuario ${userId}:`, error)
      await this.updateBotStatus(userId, 'error')
      throw error
    }
  }

  // Detener un bot de usuario
  static async stopBotInstance(userId: number): Promise<void> {
    const instance = this.instances.get(userId)
    if (!instance) {
      throw new Error(`No se encontró instancia para usuario ${userId}`)
    }

    try {
      console.log(`⚠️ Deteniendo bot simulado para usuario ${userId}`)
      
      await this.updateBotStatus(userId, 'disconnected')
      this.instances.delete(userId)
      
      console.log(`✅ Bot simulado detenido para usuario ${userId}`)
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
  private static async saveQRCode(userId: number, qrCode: string): Promise<void> {
    try {
      await sql(
        'UPDATE user_bots SET qr_code = $1, updated_at = NOW() WHERE user_id = $2',
        [qrCode, userId]
      )
    } catch (error) {
      console.error(`Error guardando QR code para usuario ${userId}:`, error)
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

  // Procesar mensaje con IA o respuesta predefinida (para testing)
  static async processMessage(userId: number, message: string): Promise<string> {
    try {
      const botConfig = await sql(
        'SELECT ai_role, ai_prompt, default_response, openai_api_key FROM user_bots WHERE user_id = $1 AND is_active = true',
        [userId]
      )

      if (botConfig.length === 0) {
        return "Lo siento, no tengo configuración disponible."
      }

      const config = botConfig[0]
      const instance = this.instances.get(userId)

      // Si hay OpenAI configurado, usar IA
      if (instance?.openai && config.ai_role && config.ai_prompt) {
        try {
          const systemPrompt = `Rol: ${config.ai_role}\n\nInstrucciones: ${config.ai_prompt}`
          
          const completion = await instance.openai.chat.completions.create({
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
      return config.default_response || "Gracias por tu mensaje."
    } catch (error) {
      console.error(`Error procesando mensaje para usuario ${userId}:`, error)
      return "Lo siento, ocurrió un error procesando tu mensaje."
    }
  }

  // Crear conversación de prueba (para demo)
  static async createTestConversation(userId: number, phoneNumber: string): Promise<void> {
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

      // Crear conversación
      const conversation = await sql(
        'INSERT INTO bot_conversations (user_bot_id, contact_number, contact_name, last_message, last_message_at, created_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
        [userBotId, phoneNumber, 'Cliente de prueba', 'Por supuesto! Te puedo ayudar con información sobre nuestros productos...']
      )

      const conversationId = conversation[0].id

      // Crear algunos mensajes de prueba
      await sql(
        `INSERT INTO bot_messages (conversation_id, message_type, content, created_at)
        VALUES 
          ($1, 'incoming', 'Hola, ¿cómo están?', NOW() - INTERVAL '5 minutes'),
          ($1, 'outgoing', 'Hola! Muy bien, gracias por preguntar. ¿En qué te puedo ayudar?', NOW() - INTERVAL '4 minutes'),
          ($1, 'incoming', 'Quisiera información sobre sus productos', NOW() - INTERVAL '2 minutes'),
          ($1, 'outgoing', 'Por supuesto! Te puedo ayudar con información sobre nuestros productos...', NOW() - INTERVAL '1 minute')`,
        [conversationId]
      )

      console.log(`✅ Conversación de prueba creada para usuario ${userId}`)
    } catch (error) {
      console.error(`Error creando conversación de prueba:`, error)
    }
  }
}
