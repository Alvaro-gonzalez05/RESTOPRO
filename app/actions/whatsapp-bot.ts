'use server'

import { sql } from '@/lib/db'
import { WhatsAppBotManager } from '@/lib/whatsapp-bot-manager-real'
import { requireAuth } from '@/lib/auth'

export async function createUserBot(botConfig: {
  botName: string
  aiEnabled: boolean
  aiRole: string
  aiInstructions: string
  openaiApiKey?: string
}) {
  try {
    const user = await requireAuth()
    const userId = user.id

    // Verificar si ya existe un bot para este usuario
    const existingBot = await sql(
      'SELECT id FROM user_bots WHERE user_id = $1',
      [userId]
    )

    if (existingBot.length > 0) {
      return { success: false, message: 'Ya tienes un bot configurado' }
    }

    // Crear registro en la base de datos
    const result = await sql(
      `INSERT INTO user_bots (
        user_id, name, bot_name, ai_enabled, ai_role, ai_prompt, ai_instructions, 
        openai_api_key, default_response, is_active, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, 'disconnected', NOW(), NOW()) 
      RETURNING *`,
      [
        userId, 
        botConfig.botName, 
        botConfig.botName, 
        botConfig.aiEnabled, 
        botConfig.aiRole, 
        botConfig.aiInstructions,
        botConfig.aiInstructions,
        botConfig.openaiApiKey,
        'Gracias por tu mensaje. En breve te responderemos.'
      ]
    )

    return { success: true, data: result[0] }
  } catch (error) {
    console.error('Error creando bot de usuario:', error)
    return { success: false, message: 'Error al crear el bot' }
  }
}

export async function startUserBot() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/whatsapp/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Error al iniciar el bot')
    }

    return result
  } catch (error) {
    console.error('Error en startUserBot:', error)
    throw error
  }
}

export async function stopUserBot() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/whatsapp/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Error al detener el bot')
    }

    return result
  } catch (error) {
    console.error('Error en stopUserBot:', error)
    throw error
  }
}

export async function getUserBotStatus() {
  try {
    const user = await requireAuth()
    const userId = user.id

    const result = await sql(
      'SELECT id, bot_name, status, qr_code, ai_enabled, ai_role, ai_instructions, phone_number, created_at, updated_at FROM user_bots WHERE user_id = $1',
      [userId]
    )

    if (!result.length) {
      return { success: false, message: 'No tienes un bot configurado' }
    }

    return { success: true, data: result[0] }
  } catch (error) {
    console.error('Error obteniendo estado del bot:', error)
    return { success: false, message: 'Error al obtener el estado del bot' }
  }
}

export async function updateUserBotConfig(config: {
  botName: string
  aiEnabled: boolean
  aiRole: string
  aiInstructions: string
  openaiApiKey?: string
}) {
  try {
    const user = await requireAuth()
    const userId = user.id

    await sql(
      `UPDATE user_bots 
       SET bot_name = $1, ai_enabled = $2, ai_role = $3, ai_instructions = $4, openai_api_key = $5, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $6`,
      [config.botName, config.aiEnabled, config.aiRole, config.aiInstructions, config.openaiApiKey, userId]
    )

    return { success: true, message: 'Configuración actualizada correctamente' }
  } catch (error) {
    console.error('Error actualizando configuración:', error)
    return { success: false, message: 'Error al actualizar la configuración' }
  }
}

export async function getUserBotConversations() {
  try {
    const user = await requireAuth()
    const userId = user.id

    const conversations = await sql(
      `SELECT bc.*, COUNT(bm.id) as message_count
       FROM bot_conversations bc
       INNER JOIN user_bots ub ON bc.user_bot_id = ub.id
       LEFT JOIN bot_messages bm ON bc.id = bm.conversation_id
       WHERE ub.user_id = $1
       GROUP BY bc.id
       ORDER BY bc.last_message_at DESC`,
      [userId]
    )

    return { success: true, data: conversations }
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error)
    return { success: false, message: 'Error al obtener las conversaciones' }
  }
}

export async function getConversationMessages(conversationId: number) {
  try {
    const user = await requireAuth()
    const userId = user.id

    // Verificar que la conversación pertenece al usuario
    const conversation = await sql(
      `SELECT bc.id 
       FROM bot_conversations bc
       INNER JOIN user_bots ub ON bc.user_bot_id = ub.id
       WHERE bc.id = $1 AND ub.user_id = $2`,
      [conversationId, userId]
    )

    if (!conversation.length) {
      return { success: false, message: 'Conversación no encontrada' }
    }

    // Obtener mensajes
    const messages = await sql(
      'SELECT * FROM bot_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    )

    return { success: true, data: messages }
  } catch (error) {
    console.error('Error obteniendo mensajes:', error)
    return { success: false, message: 'Error al obtener los mensajes' }
  }
}

export async function getUserChatbotMessages() {
  try {
    const user = await requireAuth()
    const userId = user.id

    const messages = await sql(
      'SELECT * FROM chatbot_messages WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )

    return { success: true, data: messages }
  } catch (error) {
    console.error('Error obteniendo mensajes del chatbot:', error)
    return { success: false, message: 'Error al obtener los mensajes' }
  }
}
