// app/actions/chatbot-ai.ts
'use server'

import { sql } from '@/lib/db'
import { sendMessage, sendInteractiveMessage } from './twilio'

interface CustomerData {
  id: number
  name: string
  phone: string
  email: string
  points: number
  last_purchase?: string
  total_spent: number
  orders_count: number
}

// Obtener datos del cliente por teléfono
export async function getCustomerByPhone(phone: string): Promise<CustomerData | null> {
  try {
    // Limpiar el número de teléfono (quitar whatsapp:, espacios, etc.)
    const cleanPhone = phone.replace(/whatsapp:|[\s\-\(\)]/g, '')
    
    const result = await sql(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        c.points,
        COALESCE(SUM(o.total), 0) as total_spent,
        COUNT(o.id) as orders_count,
        MAX(o.created_at) as last_purchase
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE c.phone LIKE $1 OR c.phone LIKE $2
      GROUP BY c.id, c.name, c.phone, c.email, c.points
    `, [`%${cleanPhone}%`, `%${cleanPhone.slice(-10)}%`])
    
    return result.length > 0 ? result[0] as CustomerData : null
  } catch (error) {
    console.error('Error getting customer by phone:', error)
    return null
  }
}

// Procesar mensaje del cliente con IA
export async function processIncomingMessage(userId: number, fromPhone: string, messageBody: string) {
  try {
    console.log('Processing message:', { userId, fromPhone, messageBody })
    
    // Obtener datos del cliente
    const customer = await getCustomerByPhone(fromPhone)
    console.log('Customer data:', customer)
    
    // Obtener configuración del chatbot
    const [messages, businessInfo] = await Promise.all([
      getActiveChatbotMessages(userId),
      getBusinessInfo(userId)
    ])
    
    console.log('Chatbot config loaded:', { 
      messagesCount: messages.length, 
      hasBusinessInfo: !!businessInfo 
    })
    
    // Analizar el mensaje y generar respuesta
    const aiResult = await generateAIResponse(messageBody, customer, messages, businessInfo)
    
    if (aiResult) {
      const { response, hasOptions, options } = aiResult
      
      // Enviar respuesta automática (con o sin botones)
      if (hasOptions && options && options.length > 0) {
        await sendInteractiveMessage(userId, fromPhone.replace('whatsapp:', ''), response, options)
      } else {
        await sendMessage(userId, fromPhone.replace('whatsapp:', ''), response)
      }
      
      // Registrar la interacción
      await logChatbotInteraction(userId, fromPhone, messageBody, response)
      
      return { success: true, response: response }
    }
    
    return { success: false, error: 'No response generated' }
  } catch (error) {
    console.error('Error processing incoming message:', error)
    return { success: false, error: String(error) }
  }
}

// Obtener mensajes activos del chatbot
async function getActiveChatbotMessages(userId: number) {
  try {
    const result = await sql(`
      SELECT * FROM chatbot_messages 
      WHERE user_id = $1 AND is_active = true
      ORDER BY category
    `, [userId])
    console.log('Active chatbot messages:', result)
    return result
  } catch (error) {
    console.error('Error getting active chatbot messages:', error)
    return []
  }
}

// Obtener información del negocio
async function getBusinessInfo(userId: number) {
  try {
    const result = await sql(`
      SELECT * FROM business_info 
      WHERE user_id = $1
    `, [userId])
    return result.length > 0 ? result[0] : null
  } catch (error) {
    console.error('Error getting business info:', error)
    return null
  }
}

// Reemplazar variables en un mensaje
function replaceMessageVariables(message: string, customer: CustomerData | null, businessInfo: any): string {
  let response = message
  
  // Variables del cliente
  if (customer) {
    response = response.replace(/{nombre}/g, customer.name)
    response = response.replace(/{puntos}/g, customer.points.toString())
  } else {
    response = response.replace(/{nombre}/g, 'Cliente')
    response = response.replace(/{puntos}/g, '0')
  }
  
  // Variables del negocio
  if (businessInfo) {
    response = response.replace(/{negocio_nombre}/g, businessInfo.business_name || 'Nuestro Negocio')
    response = response.replace(/{menu_link}/g, businessInfo.menu_link || '')
    response = response.replace(/{direccion}/g, businessInfo.address || '')
    response = response.replace(/{telefono}/g, businessInfo.phone || '')
    response = response.replace(/{email}/g, businessInfo.email || '')
    response = response.replace(/{website}/g, businessInfo.website || '')
    
    // Formatear horarios
    if (businessInfo.business_hours) {
      try {
        let hours
        if (typeof businessInfo.business_hours === 'string') {
          hours = JSON.parse(businessInfo.business_hours)
        } else {
          hours = businessInfo.business_hours
        }
        
        const daysTranslation: { [key: string]: string } = {
          'monday': 'Lunes',
          'tuesday': 'Martes', 
          'wednesday': 'Miércoles',
          'thursday': 'Jueves',
          'friday': 'Viernes',
          'saturday': 'Sábado',
          'sunday': 'Domingo'
        }
        
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        const hoursText = dayOrder
          .filter(day => hours[day])
          .map(day => {
            const time = hours[day]
            const dayName = daysTranslation[day] || day
            
            if (typeof time === 'object' && time !== null) {
              const timeObj = time as any
              if (timeObj.closed) {
                return `${dayName}: Cerrado`
              } else if (timeObj.open && timeObj.close) {
                return `${dayName}: ${timeObj.open} - ${timeObj.close}`
              }
            }
            return `${dayName}: ${time}`
          }).join('\n')
        
        response = response.replace(/{horarios}/g, hoursText)
      } catch (error) {
        response = response.replace(/{horarios}/g, 'Consulta nuestros horarios')
      }
    } else {
      response = response.replace(/{horarios}/g, 'Consulta nuestros horarios')
    }
  } else {
    // Valores por defecto si no hay businessInfo
    response = response.replace(/{negocio_nombre}/g, 'Nuestro Negocio')
    response = response.replace(/{menu_link}/g, '')
    response = response.replace(/{direccion}/g, '')
    response = response.replace(/{telefono}/g, '')
    response = response.replace(/{email}/g, '')
    response = response.replace(/{website}/g, '')
    response = response.replace(/{horarios}/g, 'Consulta nuestros horarios')
  }
  
  return response
}

// Helper para formatear respuestas
function formatResponse(response: string, hasOptions = false, options: any[] = []) {
  return {
    response,
    hasOptions,
    options
  }
}

// Análisis inteligente de intención del mensaje
function analyzeMessageIntent(messageText: string, messages: any[]): any | null {
  const text = messageText.toLowerCase().trim()
  
  // Mapeo de intenciones semánticas con mayor precisión
  const intentMap: { [key: string]: string[] } = {
    'saludo': [
      'hola', 'hello', 'hi', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches',
      'saludos', 'que tal', 'como estas', 'hey', 'ola'
    ],
    'productos': [
      'menu', 'carta', 'productos', 'comida', 'platos', 'opciones', 'que tienen',
      'que venden', 'comer', 'hambre', 'quiero comer', 'disponible', 'ofrecen',
      'opciones de comida', 'opciones de menu', 'que hay para comer', 'que puedo comer',
      'platillos', 'especialidades', 'que sirven'
    ],
    'horarios': [
      'horario', 'hora', 'abierto', 'cerrado', 'abren', 'cierran', 'atienden',
      'que hora', 'a que hora', 'cuando abren', 'cuando cierran', 'funcionan'
    ],
    'ubicacion': [
      'direccion', 'ubicacion', 'donde', 'ubicación', 'localización', 'dirección',
      'como llego', 'donde estan', 'donde se encuentran', 'localizado'
    ],
    'contacto': [
      'telefono', 'teléfono', 'contacto', 'llamar', 'comunicarse', 'numero',
      'whatsapp', 'contactar', 'hablar'
    ],
    'precios': [
      'precio', 'costo', 'vale', 'cuesta', 'cobran', 'tarifas', 'cuanto',
      'cuanto cuesta', 'cuanto vale', 'presupuesto'
    ],
    'puntos': [
      'puntos', 'punto', 'recompensas', 'loyalty', 'saldo', 'acumulados',
      'tengo', 'mis puntos', 'cuantos puntos'
    ],
    'promociones': [
      'promocion', 'promoción', 'oferta', 'descuento', 'especial', 'rebaja',
      'deal', 'promo', 'ofertas especiales'
    ],
    'despedida': [
      'gracias', 'bye', 'chau', 'adiós', 'adios', 'hasta luego', 'nos vemos',
      'muchas gracias', 'perfecto gracias', 'ok gracias'
    ]
  }
  
  // Buscar coincidencias por intención semántica con mayor prioridad para frases específicas
  console.log('Analyzing message intent for:', text)
  
  // PRIORIDAD 1: Buscar frases específicas de productos/comida primero
  if (text.includes('opciones de comida') || 
      text.includes('que tienen') || 
      text.includes('que hay para comer') ||
      text.includes('opciones de menu') ||
      text.includes('que puedo comer') ||
      (text.includes('opciones') && (text.includes('comida') || text.includes('menu'))) ||
      (text.includes('que') && text.includes('comida')) ||
      (text.includes('que') && text.includes('menu'))) {
    
    const productMessage = messages.find(m => m.category === 'productos')
    if (productMessage) {
      console.log('Priority match found for PRODUCTOS by specific phrase analysis')
      return productMessage
    }
  }
  
  // PRIORIDAD 2: Match exacto con palabras clave configuradas
  for (const msg of messages) {
    if (msg.trigger_keywords && Array.isArray(msg.trigger_keywords)) {
      const exactMatch = msg.trigger_keywords.some((keyword: string) => 
        text.includes(keyword.toLowerCase())
      )
      if (exactMatch) {
        console.log('Exact keyword match found:', msg.category, msg.trigger_keywords)
        return msg
      }
    }
  }
  
  // PRIORIDAD 3: Match semántico por categoría (excluyendo saludo si hay palabras de comida)
  for (const [intent, words] of Object.entries(intentMap)) {
    // Si el texto habla de comida, NO activar saludo
    if (intent === 'saludo' && 
        (text.includes('comida') || text.includes('menu') || text.includes('opciones'))) {
      continue
    }
    
    const semanticMatch = words.some(word => 
      text.includes(word) || 
      // También buscar palabras relacionadas
      text.split(' ').some(textWord => word.includes(textWord) && textWord.length > 2)
    )
    
    if (semanticMatch) {
      const categoryMessage = messages.find(m => m.category === intent)
      if (categoryMessage) {
        console.log('Semantic intent match found:', intent, 'triggered by analysis')
        return categoryMessage
      }
    }
  }
  
  return null
}

// Generar respuesta con IA
async function generateAIResponse(message: string, customer: CustomerData | null, messages: any[], businessInfo: any) {
  const messageText = message.toLowerCase().trim()
  
  console.log('Generating AI response for:', { messageText, messagesCount: messages.length, customer: customer ? 'found' : 'not found' })
  
  // PRIMERO: Análisis inteligente de intención
  const intentMatch = analyzeMessageIntent(messageText, messages)
  if (intentMatch) {
    console.log('Intent-based match found:', intentMatch.category)
    
    // Reemplazar todas las variables en el mensaje personalizado
    let response = replaceMessageVariables(intentMatch.message_text, customer, businessInfo)
    
    // Si el mensaje tiene opciones, preparar botones interactivos
    if (intentMatch.has_options && intentMatch.options && Array.isArray(intentMatch.options) && intentMatch.options.length > 0) {
      const options = intentMatch.options.map((option: any) => ({
        id: option.id,
        text: option.text
      }))
      
      console.log('Using intent-based message with interactive buttons:', response, options)
      return {
        response,
        hasOptions: true,
        options
      }
    }
    
    console.log('Using intent-based message with variables replaced:', response)
    return formatResponse(response, false, [])
  }

  // SEGUNDO: Verificar si es una respuesta a una opción (por ID o número)
  // Buscar opción por ID primero (botones reales)
  for (const msg of messages) {
    if (msg.has_options && msg.options && Array.isArray(msg.options)) {
      const selectedOption = msg.options.find((option: any) => option.id === messageText)
      if (selectedOption) {
        console.log('User selected option by ID:', selectedOption)
        const response = replaceMessageVariables(selectedOption.response_text, customer, businessInfo)
        return formatResponse(response, false, [])
      }
    }
  }
  
  // Verificar si es una respuesta numérica (fallback para sandbox)
  const numericChoice = parseInt(messageText.trim())
  if (!isNaN(numericChoice) && numericChoice > 0) {
    for (const msg of messages) {
      if (msg.has_options && msg.options && Array.isArray(msg.options)) {
        const selectedOption = msg.options[numericChoice - 1]
        if (selectedOption) {
          console.log('User selected option by number:', selectedOption)
          const response = replaceMessageVariables(selectedOption.response_text, customer, businessInfo)
          return formatResponse(response, false, [])
        }
      }
    }
  }
  
  console.log('No custom message or intent found, using default AI response...')
  
  // TERCERO: Si no hay mensaje personalizado, usar IA
  
  // 1. SALUDOS
  if (messageText.includes('hola') || messageText.includes('buenas') || messageText.includes('buenos dias') || messageText.includes('buenas tardes')) {
    const defaultGreeting = customer 
      ? `¡Hola ${customer.name}! 👋 Bienvenido/a de nuevo. Tienes ${customer.points} puntos acumulados. ¿En qué puedo ayudarte hoy?`
      : '¡Hola! 👋 Bienvenido/a a nuestro servicio. ¿En qué puedo ayudarte hoy?'
    
    console.log('Using default greeting:', defaultGreeting)
    return formatResponse(defaultGreeting, false, [])
  }
  
  // 2. CONSULTA DE PUNTOS
  if (messageText.includes('puntos') || messageText.includes('punto')) {
    if (customer) {
      return formatResponse(`Tienes ${customer.points} puntos acumulados 🎯\n\nCon tus puntos puedes canjear:\n- 100 puntos = 10% descuento\n- 200 puntos = 20% descuento\n- 500 puntos = Producto gratis\n\n¿Te gustaría canjear tus puntos?`)
    }
    return formatResponse('Para consultar tus puntos necesitamos que te registres. ¿Podrías compartir tu nombre y email?')
  }
  
  // 3. MENÚ Y PRODUCTOS
  if (messageText.includes('menu') || messageText.includes('carta') || messageText.includes('productos') || messageText.includes('comida') || messageText.includes('platos') || messageText.includes('opciones')) {
    // Primero verificar si hay un mensaje personalizado para menú
    const menuMsg = messages.find(m => m.category === 'menu')
    if (menuMsg) return formatResponse(menuMsg.message_text)
    
    // Si hay enlace del menú configurado, enviarlo
    if (businessInfo && businessInfo.menu_link) {
      return formatResponse(`🍽️ *Aquí tienes nuestro menú completo:*

${businessInfo.menu_link}

¡Echa un vistazo a todas nuestras deliciosas opciones! ¿Hay algo específico que te interese?`)
    }
    
    // Respuesta por defecto si no hay enlace configurado
    return formatResponse(`🍽️ *Nuestro menú incluye:*

🍔 Hamburguesas - $15
🍕 Pizzas - $20  
🥗 Ensaladas - $12
🍟 Papas fritas - $8
🥤 Bebidas - $5

¿Qué te gustaría ordenar?`)
  }
  
  // 4. HORARIOS
  if (messageText.includes('horario') || messageText.includes('hora') || messageText.includes('abierto') || messageText.includes('cerrado')) {
    if (businessInfo && businessInfo.business_hours) {
      try {
        let hours
        if (typeof businessInfo.business_hours === 'string') {
          hours = JSON.parse(businessInfo.business_hours)
        } else {
          hours = businessInfo.business_hours
        }
        
        // Traducir días al español
        const daysTranslation: { [key: string]: string } = {
          'monday': 'Lunes',
          'tuesday': 'Martes', 
          'wednesday': 'Miércoles',
          'thursday': 'Jueves',
          'friday': 'Viernes',
          'saturday': 'Sábado',
          'sunday': 'Domingo'
        }
        
        // Ordenar días de la semana
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        const hoursText = dayOrder
          .filter(day => hours[day]) // Solo incluir días que existen
          .map(day => {
            const time = hours[day]
            const dayName = daysTranslation[day] || day
            
            // Si time es un objeto, formatearlo correctamente
            if (typeof time === 'object' && time !== null) {
              const timeObj = time as any
              if (timeObj.closed) {
                return `🔴 ${dayName}: Cerrado`
              } else if (timeObj.open && timeObj.close) {
                return `🟢 ${dayName}: ${timeObj.open} - ${timeObj.close}`
              }
            }
            // Si time es string, usarlo directamente
            return `🟢 ${dayName}: ${time}`
          }).join('\n')
        
        return formatResponse(`📅 *HORARIOS DE ATENCIÓN:*

${hoursText}

¿En qué más puedo ayudarte?`)
      } catch (error) {
        console.error('Error parsing business hours:', error)
        return formatResponse('Estamos abiertos de Lunes a Domingo de 9:00 AM a 10:00 PM. ¿En qué más puedo ayudarte?')
      }
    }
    return formatResponse('Estamos abiertos de Lunes a Domingo de 9:00 AM a 10:00 PM. ¿En qué más puedo ayudarte?')
  }
  
  // 5. UBICACIÓN
  if (messageText.includes('direccion') || messageText.includes('ubicacion') || messageText.includes('donde') || messageText.includes('ubicación')) {
    if (businessInfo && businessInfo.address) {
      return formatResponse(`Nuestra dirección es: ${businessInfo.address}\n\n¿Necesitas indicaciones para llegar?`)
    }
    return formatResponse('Estamos ubicados en el centro de la ciudad. ¿Te gustaría que te envíe la ubicación exacta?')
  }
  
  // 6. DESPEDIDA
  if (messageText.includes('gracias') || messageText.includes('bye') || messageText.includes('chau') || messageText.includes('adiós')) {
    const farewellMsg = messages.find(m => m.category === 'farewell')
    if (farewellMsg) return formatResponse(farewellMsg.message_text)
    return formatResponse('¡Gracias por contactarnos! 😊 Que tengas un excelente día. ¡Esperamos verte pronto!')
  }
  
  // 7. RESPUESTA PREDETERMINADA
  const defaultMsg = messages.find(m => m.category === 'default')
  if (defaultMsg) return formatResponse(defaultMsg.message_text)
  
  return formatResponse('Gracias por tu mensaje. Un representante te contactará pronto. Mientras tanto, puedes escribir "menu" para ver nuestros productos o "puntos" para consultar tu saldo.')
}

// Registrar interacción del chatbot
async function logChatbotInteraction(userId: number, fromPhone: string, incomingMessage: string, response: string) {
  try {
    await sql(`
      INSERT INTO chatbot_interactions (user_id, customer_phone, incoming_message, bot_response, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [userId, fromPhone, incomingMessage, response])
  } catch (error) {
    console.error('Error logging chatbot interaction:', error)
  }
}

// Enviar mensaje promocional automático
export async function sendPromotionalMessage(userId: number, customerPhone: string, promotionType: string) {
  try {
    const customer = await getCustomerByPhone(customerPhone)
    
    let message = ''
    switch (promotionType) {
      case 'inactive_customer':
        message = customer 
          ? `¡Hola ${customer.name}! 😊 Te extrañamos. Tienes ${customer.points} puntos esperándote. ¡Ven y disfruta un 15% de descuento en tu próxima compra! 🎉`
          : '¡Te extrañamos! Ven y disfruta un 15% de descuento en tu próxima compra. 🎉'
        break
      case 'points_reminder':
        message = customer
          ? `¡Hola ${customer.name}! 🎯 Tienes ${customer.points} puntos acumulados. ¿Sabías que puedes canjearlos por descuentos y productos gratis? ¡Ven a usar tus puntos!`
          : '¡Hola! Visítanos y acumula puntos en cada compra. ¡Cada punto cuenta! 🎯'
        break
      case 'thank_you':
        message = customer
          ? `¡Gracias por tu compra, ${customer.name}! 🙏 Esperamos que hayas disfrutado tu experiencia. Tienes ${customer.points} puntos acumulados. ¡Hasta la próxima! ⭐`
          : '¡Gracias por tu compra! 🙏 Esperamos verte pronto de nuevo. ⭐'
        break
    }
    
    if (message) {
      await sendMessage(userId, customerPhone.replace('whatsapp:', ''), message)
      await logChatbotInteraction(userId, customerPhone, `[AUTO_${promotionType.toUpperCase()}]`, message)
    }
    
    return { success: true, message: 'Mensaje promocional enviado' }
  } catch (error) {
    console.error('Error sending promotional message:', error)
    return { success: false, error: String(error) }
  }
}
