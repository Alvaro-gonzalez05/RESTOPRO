// app/actions/chatbot-config.ts
'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// INTERFACES
export interface ChatbotMessage {
  id?: number
  user_id: number
  category: string
  trigger_keywords: string[]
  message_text: string
  has_options: boolean
  options: MessageOption[]
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface MessageOption {
  id: string
  text: string
  response_text: string
}

export interface BusinessInfo {
  id?: number
  user_id: number
  business_name: string
  description: string
  address: string
  phone: string
  email: string
  website: string
  menu_link: string
  business_hours: {
    [key: string]: {
      open: string
      close: string
      closed: boolean
    }
  }
  services: string[]
  specialties: string[]
  social_media: {
    facebook: string
    instagram: string
    twitter: string
    whatsapp: string
  }
  auto_responses: boolean
  created_at?: string
  updated_at?: string
}

export interface AutomationRule {
  id?: number
  user_id: number
  name: string
  trigger_type: string
  trigger_conditions: any
  action_type: string
  action_data: any
  is_active: boolean
  last_executed?: string
  created_at?: string
  updated_at?: string
}

// FUNCIONES PARA MENSAJES
export async function getChatbotMessages(userId: number): Promise<ChatbotMessage[]> {
  try {
    const result = await sql(`
      SELECT * FROM chatbot_messages 
      WHERE user_id = $1
      ORDER BY category, created_at DESC
    `, [userId])
    return result as ChatbotMessage[]
  } catch (error) {
    console.error('Error getting chatbot messages:', error)
    return []
  }
}

export async function saveChatbotMessage(message: ChatbotMessage) {
  try {
    if (message.id) {
      // Actualizar mensaje existente
      await sql(`
        UPDATE chatbot_messages 
        SET category = $1, 
            trigger_keywords = $2, 
            message_text = $3, 
            has_options = $4,
            options = $5,
            is_active = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 AND user_id = $8
      `, [
        message.category,
        message.trigger_keywords, // Enviar directamente el array
        message.message_text,
        message.has_options || false,
        JSON.stringify(message.options || []),
        message.is_active,
        message.id,
        message.user_id
      ])
    } else {
      // Crear nuevo mensaje
      await sql(`
        INSERT INTO chatbot_messages (user_id, category, trigger_keywords, message_text, has_options, options, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        message.user_id,
        message.category,
        message.trigger_keywords, // Enviar directamente el array
        message.message_text,
        message.has_options || false,
        JSON.stringify(message.options || []),
        message.is_active
      ])
    }
    
    revalidatePath('/dashboard/chatbot')
    return { success: true, message: 'Mensaje guardado correctamente' }
  } catch (error) {
    console.error('Error saving chatbot message:', error)
    return { success: false, message: 'Error al guardar el mensaje' }
  }
}

export async function deleteChatbotMessage(messageId: number, userId: number) {
  try {
    await sql(`
      DELETE FROM chatbot_messages 
      WHERE id = $1 AND user_id = $2
    `, [messageId, userId])
    
    revalidatePath('/dashboard/chatbot')
    return { success: true, message: 'Mensaje eliminado correctamente' }
  } catch (error) {
    console.error('Error deleting chatbot message:', error)
    return { success: false, message: 'Error al eliminar el mensaje' }
  }
}

// FUNCIONES PARA INFORMACIÓN DEL NEGOCIO
export async function getBusinessInfo(userId: number): Promise<BusinessInfo | null> {
  try {
    const result = await sql(`
      SELECT * FROM business_info 
      WHERE user_id = $1
    `, [userId])
    
    return result.length > 0 ? result[0] as BusinessInfo : null
  } catch (error) {
    console.error('Error getting business info:', error)
    return null
  }
}

export async function saveBusinessInfo(business: BusinessInfo) {
  try {
    if (business.id) {
      // Actualizar información existente
      await sql(`
        UPDATE business_info 
        SET business_name = $1,
            description = $2,
            address = $3,
            phone = $4,
            email = $5,
            website = $6,
            menu_link = $7,
            business_hours = $8,
            services = $9,
            specialties = $10,
            social_media = $11,
            auto_responses = $12,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $13 AND user_id = $14
      `, [
        business.business_name,
        business.description,
        business.address,
        business.phone,
        business.email,
        business.website,
        business.menu_link,
        JSON.stringify(business.business_hours),
        business.services,
        business.specialties,
        JSON.stringify(business.social_media),
        business.auto_responses,
        business.id,
        business.user_id
      ])
    } else {
      // Crear nueva información
      await sql(`
        INSERT INTO business_info (
          user_id, business_name, description, address, phone, email, website, menu_link,
          business_hours, services, specialties, social_media, auto_responses
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (user_id) DO UPDATE SET
          business_name = EXCLUDED.business_name,
          description = EXCLUDED.description,
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          website = EXCLUDED.website,
          menu_link = EXCLUDED.menu_link,
          business_hours = EXCLUDED.business_hours,
          services = EXCLUDED.services,
          specialties = EXCLUDED.specialties,
          social_media = EXCLUDED.social_media,
          auto_responses = EXCLUDED.auto_responses,
          updated_at = CURRENT_TIMESTAMP
      `, [
        business.user_id,
        business.business_name,
        business.description,
        business.address,
        business.phone,
        business.email,
        business.website,
        business.menu_link,
        JSON.stringify(business.business_hours),
        business.services,
        business.specialties,
        JSON.stringify(business.social_media),
        business.auto_responses
      ])
    }
    
    revalidatePath('/dashboard/chatbot')
    return { success: true, message: 'Información del negocio guardada correctamente' }
  } catch (error) {
    console.error('Error saving business info:', error)
    return { success: false, message: 'Error al guardar la información del negocio' }
  }
}

// FUNCIONES PARA AUTOMATIZACIONES
export async function getAutomationRules(userId: number): Promise<AutomationRule[]> {
  try {
    const result = await sql(`
      SELECT * FROM automation_rules 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId])
    return result as AutomationRule[]
  } catch (error) {
    console.error('Error getting automation rules:', error)
    return []
  }
}

export async function saveAutomationRule(rule: AutomationRule) {
  try {
    if (rule.id) {
      // Actualizar regla existente
      await sql(`
        UPDATE automation_rules 
        SET name = $1, 
            trigger_type = $2, 
            trigger_conditions = $3, 
            action_type = $4, 
            action_data = $5, 
            is_active = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 AND user_id = $8
      `, [
        rule.name,
        rule.trigger_type,
        JSON.stringify(rule.trigger_conditions),
        rule.action_type,
        JSON.stringify(rule.action_data),
        rule.is_active,
        rule.id,
        rule.user_id
      ])
    } else {
      // Crear nueva regla
      await sql(`
        INSERT INTO automation_rules (user_id, name, trigger_type, trigger_conditions, action_type, action_data, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        rule.user_id,
        rule.name,
        rule.trigger_type,
        JSON.stringify(rule.trigger_conditions),
        rule.action_type,
        JSON.stringify(rule.action_data),
        rule.is_active
      ])
    }
    
    revalidatePath('/dashboard/chatbot')
    return { success: true, message: 'Regla de automatización guardada correctamente' }
  } catch (error) {
    console.error('Error saving automation rule:', error)
    return { success: false, message: 'Error al guardar la regla de automatización' }
  }
}

export async function deleteAutomationRule(ruleId: number, userId: number) {
  try {
    await sql(`
      DELETE FROM automation_rules 
      WHERE id = $1 AND user_id = $2
    `, [ruleId, userId])
    
    revalidatePath('/dashboard/chatbot')
    return { success: true, message: 'Regla eliminada correctamente' }
  } catch (error) {
    console.error('Error deleting automation rule:', error)
    return { success: false, message: 'Error al eliminar la regla' }
  }
}

// FUNCIÓN PARA PROCESAR MENSAJES CON IA
export async function processMessageWithAI(userId: number, customerMessage: string, customerPhone: string) {
  try {
    // Obtener información del negocio
    const businessInfo = await getBusinessInfo(userId)
    
    // Obtener mensajes configurados
    const chatbotMessages = await getChatbotMessages(userId)
    
    // Buscar mensaje por palabra clave
    let response = null
    
    for (const message of chatbotMessages) {
      if (message.is_active && message.trigger_keywords.some(keyword => 
        customerMessage.toLowerCase().includes(keyword.toLowerCase())
      )) {
        response = message.message_text
        break
      }
    }
    
    // Si no hay respuesta automática, usar IA
    if (!response && businessInfo) {
      response = await generateAIResponse(customerMessage, businessInfo, chatbotMessages)
    }
    
    return response || "Gracias por tu mensaje. Un representante te atenderá pronto."
  } catch (error) {
    console.error('Error processing message with AI:', error)
    return "Gracias por tu mensaje. Un representante te atenderá pronto."
  }
}

async function generateAIResponse(message: string, businessInfo: BusinessInfo, chatbotMessages: ChatbotMessage[]) {
  // Aquí puedes integrar con OpenAI, Claude, o cualquier otro servicio de IA
  // Por ahora, implementamos lógica básica
  
  const lowerMessage = message.toLowerCase()
  
  // Horarios
  if (lowerMessage.includes('horario') || lowerMessage.includes('hora') || lowerMessage.includes('abierto')) {
    const hours = businessInfo.business_hours
    if (hours) {
      return `Nuestros horarios de atención son: ${JSON.stringify(hours)}`
    }
  }
  
  // Dirección
  if (lowerMessage.includes('direccion') || lowerMessage.includes('ubicacion') || lowerMessage.includes('donde')) {
    return `Nos encontramos en: ${businessInfo.address}`
  }
  
  // Contacto
  if (lowerMessage.includes('telefono') || lowerMessage.includes('contacto') || lowerMessage.includes('llamar')) {
    return `Puedes contactarnos al: ${businessInfo.phone}`
  }
  
  // Información general
  if (lowerMessage.includes('que hacen') || lowerMessage.includes('servicio') || lowerMessage.includes('producto')) {
    return `${businessInfo.business_name}: ${businessInfo.description}`
  }
  
  // Ofertas - usar información genérica
  if (lowerMessage.includes('oferta') || lowerMessage.includes('promocion') || lowerMessage.includes('descuento')) {
    return "¡Contáctanos para conocer nuestras ofertas especiales!"
  }
  
  return null
}
