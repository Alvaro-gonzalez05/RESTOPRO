'use server'

import { sql } from '@/lib/db'
import { sendMessage, sendInteractiveMessage } from './twilio'
import { EnhancedChatbotAI, ChatbotContext } from '@/lib/enhanced-chatbot-ai'
import { revalidatePath } from 'next/cache'

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

// Cache for chatbot instances per user
const chatbotInstances: Map<number, EnhancedChatbotAI> = new Map()

// Get or create chatbot instance for user
function getChatbotInstance(apiKey: string, userId: number): EnhancedChatbotAI {
  if (!chatbotInstances.has(userId)) {
    chatbotInstances.set(userId, new EnhancedChatbotAI(apiKey))
  }
  return chatbotInstances.get(userId)!
}

// Enhanced process incoming message with full restaurant context
export async function processIncomingMessageEnhanced(
  userId: number, 
  fromPhone: string, 
  messageBody: string
) {
  const cleanPhone = fromPhone.replace(/whatsapp:|test-chat-widget/g, '')

  try {
    console.log('Processing enhanced message:', { userId, fromPhone, messageBody })

    // Gather all context data in parallel
    const [customer, businessInfo, botConfig, products, categories] = await Promise.all([
      getCustomerByPhone(fromPhone, userId),
      getBusinessInfo(userId),
      getUserBotConfig(userId),
      getProducts(userId),
      getCategories(userId)
    ])

    console.log('Context gathered:', { 
      customerFound: !!customer, 
      businessInfo: !!businessInfo, 
      botConfig: !!botConfig,
      productsCount: products.length,
      categoriesCount: categories.length
    })

    if (!botConfig?.openai_api_key) {
      return { 
        success: false, 
        error: 'API key not configured',
        response: 'El chatbot no está configurado correctamente. Por favor contacta al administrador.' 
      }
    }

    // Build complete context
    const context: ChatbotContext = {
      customer: customer || undefined,
      businessInfo: businessInfo || undefined,
      products,
      categories,
      botConfig
    }

    // Get chatbot instance and process message
    const chatbot = getChatbotInstance(botConfig.openai_api_key, userId)
    const result = await chatbot.processMessage(userId, cleanPhone, messageBody, context)

    // Handle any actions returned by the chatbot
    if (result.actions) {
      await handleChatbotActions(result.actions, userId, fromPhone)
    }

    // Send response if not from test widget
    if (!fromPhone.startsWith('test-')) {
      await sendMessage(userId, fromPhone.replace('whatsapp:', ''), result.response)
    }

    // Log interaction
    await logChatbotInteraction(userId, fromPhone, messageBody, result.response)

    // Revalidate relevant paths if order or reservation was created
    if (result.actions?.some(action => ['create_order', 'create_reservation'].includes(action.type))) {
      revalidatePath('/dashboard/ordenes')
      revalidatePath('/dashboard/reservas')
    }

    return { 
      success: true, 
      response: result.response,
      actions: result.actions,
      conversationState: result.conversationState
    }

  } catch (error) {
    console.error('Error processing enhanced message:', error)
    return { 
      success: false, 
      error: String(error),
      response: 'Lo siento, hubo un problema procesando tu mensaje. ¿Puedes intentar de nuevo?' 
    }
  }
}

// Handle actions returned by chatbot (orders, reservations, etc.)
async function handleChatbotActions(actions: any[], userId: number, customerPhone: string) {
  for (const action of actions) {
    switch (action.type) {
      case 'create_order':
        console.log('Order created via chatbot:', action.data)
        // Additional order processing could go here (notifications, etc.)
        break
        
      case 'create_reservation':
        console.log('Reservation created via chatbot:', action.data)
        // Additional reservation processing could go here (confirmations, etc.)
        break
        
      case 'show_menu':
        // Could trigger menu display or special formatting
        break
        
      case 'check_availability':
        // Could trigger availability checks or calendar updates
        break
    }
  }
}

// Get customer data by phone
export async function getCustomerByPhone(phone: string, userId: number): Promise<CustomerData | null> {
  try {
    const cleanPhone = phone.replace(/whatsapp:|[\s\-\(\)]/g, '')
    
    const result = await sql(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        c.points,
        c.address,
        c.created_at as customer_since,
        COALESCE(SUM(o.total), 0) as total_spent,
        COUNT(o.id) as orders_count,
        MAX(o.created_at) as last_purchase,
        -- Get favorite products
        STRING_AGG(DISTINCT CASE 
          WHEN product_orders.order_count > 1 
          THEN product_orders.product_name 
        END, ', ') as favorite_products,
        -- Get customer status
        CASE 
          WHEN COUNT(o.id) = 0 THEN 'new'
          WHEN MAX(o.created_at) < CURRENT_DATE - INTERVAL '30 days' THEN 'inactive'
          WHEN COALESCE(SUM(o.total), 0) > 1000 OR COUNT(o.id) > 10 THEN 'vip'
          WHEN COUNT(o.id) <= 2 THEN 'new'
          ELSE 'regular'
        END as customer_status,
        -- Calculate days since last purchase
        CASE 
          WHEN MAX(o.created_at) IS NULL THEN NULL
          ELSE EXTRACT(DAYS FROM CURRENT_TIMESTAMP - MAX(o.created_at))
        END as days_since_last_purchase,
        -- Get available rewards they can redeem
        (
          SELECT COUNT(*) 
          FROM redeemable_products rp 
          WHERE rp.user_id = $1 AND rp.is_active = true AND rp.points_required <= c.points
        ) as available_rewards_count
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      LEFT JOIN (
        SELECT 
          o2.customer_id,
          oi.product_name,
          COUNT(*) as order_count
        FROM orders o2
        JOIN order_items oi ON o2.id = oi.order_id
        WHERE o2.user_id = $1
        GROUP BY o2.customer_id, oi.product_name
      ) product_orders ON c.id = product_orders.customer_id
      WHERE c.user_id = $1 AND (c.phone LIKE $2 OR c.phone LIKE $3)
      GROUP BY c.id, c.name, c.phone, c.email, c.points, c.address, c.created_at
    `, [userId, `%${cleanPhone}%`, `%${cleanPhone.slice(-10)}%`])
    
    return result.length > 0 ? result[0] as CustomerData : null
  } catch (error) {
    console.error('Error getting customer by phone:', error)
    return null
  }
}

// Get business information
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

// Get user bot configuration
async function getUserBotConfig(userId: number) {
  try {
    const result = await sql(`
      SELECT bot_name, ai_role, ai_instructions, openai_api_key
      FROM user_bots 
      WHERE user_id = $1
    `, [userId])
    return result.length > 0 ? result[0] : null
  } catch (error) {
    console.error('Error getting user bot config:', error)
    return null
  }
}

// Get products for menu with extended information
async function getProducts(userId: number) {
  try {
    const result = await sql(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category_id,
        p.is_available,
        p.image_url,
        c.name as category_name,
        -- Get order frequency for recommendations
        COALESCE(order_stats.order_count, 0) as popularity,
        COALESCE(order_stats.avg_rating, 0) as avg_rating
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT 
          oi.product_id,
          COUNT(*) as order_count,
          AVG(CASE WHEN o.notes LIKE '%rating:%' THEN 
            CAST(SUBSTRING(o.notes FROM 'rating:([0-9])') AS INTEGER) 
            ELSE 5 
          END) as avg_rating
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.user_id = $1
        GROUP BY oi.product_id
      ) order_stats ON p.id = order_stats.product_id
      WHERE p.user_id = $1 AND p.is_available = true
      ORDER BY c.name, order_stats.order_count DESC NULLS LAST, p.name
    `, [userId])
    return result
  } catch (error) {
    console.error('Error getting products:', error)
    return []
  }
}

// Get categories
async function getCategories(userId: number) {
  try {
    const result = await sql(`
      SELECT id, name
      FROM categories 
      WHERE user_id = $1
      ORDER BY name
    `, [userId])
    return result
  } catch (error) {
    console.error('Error getting categories:', error)
    return []
  }
}

// Log chatbot interaction
async function logChatbotInteraction(
  userId: number, 
  fromPhone: string, 
  incomingMessage: string, 
  response: string
) {
  try {
    await sql(`
      INSERT INTO chatbot_interactions (user_id, customer_phone, incoming_message, bot_response, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [userId, fromPhone, incomingMessage, response])
  } catch (error) {
    console.error('Error logging chatbot interaction:', error)
  }
}

// Create customer from chatbot interaction if doesn't exist
export async function createCustomerFromChatbot(
  userId: number,
  phone: string,
  name: string,
  email?: string
) {
  try {
    const result = await sql(`
      INSERT INTO customers (user_id, name, phone, email, points)
      VALUES ($1, $2, $3, $4, 0)
      ON CONFLICT (user_id, phone) DO NOTHING
      RETURNING id
    `, [userId, name, phone, email])
    
    return result.length > 0 ? result[0] : null
  } catch (error) {
    console.error('Error creating customer from chatbot:', error)
    return null
  }
}

// Get chatbot statistics
export async function getChatbotStats(userId: number, period: 'today' | 'week' | 'month' = 'today') {
  try {
    let dateFilter = ''
    
    switch (period) {
      case 'today':
        dateFilter = "DATE(created_at) = CURRENT_DATE"
        break
      case 'week':
        dateFilter = "created_at >= CURRENT_DATE - INTERVAL '7 days'"
        break
      case 'month':
        dateFilter = "created_at >= CURRENT_DATE - INTERVAL '30 days'"
        break
    }

    const [interactions, orders, reservations] = await Promise.all([
      sql(`
        SELECT 
          COUNT(*) as total_interactions,
          COUNT(DISTINCT customer_phone) as unique_customers
        FROM chatbot_interactions 
        WHERE user_id = $1 AND ${dateFilter}
      `, [userId]),
      
      sql(`
        SELECT COUNT(*) as chatbot_orders
        FROM orders 
        WHERE user_id = $1 AND notes LIKE '%chatbot%' AND ${dateFilter.replace('created_at', 'orders.created_at')}
      `, [userId]),
      
      sql(`
        SELECT COUNT(*) as chatbot_reservations
        FROM reservations 
        WHERE user_id = $1 AND created_via = 'chatbot' AND ${dateFilter.replace('created_at', 'reservations.created_at')}
      `, [userId])
    ])

    return {
      total_interactions: parseInt(interactions[0]?.total_interactions || '0'),
      unique_customers: parseInt(interactions[0]?.unique_customers || '0'),
      chatbot_orders: parseInt(orders[0]?.chatbot_orders || '0'),
      chatbot_reservations: parseInt(reservations[0]?.chatbot_reservations || '0')
    }
  } catch (error) {
    console.error('Error getting chatbot stats:', error)
    return {
      total_interactions: 0,
      unique_customers: 0,
      chatbot_orders: 0,
      chatbot_reservations: 0
    }
  }
}

// Send promotional message (enhanced version)
export async function sendPromotionalMessageEnhanced(
  userId: number, 
  customerPhone: string, 
  promotionType: string,
  customMessage?: string
) {
  try {
    const customer = await getCustomerByPhone(customerPhone, userId)
    const businessInfo = await getBusinessInfo(userId)
    
    let message = customMessage || ''
    
    if (!customMessage) {
      switch (promotionType) {
        case 'inactive_customer':
          message = customer 
            ? `¡Hola ${customer.name}! 😊 Te extrañamos en ${businessInfo?.business_name || 'nuestro restaurante'}. Tienes ${customer.points} puntos esperándote. ¡Ven y disfruta un 15% de descuento en tu próxima compra! 🎉`
            : `¡Te extrañamos! Ven a ${businessInfo?.business_name || 'nuestro restaurante'} y disfruta un 15% de descuento en tu próxima compra. 🎉`
          break
        case 'points_reminder':
          message = customer
            ? `¡Hola ${customer.name}! 🎯 Tienes ${customer.points} puntos acumulados en ${businessInfo?.business_name || 'nuestro restaurante'}. ¿Sabías que puedes canjearlos por descuentos y productos gratis? ¡Ven a usar tus puntos!`
            : `¡Hola! Visítanos en ${businessInfo?.business_name || 'nuestro restaurante'} y acumula puntos en cada compra. ¡Cada punto cuenta! 🎯`
          break
        case 'thank_you':
          message = customer
            ? `¡Gracias por tu compra, ${customer.name}! 🙏 Esperamos que hayas disfrutado tu experiencia en ${businessInfo?.business_name || 'nuestro restaurante'}. Tienes ${customer.points} puntos acumulados. ¡Hasta la próxima! ⭐`
            : `¡Gracias por tu compra! 🙏 Esperamos verte pronto de nuevo en ${businessInfo?.business_name || 'nuestro restaurante'}. ⭐`
          break
        case 'new_menu':
          message = `¡Tenemos novedades! 🎉 Descubre nuestro nuevo menú en ${businessInfo?.business_name || 'nuestro restaurante'}. ${businessInfo?.menu_link ? `Ver aquí: ${businessInfo.menu_link}` : 'Pregunta por nuestras nuevas opciones.'} ¡Te esperamos! 🍽️`
          break
      }
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

// Fallback to original system for compatibility
export async function processIncomingMessage(userId: number, fromPhone: string, messageBody: string) {
  // Try enhanced version first, fallback to original if needed
  try {
    return await processIncomingMessageEnhanced(userId, fromPhone, messageBody)
  } catch (error) {
    console.error('Enhanced chatbot failed, using fallback:', error)
    // Import and use original function if needed
    return { 
      success: false, 
      error: 'Chatbot temporarily unavailable',
      response: 'Lo siento, el chatbot no está disponible en este momento. Por favor intenta más tarde.' 
    }
  }
}