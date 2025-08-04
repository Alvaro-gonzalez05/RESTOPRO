import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, ...data } = body

    switch (action) {
      case 'get_chatbot_interactions':
        return await getChatbotInteractions(user.id, data.limit, data.offset)
      case 'get_promotional_messages':
        return await getPromotionalMessages(user.id, data.limit, data.offset)
      case 'get_whatsapp_messages':
        return await getWhatsAppMessages(user.id, data.limit, data.offset)
      case 'get_message_stats':
        return await getMessageStats(user.id, data.period)
      case 'search_messages':
        return await searchMessages(user.id, data.query, data.type)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in messages API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getChatbotInteractions(userId: number, limit: number = 50, offset: number = 0) {
  try {
    const interactions = await sql(`
      SELECT 
        ci.*,
        c.name as customer_name,
        c.email as customer_email
      FROM chatbot_interactions ci
      LEFT JOIN customers c ON ci.customer_phone = c.phone AND c.user_id = $1
      WHERE ci.user_id = $1
      ORDER BY ci.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset])

    return NextResponse.json(interactions)
  } catch (error) {
    console.error('Error getting chatbot interactions:', error)
    return NextResponse.json({ error: 'Failed to get chatbot interactions' }, { status: 500 })
  }
}

async function getPromotionalMessages(userId: number, limit: number = 50, offset: number = 0) {
  try {
    // Get promotional messages from campaign recipients and automation executions
    const promotionalMessages = await sql(`
      SELECT 
        'campaign' as source,
        cr.id,
        cr.phone as customer_phone,
        pc.name as campaign_name,
        cr.message_content,
        cr.sent_at,
        cr.status,
        c.name as customer_name
      FROM campaign_recipients cr
      JOIN promotional_campaigns pc ON cr.campaign_id = pc.id
      LEFT JOIN customers c ON cr.phone = c.phone AND c.user_id = $1
      WHERE pc.user_id = $1
      
      UNION ALL
      
      SELECT 
        'automation' as source,
        ae.id,
        ae.customer_phone,
        ar.name as campaign_name,
        ae.message_sent as message_content,
        ae.executed_at as sent_at,
        CASE 
          WHEN ae.error_message IS NULL THEN 'delivered'
          ELSE 'failed'
        END as status,
        c.name as customer_name
      FROM automation_executions ae
      JOIN automation_rules ar ON ae.automation_rule_id = ar.id
      LEFT JOIN customers c ON ae.customer_phone = c.phone AND c.user_id = $1
      WHERE ar.user_id = $1 AND ae.message_sent IS NOT NULL
      
      ORDER BY sent_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset])

    return NextResponse.json(promotionalMessages)
  } catch (error) {
    console.error('Error getting promotional messages:', error)
    return NextResponse.json({ error: 'Failed to get promotional messages' }, { status: 500 })
  }
}

async function getWhatsAppMessages(userId: number, limit: number = 50, offset: number = 0) {
  try {
    const whatsappMessages = await sql(`
      SELECT 
        wm.*,
        c.name as customer_name
      FROM whatsapp_messages wm
      LEFT JOIN customers c ON wm.from_phone = c.phone AND c.user_id = $1
      WHERE wm.user_id = $1
      ORDER BY wm.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset])

    return NextResponse.json(whatsappMessages)
  } catch (error) {
    console.error('Error getting WhatsApp messages:', error)
    return NextResponse.json({ error: 'Failed to get WhatsApp messages' }, { status: 500 })
  }
}

async function getMessageStats(userId: number, period: 'today' | 'week' | 'month' = 'month') {
  try {
    let dateFilter = ''
    
    switch (period) {
      case 'today':
        dateFilter = "AND DATE(created_at) = CURRENT_DATE"
        break
      case 'week':
        dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'"
        break
      case 'month':
        dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'"
        break
    }

    // Get chatbot interactions stats
    const chatbotStats = await sql(`
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(DISTINCT customer_phone) as unique_customers_chatbot
      FROM chatbot_interactions 
      WHERE user_id = $1 ${dateFilter}
    `, [userId])

    // Get promotional messages stats
    const promotionalStats = await sql(`
      SELECT COUNT(*) as total_promotional
      FROM (
        SELECT cr.sent_at as created_at
        FROM campaign_recipients cr
        JOIN promotional_campaigns pc ON cr.campaign_id = pc.id
        WHERE pc.user_id = $1 ${dateFilter.replace('created_at', 'cr.sent_at')}
        
        UNION ALL
        
        SELECT ae.executed_at as created_at
        FROM automation_executions ae
        JOIN automation_rules ar ON ae.automation_rule_id = ar.id
        WHERE ar.user_id = $1 AND ae.message_sent IS NOT NULL ${dateFilter.replace('created_at', 'ae.executed_at')}
      ) promotional_messages
    `, [userId])

    // Get WhatsApp messages stats
    const whatsappStats = await sql(`
      SELECT COUNT(*) as total_whatsapp
      FROM whatsapp_messages 
      WHERE user_id = $1 ${dateFilter}
    `, [userId])

    // Get unique customers across all message types
    const uniqueCustomers = await sql(`
      SELECT COUNT(DISTINCT phone) as unique_customers
      FROM (
        SELECT customer_phone as phone FROM chatbot_interactions WHERE user_id = $1 ${dateFilter}
        UNION
        SELECT cr.phone FROM campaign_recipients cr 
        JOIN promotional_campaigns pc ON cr.campaign_id = pc.id 
        WHERE pc.user_id = $1 ${dateFilter.replace('created_at', 'cr.sent_at')}
        UNION
        SELECT ae.customer_phone as phone FROM automation_executions ae
        JOIN automation_rules ar ON ae.automation_rule_id = ar.id
        WHERE ar.user_id = $1 AND ae.message_sent IS NOT NULL ${dateFilter.replace('created_at', 'ae.executed_at')}
        UNION
        SELECT from_phone as phone FROM whatsapp_messages WHERE user_id = $1 ${dateFilter}
      ) all_phones
    `, [userId])

    return NextResponse.json({
      total_interactions: parseInt(chatbotStats[0]?.total_interactions || '0'),
      total_promotional: parseInt(promotionalStats[0]?.total_promotional || '0'),
      total_whatsapp: parseInt(whatsappStats[0]?.total_whatsapp || '0'),
      unique_customers: parseInt(uniqueCustomers[0]?.unique_customers || '0')
    })
  } catch (error) {
    console.error('Error getting message stats:', error)
    return NextResponse.json({ error: 'Failed to get message stats' }, { status: 500 })
  }
}

async function searchMessages(userId: number, query: string, type?: string) {
  try {
    let searchQuery = `%${query.toLowerCase()}%`
    let results: any[] = []

    if (!type || type === 'chatbot') {
      const chatbotResults = await sql(`
        SELECT 
          'chatbot' as message_type,
          ci.id,
          ci.customer_phone,
          ci.incoming_message as message_content,
          ci.bot_response,
          ci.created_at,
          c.name as customer_name
        FROM chatbot_interactions ci
        LEFT JOIN customers c ON ci.customer_phone = c.phone AND c.user_id = $1
        WHERE ci.user_id = $1 
        AND (
          LOWER(ci.customer_phone) LIKE $2 OR
          LOWER(ci.incoming_message) LIKE $2 OR
          LOWER(ci.bot_response) LIKE $2 OR
          LOWER(c.name) LIKE $2
        )
        ORDER BY ci.created_at DESC
        LIMIT 50
      `, [userId, searchQuery])
      
      results = [...results, ...chatbotResults]
    }

    if (!type || type === 'promotional') {
      const promotionalResults = await sql(`
        SELECT 
          message_type,
          id,
          customer_phone,
          campaign_name,
          message_content,
          sent_at as created_at,
          customer_name
        FROM (
          SELECT 
            'promotional' as message_type,
            cr.id,
            cr.phone as customer_phone,
            pc.name as campaign_name,
            cr.message_content,
            cr.sent_at,
            c.name as customer_name
          FROM campaign_recipients cr
          JOIN promotional_campaigns pc ON cr.campaign_id = pc.id
          LEFT JOIN customers c ON cr.phone = c.phone AND c.user_id = $1
          WHERE pc.user_id = $1
          
          UNION ALL
          
          SELECT 
            'promotional' as message_type,
            ae.id,
            ae.customer_phone,
            ar.name as campaign_name,
            ae.message_sent as message_content,
            ae.executed_at as sent_at,
            c.name as customer_name
          FROM automation_executions ae
          JOIN automation_rules ar ON ae.automation_rule_id = ar.id
          LEFT JOIN customers c ON ae.customer_phone = c.phone AND c.user_id = $1
          WHERE ar.user_id = $1 AND ae.message_sent IS NOT NULL
        ) promotional_messages
        WHERE 
          LOWER(customer_phone) LIKE $2 OR
          LOWER(campaign_name) LIKE $2 OR
          LOWER(message_content) LIKE $2 OR
          LOWER(customer_name) LIKE $2
        ORDER BY sent_at DESC
        LIMIT 50
      `, [userId, searchQuery])
      
      results = [...results, ...promotionalResults]
    }

    if (!type || type === 'whatsapp') {
      const whatsappResults = await sql(`
        SELECT 
          'whatsapp' as message_type,
          wm.id,
          wm.from_phone as customer_phone,
          wm.message_body as message_content,
          wm.created_at,
          c.name as customer_name
        FROM whatsapp_messages wm
        LEFT JOIN customers c ON wm.from_phone = c.phone AND c.user_id = $1
        WHERE wm.user_id = $1
        AND (
          LOWER(wm.from_phone) LIKE $2 OR
          LOWER(wm.message_body) LIKE $2 OR
          LOWER(c.name) LIKE $2
        )
        ORDER BY wm.created_at DESC
        LIMIT 50
      `, [userId, searchQuery])
      
      results = [...results, ...whatsappResults]
    }

    // Sort all results by date
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json(results.slice(0, 100)) // Limit to 100 total results
  } catch (error) {
    console.error('Error searching messages:', error)
    return NextResponse.json({ error: 'Failed to search messages' }, { status: 500 })
  }
}