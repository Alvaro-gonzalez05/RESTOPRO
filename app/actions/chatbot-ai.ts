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

// Memoria en RAM para el historial de conversaciones (no persistente)
const conversationHistory: { [phone: string]: { messages: { role: 'user' | 'model'; text: string }[], timestamp: number } } = {};

// Buffer para mensajes entrantes (para agrupar mensajes rápidos)
const messageBuffer: { [phone: string]: { messages: string[], timer: NodeJS.Timeout } } = {};

// Procesar mensaje del cliente con IA
export async function processIncomingMessage(userId: number, fromPhone: string, messageBody: string) {
  const cleanPhone = fromPhone.replace(/whatsapp:|test-chat-widget/g, '');

  // Limpiar historial antiguo
  Object.keys(conversationHistory).forEach(phone => {
    if (Date.now() - conversationHistory[phone].timestamp > 15 * 60 * 1000) { // 15 minutos
      delete conversationHistory[phone];
    }
  });

  // Agrupar mensajes que llegan muy rápido
  if (messageBuffer[cleanPhone]) {
    clearTimeout(messageBuffer[cleanPhone].timer);
    messageBuffer[cleanPhone].messages.push(messageBody);
  } else {
    messageBuffer[cleanPhone] = {
      messages: [messageBody],
      timer: null as any
    };
  }

  return new Promise((resolve) => {
    messageBuffer[cleanPhone].timer = setTimeout(async () => {
      const fullMessage = messageBuffer[cleanPhone].messages.join(' \n ');
      delete messageBuffer[cleanPhone];

      try {
        console.log('Processing message:', { userId, fromPhone, fullMessage });

        // Obtener historial o inicializarlo
        if (!conversationHistory[cleanPhone]) {
          conversationHistory[cleanPhone] = { messages: [], timestamp: Date.now() };
        }
        conversationHistory[cleanPhone].messages.push({ role: 'user', text: fullMessage });
        conversationHistory[cleanPhone].timestamp = Date.now();

        const customer = await getCustomerByPhone(fromPhone);
        const [businessInfo, botConfig] = await Promise.all([
          getBusinessInfo(userId),
          getUserBotConfig(userId)
        ]);

        console.log('DEBUG: Retrieved botConfig in processIncomingMessage:', JSON.stringify(botConfig, null, 2));

        const aiResult = await generateAIResponse(
          fullMessage, 
          customer, 
          businessInfo,
          botConfig,
          conversationHistory[cleanPhone].messages
        );

        if (aiResult) {
          const { response, hasOptions, options } = aiResult;
          
          // Añadir respuesta del bot al historial
          conversationHistory[cleanPhone].messages.push({ role: 'model', text: response });

          if (fromPhone !== 'test-chat-widget') {
            if (hasOptions && options && options.length > 0) {
              await sendInteractiveMessage(userId, fromPhone.replace('whatsapp:', ''), response, options);
            } else {
              await sendMessage(userId, fromPhone.replace('whatsapp:', ''), response);
            }
          }
          
          await logChatbotInteraction(userId, fromPhone, fullMessage, response);
          
          resolve({ success: true, response: response });
        } else {
          resolve({ success: false, error: 'No response generated' });
        }
      } catch (error) {
        console.error('Error processing incoming message:', error);
        resolve({ success: false, error: String(error) });
      }
    }, 3000); // Esperar 3 segundos antes de procesar
  });
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

async function getUserBotConfig(userId: number) {
  try {
    const result = await sql(`
      SELECT bot_name, ai_role, ai_instructions, openai_api_key
      FROM user_bots 
      WHERE user_id = $1
    `, [userId]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting user bot config:', error);
    return null;
  }
}

function formatBusinessHours(businessInfo: any): string {
  if (!businessInfo?.business_hours) {
    return 'Consulta nuestros horarios';
  }

  try {
    const hours = typeof businessInfo.business_hours === 'string'
      ? JSON.parse(businessInfo.business_hours)
      : businessInfo.business_hours;

    const daysTranslation: { [key: string]: string } = {
      'lunes': 'Lunes',
      'martes': 'Martes',
      'miércoles': 'Miércoles',
      'jueves': 'Jueves',
      'viernes': 'Viernes',
      'sábado': 'Sábado',
      'domingo': 'Domingo'
    };

    const dayOrder = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

    const hoursText = dayOrder
      .filter(day => hours[day])
      .map(day => {
        const time = hours[day];
        const dayName = daysTranslation[day] || day;
        
        if (time.closed) {
          return `🔴 ${dayName}: Cerrado`;
        } else if (time.from && time.to) {
          return `🟢 ${dayName}: ${time.from} - ${time.to}`;
        }
        return `${dayName}: Horario no especificado`;
      }).join('\n');

    return hoursText || 'No tenemos un horario definido.';
  } catch (error) {
    console.error('Error parsing business hours:', error);
    return 'No pudimos cargar los horarios. Por favor, contacta para más información.';
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
    
    response = response.replace(/{horarios}/g, formatBusinessHours(businessInfo));
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
function analyzeMessageIntent(messageText: string): string[] {
  const text = messageText.toLowerCase().trim();
  const foundIntents = new Set<string>();

  const intentMap: { [key: string]: string[] } = {
    'saludo': ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'hey', 'ola'],
    'horarios': ['horario', 'hora', 'abierto', 'cerrado', 'abren', 'cierran'],
    'productos': ['menu', 'carta', 'productos', 'comida', 'platos', 'opciones'],
    'ubicacion': ['direccion', 'ubicacion', 'donde', 'localización'],
    'contacto': ['telefono', 'contacto', 'llamar', 'numero', 'whatsapp'],
    'promociones': ['promocion', 'oferta', 'descuento', 'promo'],
    'puntos': ['puntos', 'recompensas', 'saldo'],
    'despedida': ['gracias', 'bye', 'chau', 'adiós'],
    'info': ['info', 'informacion', 'acerca de', 'quienes son', 'description', 'servicios', 'especialidades']
  };

  for (const [intent, keywords] of Object.entries(intentMap)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      foundIntents.add(intent);
    }
  }

  return Array.from(foundIntents);
}

import { GoogleGenerativeAI } from '@google/generative-ai';

async function generateAIResponse(message: string, customer: CustomerData | null, businessInfo: any, botConfig: any, history: { role: 'user' | 'model'; text: string }[]) {
  if (!botConfig?.openai_api_key) {
    return formatResponse('La clave de API para la IA no está configurada.');
  }

  const genAI = new GoogleGenerativeAI(botConfig.openai_api_key);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

  const isFirstInteraction = history.length <= 1;

  // --- Construcción del Prompt para la IA ---
  let prompt = `**Rol y Tarea Principal:**\n`;
  prompt += `Eres ${botConfig.bot_name || 'un asistente virtual'} para el restaurante llamado ${businessInfo.business_name}. Tu rol es ser ${botConfig.ai_role || 'amigable y eficiente'}.\n`;
  prompt += `Tu tarea es responder a las preguntas del cliente de forma concisa, usando la información de contexto que te proporciono. Añade emojis para que tus respuestas sean más amigables.\n\n`;

  prompt += `**Reglas Estrictas:**\n`;
  prompt += `1.  Si la conversación ya ha comenzado (no es la primera interacción), NO saludes de nuevo. Ve directo a la respuesta.\n`;
  prompt += `2.  Responde ÚNICAMENTE a lo que el cliente pregunta. No añadas información que no te hayan solicitado (como la dirección, si solo preguntan por el horario).\n`;
  prompt += `3.  Si no tienes la información para algo específico (ej. el horario de un día), simplemente di que no está disponible. NO inventes respuestas ni sugieras llamar por teléfono.\n\n`;

  prompt += `**Contexto del Negocio (${businessInfo.business_name}):**\n`;
  if (businessInfo.description) prompt += `- Descripción: ${businessInfo.description}\n`;
  if (businessInfo.address) prompt += `- Dirección: ${businessInfo.address}\n`;
  if (businessInfo.phone) prompt += `- Teléfono: ${businessInfo.phone}\n`;
  // Filtro de seguridad para no exponer URLs locales
  if (businessInfo.website && !businessInfo.website.includes('localhost')) {
    prompt += `- Sitio Web: ${businessInfo.website}\n`;
  }
  if (businessInfo.menu_link) prompt += `- Link del Menú: ${businessInfo.menu_link}\n`;
  prompt += `- Horarios: ${formatBusinessHours(businessInfo)}\n`;
  if (businessInfo.services) prompt += `- Servicios: ${businessInfo.services.join(', ')}\n`;
  if (businessInfo.specialties) prompt += `- Especialidades: ${businessInfo.specialties.join(', ')}\n`;
  prompt += `\n`;

  if (customer) {
    prompt += `**Contexto del Cliente:**\n- Nombre: ${customer.name}\n- Puntos Acumulados: ${customer.points}\n\n`;
  }

  // --- Historial de Conversación ---
  const chatHistory = history.slice(0, -1).map(h => `${h.role === 'user' ? 'Cliente' : 'Tú'}: ${h.text}`).join('\n');
  prompt += `**Conversación hasta ahora:**\n${chatHistory}\n\n`;

  // --- Tarea Actual ---
  prompt += `**Pregunta del cliente:**\n"${message}"\n\n`;
  prompt += `**Tu respuesta (concisa y amigable):**`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return formatResponse(text);
  } catch (error) {
    console.error('Error generating AI response:', error);
    return formatResponse('Lo siento, no pude procesar tu solicitud en este momento.');
  }
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
