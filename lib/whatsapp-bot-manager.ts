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
}

export class WhatsAppBotManager {
  private static instances: Map<number, BotInstance> = new Map();

  static async createBotInstance(userId: number, aiApiKey?: string): Promise<BotInstance> {
    const logger = pino({ level: 'info' }); // Cambiado a 'info' para más logs
    const { state, saveCreds } = await useMultiFileAuthState(path.join(process.cwd(), `auth-sessions/user-${userId}`));

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`using Baileys v${version.join('.')}`);

    const instance: BotInstance = {
      id: `bot-user-${userId}`,
      userId,
      status: 'connecting',
    };

    if (aiApiKey) {
      console.log(`Initializing Gemini AI with API Key: ${aiApiKey.substring(0, 5)}...`);
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
        console.log(`*** Baileys QR Event FIRED for user ${userId}: ${qrDataUrl.substring(0, 50)}... ***`); // Log explícito
        await this.saveQRCode(userId, qrDataUrl);
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);

        if (shouldReconnect) {
          await this.createBotInstance(userId, aiApiKey); // Reconnect
        } else {
          instance.status = 'disconnected';
          instance.qrCode = undefined;
          instance.phoneNumber = undefined;
          await this.updateBotStatus(userId, 'disconnected');
          await this.clearQRCode(userId);
          console.log('Connection closed. You are logged out.');
        }
      } else if (connection === 'open') {
        instance.status = 'connected';
        instance.qrCode = undefined;
        instance.phoneNumber = sock.user?.id?.split(':')[0];
        await this.updateBotStatus(userId, 'connected', instance.phoneNumber);
        await this.clearQRCode(userId);
        console.log(`WhatsApp conectado para usuario ${userId}: ${instance.phoneNumber}`);
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      console.log(`[Baileys Event] messages.upsert triggered. Type: ${m.type}, Messages:`, m.messages.length);
      const msg = m.messages[0];
      console.log(`[Baileys Event] msg.key.fromMe: ${msg.key.fromMe}, msg.key.remoteJid: ${msg.key.remoteJid}, msg.message:`, JSON.stringify(msg.message, null, 2));

      // Filtrar mensajes enviados por el propio bot o mensajes de estado/protocolo
      if (msg.key.fromMe) {
        console.log(`[Baileys Event] Filtering out message from self: ${msg.key.remoteJid}`);
        return;
      }

      const remoteJid = msg.key.remoteJid; // JID completo del remitente
      const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

      // Solo procesar mensajes de texto de usuarios externos
      if (remoteJid && messageText) {
        const phoneNumber = remoteJid.split('@')[0]; // Solo el número para la DB
        console.log(`Mensaje de ${remoteJid} (número: ${phoneNumber}) para usuario ${userId}: "${messageText}"`);
        await this.handleIncomingMessage(userId, remoteJid, messageText, instance.generativeAI); // Pasar JID completo
      } else {
        console.log(`[Baileys Event] Filtering out non-text or empty message from ${remoteJid}. Message content:`, JSON.stringify(msg.message, null, 2));
      }
    });

    return instance;
  }

  static async handleIncomingMessage(userId: number, fromJid: string, messageText: string, generativeAI?: GoogleGenerativeAI): Promise<void> {
    console.log(`[${userId}] Handling incoming message. fromJid received: ${fromJid}, Message: "${messageText}"`);
    try {
      const phoneNumber = fromJid.split('@')[0]; // Extraer número para DB
      await this.saveIncomingMessage(userId, phoneNumber, messageText);

      const response = await this.processMessage(userId, phoneNumber, messageText, generativeAI);
      if (response) {
        console.log(`[${userId}] Sending response to ${fromJid}: "${response}"`);
        await this.sendMessage(userId, fromJid, response); // Usar JID completo para enviar
        await this.saveOutgoingMessage(userId, phoneNumber, response);
      } else {
        console.log(`[${userId}] No response generated for message from ${fromJid}.`);
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  static async processMessage(userId: number, from: string, message: string, generativeAI?: GoogleGenerativeAI): Promise<string> {
    console.log(`[${userId}] Processing message: "${message}"`);
    try {
      const botConfig = await sql(
        'SELECT * FROM user_bots WHERE user_id = $1',
        [userId]
      );

      if (!botConfig.length) {
        console.log(`[${userId}] Bot configuration not found.`);
        return 'Lo siento, hay un problema con la configuración del bot.';
      }

      const config = botConfig[0];
      console.log(`[${userId}] Bot config: AI Enabled: ${config.ai_enabled}`);

      const predefinedResponse = await this.findPredefinedResponse(userId, message);
      if (predefinedResponse) {
        console.log(`[${userId}] Found predefined response.`);
        return predefinedResponse;
      }

      if (config.ai_enabled && generativeAI) {
        console.log(`[${userId}] No predefined response, attempting AI response.`);
        return await this.getAIResponse(message, config.ai_role, config.ai_instructions, generativeAI);
      }

      console.log(`[${userId}] No predefined response and AI not enabled or available. Returning default.`);
      return 'Gracias por tu mensaje. En breve te responderemos.';
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      return 'Lo siento, ocurrió un error procesando tu mensaje.';
    }
  }

  static async findPredefinedResponse(userId: number, message: string): Promise<string | null> {
    console.log(`[${userId}] Searching for predefined response for message: "${message}"`);
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

  static async getAIResponse(message: string, role: string, instructions: string, generativeAI: GoogleGenerativeAI): Promise<string> {
    console.log(`[AI] Calling Gemini AI. Role: "${role}", Instructions: "${instructions.substring(0, 50)}...", Message: "${message}"`);
    try {
      const model = generativeAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Aseguramos el modelo gemini-1.5-flash

      const prompt = `${role}\n\nInstrucciones: ${instructions}\n\nPregunta del usuario: ${message}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log(`[AI] Gemini AI response: "${text.substring(0, 50)}..."`);

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
      console.log(`DB: Updating status for user ${userId} to ${status}.`);
      await sql(
        'INSERT INTO whatsapp_connections (user_id, status, phone_number, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET status = $2, phone_number = $3, updated_at = CURRENT_TIMESTAMP',
        [userId, status, phoneNumber || null]
      );
      revalidatePath('/dashboard/chatbot');
      console.log(`DB: Status updated and path revalidated for user ${userId}.`);
    } catch (error) {
      console.error('Error actualizando estado del bot:', error);
    }
  }

  static async saveQRCode(userId: number, qrCode: string): Promise<void> {
    try {
      console.log(`DB: Attempting to save QR code for user ${userId}: ${qrCode.substring(0, 50)}...`);
      await sql(
        'INSERT INTO whatsapp_connections (user_id, qr_code, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET qr_code = $2, updated_at = CURRENT_TIMESTAMP',
        [userId, qrCode]
      );
      console.log(`DB: QR code saved successfully for user ${userId}. Revalidating path...`);
      revalidatePath('/dashboard/chatbot');
      console.log(`DB: Path revalidated after saving QR for user ${userId}.`);
    } catch (error) {
      console.error('Error guardando QR code:', error);
    }
  }

  static async clearQRCode(userId: number): Promise<void> {
    try {
      console.log(`DB: Attempting to clear QR code for user ${userId}.`);
      await sql(
        'UPDATE whatsapp_connections SET qr_code = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
      console.log(`DB: QR code cleared successfully for user ${userId}. Revalidating path...`);
      revalidatePath('/dashboard/chatbot');
      console.log(`DB: Path revalidated after clearing QR for user ${userId}.`);
    } catch (error) {
      console.error('Error limpiando QR code:', error);
    }
  }

  static async sendMessage(userId: number, to: string, message: string): Promise<void> {
    console.log(`[${userId}] Attempting to send message to ${to}: "${message.substring(0, 50)}..."`);
    try {
      const instance = this.instances.get(userId);
      if (instance?.sock) {
        await instance.sock.sendMessage(to, { text: message });
        console.log(`[${userId}] Message sent successfully to ${to}.`);
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