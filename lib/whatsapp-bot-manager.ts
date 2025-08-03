import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { sql } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { toDataURL } from 'qrcode';
import { revalidatePath } from 'next/cache'; // Importar revalidatePath

export interface BotInstance {
  id: string;
  userId: number;
  sock?: ReturnType<typeof makeWASocket>;
  generativeAI?: GoogleGenerativeAI;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  qrCode?: string;
  phoneNumber?: string;
  conversationsHistory: Map<string, { role: string; parts: { text: string }[] }[]>;
}

export class WhatsAppBotManager {
  private static instances: Map<number, BotInstance> = new Map();

  static async createBotInstance(userId: number, aiApiKey?: string): Promise<BotInstance> {
    // Si ya existe una instancia, la detenemos y limpiamos antes de crear una nueva.
    if (this.instances.has(userId)) {
      console.log(`[${userId}] Deteniendo instancia existente antes de crear una nueva.`);
      await this.stopBot(userId);
    }

    const logger = pino({ level: 'info' });
    const { state, saveCreds } = await useMultiFileAuthState(path.join(process.cwd(), `auth-sessions/user-${userId}`));

    const { version, isLatest } = await fetchLatestBaileysVersion();
    

    const instance: BotInstance = {
      id: `bot-user-${userId}`,
      userId,
      status: 'connecting',
      conversationsHistory: new Map(), // Initialize conversations history
    };

    if (aiApiKey) {
      
      instance.generativeAI = new GoogleGenerativeAI(aiApiKey);
    }

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      generateHighQualityLinkPreview: true,
      shouldIgnoreJid: jid => jid?.includes('broadcast') || jid?.includes('status'),
    });

    instance.sock = sock;
    this.instances.set(userId, instance);
    await this.updateBotStatus(userId, 'connecting');

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrDataUrl = await toDataURL(qr);
        instance.qrCode = qrDataUrl;
        
        await this.saveQRCode(userId, qrDataUrl);
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        

        if (shouldReconnect) {
          await this.createBotInstance(userId, aiApiKey); // Reconnect
        } else {
          instance.status = 'disconnected';
          instance.qrCode = undefined;
          instance.phoneNumber = undefined;
          await this.updateBotStatus(userId, 'disconnected');
          await this.clearQRCode(userId);
          
        }
      } else if (connection === 'open') {
        instance.status = 'connected';
        instance.qrCode = undefined;
        instance.phoneNumber = sock.user?.id?.split(':')[0];
        await this.updateBotStatus(userId, 'connected', instance.phoneNumber);
        await this.clearQRCode(userId);
        
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];

      // Filtrar mensajes enviados por el propio bot o mensajes de estado/protocolo
      if (msg.key.fromMe) {
        return;
      }

      const remoteJid = msg.key.remoteJid; // JID completo del remitente
      const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

      // Solo procesar mensajes de texto de usuarios externos
      if (remoteJid && messageText) {
        const phoneNumber = remoteJid.split('@')[0]; // Solo el número para la DB
        await this.handleIncomingMessage(userId, remoteJid, messageText, instance.generativeAI); // Pasar JID completo
      } else {
        // Filtering out non-text or empty message
      }
    });

    return instance;
  }

  static async handleIncomingMessage(userId: number, fromJid: string, messageText: string, generativeAI?: GoogleGenerativeAI): Promise<void> {
    try {
      const phoneNumber = fromJid.split('@')[0]; // Extraer número para DB
      await this.saveIncomingMessage(userId, phoneNumber, messageText);

      const instance = this.instances.get(userId);
      if (!instance) return; // Should not happen

      // Get or initialize conversation history for this JID
      let conversationHistory = instance.conversationsHistory.get(fromJid) || [];

      // Add user message to history
      conversationHistory.push({ role: 'user', parts: [{ text: messageText }] });

      // Limit history size (e.g., last 10 messages)
      const MAX_HISTORY_SIZE = 10;
      if (conversationHistory.length > MAX_HISTORY_SIZE) {
        conversationHistory = conversationHistory.slice(conversationHistory.length - MAX_HISTORY_SIZE);
      }
      instance.conversationsHistory.set(fromJid, conversationHistory);

      const response = await this.processMessage(userId, phoneNumber, messageText, generativeAI, conversationHistory);
      if (response) {
        console.log(`[${userId}] Sending response to ${fromJid}: "${response}"`);
        await this.sendMessage(userId, fromJid, response); // Usar JID completo para enviar
        await this.saveOutgoingMessage(userId, phoneNumber, response);

        // Add bot response to history
        conversationHistory.push({ role: 'model', parts: [{ text: response }] });
        instance.conversationsHistory.set(fromJid, conversationHistory);
      } else {
        
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  static async processMessage(userId: number, from: string, message: string, generativeAI?: GoogleGenerativeAI, history: { role: string; parts: { text: string }[] }[] = []): Promise<string> {
    try {
      const botConfig = await sql(
        'SELECT * FROM user_bots WHERE user_id = $1',
        [userId]
      );

      

      const config = botConfig[0];
      

      const predefinedResponse = await this.findPredefinedResponse(userId, message);
      

      if (config.ai_enabled && generativeAI) {
        return await this.getAIResponse(message, config.ai_role, config.ai_instructions, generativeAI, history);
      }

      
      return 'Gracias por tu mensaje. En breve te responderemos.';
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      return 'Lo siento, ocurrió un error procesando tu mensaje.';
    }
  }

  static async findPredefinedResponse(userId: number, message: string): Promise<string | null> {
    try {
      const messages = await sql(
        'SELECT * FROM chatbot_messages WHERE user_id = $1 AND is_active = TRUE',
        [userId]
      );

      const messageWords = message.toLowerCase().split(/\s+/);
      
      for (const configMessage of messages) {
        const keywords = configMessage.trigger_keywords ? configMessage.trigger_keywords.map((k: string) => k.trim().toLowerCase()) : [];
        
        if (keywords.some((keyword: string) => messageWords.includes(keyword))) {
          return await this.replaceVariables(configMessage.message_text, userId);
        }
      }

      return null;
    } catch (error) {
      console.error('Error buscando respuesta predefinida:', error);
      return null;
    }
  }

  static async getAIResponse(message: string, role: string, instructions: string, generativeAI: GoogleGenerativeAI, history: { role: string; parts: { text: string }[] }[] = []): Promise<string> {
    try {
      const model = generativeAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Aseguramos el modelo gemini-1.5-flash

      const chat = model.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 500,
        },
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();
      

      return text || 'Lo siento, no pude generar una respuesta.';
    } catch (error) {
      console.error('Error con Gemini AI:', error);
      return 'Lo siento, hay un problema con el servicio de IA en este momento.';
    }
  }

  static async replaceVariables(content: string, userId: number): Promise<string> {
    try {
      const businessInfo = await sql(
        'SELECT * FROM business_info WHERE user_id = $1',
        [userId]
      );

      if (businessInfo.length) {
        const info = businessInfo[0];
        content = content
          .replace(/{negocio_nombre}/g, info.business_name || '')
          .replace(/{direccion}/g, info.address || '')
          .replace(/{telefono}/g, info.phone || '')
          .replace(/{email}/g, info.email || '')
          .replace(/{website}/g, info.website || '')
          .replace(/{horarios}/g, info.opening_hours ? JSON.stringify(info.opening_hours) : '')
          .replace(/{menu_link}/g, info.menu_link || '');
      }

      return content;
    } catch (error) {
      console.error('Error reemplazando variables:', error);
      return content;
    }
  }

  static async saveIncomingMessage(userId: number, from: string, content: string): Promise<void> {
    try {
      const conversation = await this.getOrCreateConversation(userId, from);
      
      await sql(
        'INSERT INTO whatsapp_messages (conversation_id, user_id, message_type, message_text, is_from_bot) VALUES ($1, $2, $3, $4, $5)',
        [conversation.id, userId, 'incoming', content, false]
      );

      await sql(
        'UPDATE whatsapp_conversations SET last_message = $1, last_message_timestamp = CURRENT_TIMESTAMP WHERE id = $2',
        [content, conversation.id]
      );
    } catch (error) {
      console.error('Error guardando mensaje entrante:', error);
    }
  }

  static async saveOutgoingMessage(userId: number, to: string, content: string): Promise<void> {
    try {
      const conversation = await this.getOrCreateConversation(userId, to);
      
      await sql(
        'INSERT INTO whatsapp_messages (conversation_id, user_id, message_type, message_text, is_from_bot) VALUES ($1, $2, $3, $4, $5)',
        [conversation.id, userId, 'outgoing', content, true]
      );
    } catch (error) {
      console.error('Error guardando mensaje saliente:', error);
    }
  }

  static async getOrCreateConversation(userId: number, contactNumber: string): Promise<any> {
    try {
      let conversation = await sql(
        'SELECT * FROM whatsapp_conversations WHERE user_id = $1 AND customer_phone = $2',
        [userId, contactNumber]
      );

      if (conversation.length === 0) {
        const result = await sql(
          'INSERT INTO whatsapp_conversations (user_id, customer_phone, last_message, last_message_timestamp) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id',
          [userId, contactNumber, '']
        );
        conversation = result;
      }

      return conversation[0];
    } catch (error) {
      console.error('Error obteniendo/creando conversación:', error);
      throw error;
    }
  }

  static async updateBotStatus(userId: number, status: string, phoneNumber?: string): Promise<void> {
    try {
      await sql(
        'INSERT INTO whatsapp_connections (user_id, status, phone_number, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET status = $2, phone_number = $3, updated_at = CURRENT_TIMESTAMP',
        [userId, status, phoneNumber || null]
      );
      revalidatePath('/dashboard/chatbot');
      
    } catch (error) {
      console.error('Error actualizando estado del bot:', error);
    }
  }

  static async saveQRCode(userId: number, qrCode: string): Promise<void> {
    try {
      await sql(
        'INSERT INTO whatsapp_connections (user_id, qr_code, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET qr_code = $2, updated_at = CURRENT_TIMESTAMP',
        [userId, qrCode]
      );
      
      revalidatePath('/dashboard/chatbot');
      
    } catch (error) {
      console.error('Error guardando QR code:', error);
    }
  }

  static async clearQRCode(userId: number): Promise<void> {
    try {
      await sql(
        'UPDATE whatsapp_connections SET qr_code = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
      
      revalidatePath('/dashboard/chatbot');
      
    } catch (error) {
      console.error('Error limpiando QR code:', error);
    }
  }

  static async sendMessage(userId: number, to: string, message: string): Promise<void> {
    try {
      const instance = this.instances.get(userId);
      if (instance?.sock) {
        await instance.sock.sendMessage(to, { text: message });
        
      } else {
        console.error(`[${userId}] No se encontró la instancia de socket para el usuario ${userId}. No se pudo enviar el mensaje.`);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  }

  static async stopBot(userId: number): Promise<void> {
    try {
      const instance = this.instances.get(userId);
      if (instance?.sock) {
        await instance.sock.logout();
        this.instances.delete(userId);
        await this.updateBotStatus(userId, 'disconnected');
        await this.clearQRCode(userId);
      }
    } catch (error) {
      console.error('Error deteniendo bot:', error);
    }
  }

  static getBotInstance(userId: number): BotInstance | undefined {
    return this.instances.get(userId);
  }

  static getAllInstances(): BotInstance[] {
    return Array.from(this.instances.values());
  }
}