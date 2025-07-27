'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { WhatsAppBotManager } from '@/lib/whatsapp-bot-manager'
import fs from 'fs/promises'
import path from 'path'

// Acciones para WhatsApp Connection
export async function getWhatsAppConnection(userId: number) {
  try {
    const connection = await sql(`
      SELECT * FROM whatsapp_connections WHERE user_id = $1
    `, [userId])
    console.log("getWhatsAppConnection result for userId", userId, ":", connection[0]);
    return connection[0] || null
  } catch (error) {
    console.error('Error getting WhatsApp connection:', error)
    return null
  }
}

export async function clearWhatsAppSessionFiles(userId: number) {
  try {
    const sessionPath = path.join(process.cwd(), `auth-sessions/user-${userId}`);
    await fs.rm(sessionPath, { recursive: true, force: true });
    console.log(`Archivos de sesión de WhatsApp para usuario ${userId} eliminados.`);
    return { success: true };
  } catch (error) {
    console.error(`Error eliminando archivos de sesión para usuario ${userId}:`, error);
    return { success: false, error: 'Error al limpiar archivos de sesión.' };
  }
}

export async function disconnectWhatsApp(userId: number) {
  try {
    await WhatsAppBotManager.stopBot(userId)
    await clearWhatsAppSessionFiles(userId); // Limpiar archivos de sesión al desconectar
    revalidatePath('/dashboard/chatbot')
    return { success: true }
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error)
    return { success: false, error: 'Error al desconectar WhatsApp' }
  }
}

export async function connectWhatsApp(userId: number) {
  try {
    const userBotConfig = await sql(`
      SELECT openai_api_key FROM user_bots WHERE user_id = $1
    `, [userId])

    const openaiApiKey = userBotConfig.length > 0 ? userBotConfig[0].openai_api_key : undefined

    const instance = await WhatsAppBotManager.createBotInstance(userId, openaiApiKey)
    console.log("connectWhatsApp instance result (server action):", { status: instance.status, qrCode: instance.qrCode ? instance.qrCode.substring(0, 50) + '...' : null, userId: instance.userId, phoneNumber: instance.phoneNumber });
    
    revalidatePath('/dashboard/chatbot')
    return { success: true, data: { status: instance.status, qr_code: instance.qrCode, user_id: instance.userId, phone_number: instance.phoneNumber } }
  } catch (error: any) {
    console.error('Error connecting WhatsApp:', error)
    return { success: false, error: error.message || 'Error al conectar WhatsApp' }
  }
}

// Acciones para Chatbot Messages
export async function getChatbotMessages(userId: number) {
  try {
    const messages = await sql(`
      SELECT * FROM chatbot_messages 
      WHERE user_id = $1 
      ORDER BY category, created_at DESC
    `, [userId])
    
    return messages
  } catch (error) {
    console.error('Error getting chatbot messages:', error)
    return []
  }
}

export async function createChatbotMessage(data: {
  userId: number
  category: string
  triggerKeywords: string[]
  messageText: string
}) {
  try {
    const result = await sql(`
      INSERT INTO chatbot_messages (user_id, category, trigger_keywords, message_text, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `, [data.userId, data.category, data.triggerKeywords, data.messageText])
    
    return { success: true, message: result[0] }
  } catch (error) {
    console.error('Error creating chatbot message:', error)
    return { success: false, error: 'Error al crear mensaje' }
  }
}

export async function updateChatbotMessage(id: number, data: {
  category: string
  triggerKeywords: string[]
  messageText: string
  isActive: boolean
}) {
  try {
    const result = await sql(`
      UPDATE chatbot_messages 
      SET category = $1, trigger_keywords = $2, message_text = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [data.category, data.triggerKeywords, data.messageText, data.isActive, id])
    
    return { success: true, message: result[0] }
  } catch (error) {
    console.error('Error updating chatbot message:', error)
    return { success: false, error: 'Error al actualizar mensaje' }
  }
}

export async function deleteChatbotMessage(id: number) {
  try {
    await sql(`DELETE FROM chatbot_messages WHERE id = $1`, [id])
    return { success: true }
  } catch (error) {
    console.error('Error deleting chatbot message:', error)
    return { success: false, error: 'Error al eliminar mensaje' }
  }
}

// Acciones para Business Info
export async function getBusinessInfo(userId: number) {
  try {
    const info = await sql(`
      SELECT * FROM business_info WHERE user_id = $1
    `, [userId])
    
    return info[0] || null
  } catch (error) {
    console.error('Error getting business info:', error)
    return null
  }
}

export async function updateBusinessInfo(userId: number, data: {
  businessName?: string
  businessType?: string
  description?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  openingHours?: string
  deliveryInfo?: string
  menuLink?: string
  locationLink?: string
  socialMedia?: {
    twitter?: string
    facebook?: string
    whatsapp?: string
    instagram?: string
  }
  autoResponses?: boolean
}) {
  try {
    const result = await sql(`
      INSERT INTO business_info (
        user_id, business_name, business_type, description, address, phone, email, 
        website, business_hours, delivery_info,
        menu_link, location_link, social_media, auto_responses
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        business_name = COALESCE($2, business_info.business_name),
        business_type = COALESCE($3, business_info.business_type),
        description = COALESCE($4, business_info.description),
        address = COALESCE($5, business_info.address),
        phone = COALESCE($6, business_info.phone),
        email = COALESCE($7, business_info.email),
        website = COALESCE($8, business_info.website),
        business_hours = COALESCE($9, business_info.business_hours),
        delivery_info = COALESCE($10, business_info.delivery_info),
        menu_link = COALESCE($11, business_info.menu_link),
        location_link = COALESCE($12, business_info.location_link),
        social_media = COALESCE($13, business_info.social_media),
        auto_responses = COALESCE($14, business_info.auto_responses),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      userId, data.businessName, data.businessType, data.description, data.address,
      data.phone, data.email, data.website, data.openingHours ? JSON.stringify(data.openingHours) : null,
      data.deliveryInfo,
      data.menuLink, data.locationLink, data.socialMedia ? JSON.stringify(data.socialMedia) : null,
      data.autoResponses
    ])
    
    return { success: true, info: result[0] }
  } catch (error) {
    console.error('Error updating business info:', error)
    return { success: false, error: 'Error al actualizar información del negocio' }
  }
}

// Acciones para Promotions
export async function getPromotions(userId: number) {
  try {
    const promotions = await sql(`
      SELECT * FROM promotions 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId])
    
    return promotions
  } catch (error) {
    console.error('Error getting promotions:', error)
    return []
  }
}

export async function createPromotion(data: {
  userId: number
  title: string
  description: string
  discountType: string
  discountValue: number
  conditions?: string
  startDate?: Date
  endDate?: Date
  targetAudience: string
}) {
  try {
    const result = await sql(`
      INSERT INTO promotions (
        user_id, title, description, discount_type, discount_value, conditions,
        start_date, end_date, target_audience, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING *
    `, [
      data.userId, data.title, data.description, data.discountType, data.discountValue,
      data.conditions, data.startDate, data.endDate, data.targetAudience
    ])
    
    return { success: true, promotion: result[0] }
  } catch (error) {
    console.error('Error creating promotion:', error)
    return { success: false, error: 'Error al crear promoción' }
  }
}

export async function updatePromotion(id: number, data: any) {
  try {
    const result = await sql(`
      UPDATE promotions 
      SET title = $1, description = $2, discount_type = $3, discount_value = $4,
          conditions = $5, start_date = $6, end_date = $7, target_audience = $8,
          is_active = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      data.title, data.description, data.discountType, data.discountValue,
      data.conditions, data.startDate, data.endDate, data.targetAudience,
      data.isActive, id
    ])
    
    return { success: true, promotion: result[0] }
  } catch (error) {
    console.error('Error updating promotion:', error)
    return { success: false, error: 'Error al actualizar promoción' }
  }
}

export async function deletePromotion(id: number) {
  try {
    await sql(`DELETE FROM promotions WHERE id = $1`, [id])
    return { success: true }
  } catch (error) {
    console.error('Error deleting promotion:', error)
    return { success: false, error: 'Error al eliminar promoción' }
  }
}

// Acciones para Conversations
export async function getConversations(userId: number) {
  try {
    const conversations = await sql(`
      SELECT 
        c.*,
        COUNT(m.id) as message_count,
        MAX(m.timestamp) as last_activity
      FROM whatsapp_conversations c
      LEFT JOIN whatsapp_messages m ON c.id = m.conversation_id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `, [userId])
    
    return conversations
  } catch (error) {
    console.error('Error getting conversations:', error)
    return []
  }
}

export async function getConversationMessages(conversationId: number, userId: number) {
  try {
    const messages = await sql(`
      SELECT * FROM whatsapp_messages 
      WHERE conversation_id = $1 AND user_id = $2
      ORDER BY timestamp ASC
    `, [conversationId, userId])
    
    return messages
  } catch (error) {
    console.error('Error getting conversation messages:', error)
    return []
  }
}

export async function sendManualMessage(data: {
  userId: number
  customerPhone: string
  messageText: string
}) {
  try {
    // Buscar conversación
    let conversation = await sql(`
      SELECT * FROM whatsapp_conversations 
      WHERE user_id = $1 AND customer_phone = $2
    `, [data.userId, data.customerPhone])

    let conversationId
    if (conversation.length === 0) {
      // Crear nueva conversación
      const newConv = await sql(`
        INSERT INTO whatsapp_conversations (user_id, customer_phone, last_message, last_message_timestamp)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING id
      `, [data.userId, data.customerPhone, data.messageText])
      
      conversationId = newConv[0].id
    } else {
      conversationId = conversation[0].id
    }

    // Guardar mensaje
    await sql(`
      INSERT INTO whatsapp_messages (conversation_id, user_id, message_type, message_text, is_from_bot)
      VALUES ($1, $2, 'outgoing', $3, false)
    `, [conversationId, data.userId, data.messageText])

    // Actualizar conversación
    await sql(`
      UPDATE whatsapp_conversations 
      SET last_message = $1, last_message_timestamp = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [data.messageText, conversationId])

    return { success: true, conversationId }
  } catch (error) {
    console.error('Error sending manual message:', error)
    return { success: false, error: 'Error al enviar mensaje' }
  }
}

// Acciones para Automation Rules
export async function getAutomationRules(userId: number) {
  try {
    const rules = await sql(`
      SELECT * FROM automation_rules 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId])
    
    return rules
  } catch (error) {
    console.error('Error getting automation rules:', error)
    return []
  }
}

export async function createAutomationRule(data: {
  userId: number
  name: string
  triggerType: string
  triggerConditions: any
  actionType: string
  actionData: any
}) {
  try {
    const result = await sql(`
      INSERT INTO automation_rules (
        user_id, name, trigger_type, trigger_conditions, action_type, action_data, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [
      data.userId, data.name, data.triggerType, JSON.stringify(data.triggerConditions),
      data.actionType, JSON.stringify(data.actionData)
    ])
    
    return { success: true, rule: result[0] }
  } catch (error) {
    console.error('Error creating automation rule:', error)
    return { success: false, error: 'Error al crear regla de automatización' }
  }
}

export async function updateAutomationRule(id: number, data: any) {
  try {
    const result = await sql(`
      UPDATE automation_rules 
      SET name = $1, trigger_type = $2, trigger_conditions = $3, action_type = $4, action_data = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
      data.name, data.triggerType, JSON.stringify(data.triggerConditions), data.actionType, JSON.stringify(data.actionData), data.is_active, id
    ])
    
    return { success: true, rule: result[0] }
  } catch (error) {
    console.error('Error updating automation rule:', error)
    return { success: false, error: 'Error al actualizar regla de automatización' }
  }
}

export async function deleteAutomationRule(id: number) {
  try {
    await sql(`DELETE FROM automation_rules WHERE id = $1`, [id])
    return { success: true }
  } catch (error) {
    console.error('Error deleting automation rule:', error)
    return { success: false, error: 'Error al eliminar regla de automatización' }
  }
}

export async function saveUserBotConfig(userId: number, config: {
  botName?: string
  aiEnabled?: boolean
  aiRole?: string
  aiInstructions?: string
  openaiApiKey?: string
}) {
  console.log("saveUserBotConfig called with userId:", userId, "and config:", config);
  try {
    const result = await sql(`
      INSERT INTO user_bots (
        user_id, bot_name, ai_enabled, ai_role, ai_instructions, openai_api_key
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        bot_name = COALESCE($2, user_bots.bot_name),
        ai_enabled = COALESCE($3, user_bots.ai_enabled),
        ai_role = COALESCE($4, user_bots.ai_role),
        ai_instructions = COALESCE($5, user_bots.ai_instructions),
        openai_api_key = COALESCE($6, user_bots.openai_api_key),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      userId, config.botName, config.aiEnabled, config.aiRole, config.aiInstructions, config.openaiApiKey
    ])
    console.log("saveUserBotConfig SQL result:", result);
    return { success: true, config: result[0] }
  } catch (error) {
    console.error('Error saving user bot config:', error)
    return { success: false, error: 'Error al guardar configuración del bot' }
  }
}