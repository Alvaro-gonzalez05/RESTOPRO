import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { sendPromotionalMessageEnhanced } from '@/app/actions/enhanced-chatbot-ai'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, userId, ...data } = body

    // Verify user owns this data
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    switch (action) {
      case 'get':
        return await getCampaigns(userId)
      case 'create':
        return await createCampaign(userId, data)
      case 'get_stats':
        return await getCampaignStats(userId, data.campaignId)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in promotion campaigns API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getCampaigns(userId: number) {
  try {
    const campaigns = await sql(`
      SELECT 
        pc.*,
        p.title as promotion_title,
        p.description as promotion_description,
        COUNT(pcr.id) as customers_targeted,
        COUNT(CASE WHEN pcr.sent_at IS NOT NULL THEN 1 END) as messages_sent,
        COUNT(CASE WHEN pcr.responded_at IS NOT NULL THEN 1 END) as responses_received,
        COUNT(CASE WHEN pcr.order_generated THEN 1 END) as orders_generated,
        COALESCE(SUM(pcr.revenue_generated), 0) as revenue_generated
      FROM promotion_campaigns pc
      LEFT JOIN promotions p ON pc.promotion_id = p.id
      LEFT JOIN promotion_campaign_recipients pcr ON pc.id = pcr.campaign_id
      WHERE pc.user_id = $1
      GROUP BY pc.id, p.title, p.description
      ORDER BY pc.created_at DESC
    `, [userId])

    return NextResponse.json(campaigns)
  } catch (error) {
    console.error('Error getting campaigns:', error)
    return NextResponse.json({ error: 'Failed to get campaigns' }, { status: 500 })
  }
}

async function createCampaign(userId: number, data: any) {
  try {
    const {
      promotion_id,
      message_template,
      target_customers,
      send_immediately,
      scheduled_date,
      target_segment
    } = data

    // Verify promotion belongs to user
    const promotion = await sql(`
      SELECT * FROM promotions WHERE id = $1 AND user_id = $2
    `, [promotion_id, userId])

    if (promotion.length === 0) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    // Get customers with their details
    const customers = await sql(`
      SELECT c.*, COALESCE(SUM(o.total), 0) as total_spent, COUNT(o.id) as orders_count
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE c.user_id = $1 AND c.id = ANY($2::int[]) AND c.phone IS NOT NULL
      GROUP BY c.id
    `, [userId, target_customers])

    if (customers.length === 0) {
      return NextResponse.json({ error: 'No valid customers found' }, { status: 400 })
    }

    // Create campaign
    const campaignResult = await sql(`
      INSERT INTO promotion_campaigns (
        user_id, promotion_id, message_template, target_segment,
        send_immediately, scheduled_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      userId,
      promotion_id,
      message_template,
      target_segment,
      send_immediately,
      scheduled_date || null,
      send_immediately ? 'sending' : 'scheduled'
    ])

    const campaign = campaignResult[0]

    // Create recipients
    const recipients = []
    for (const customer of customers) {
      const recipientResult = await sql(`
        INSERT INTO promotion_campaign_recipients (
          campaign_id, customer_id, customer_phone, customer_name, status
        )
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING *
      `, [campaign.id, customer.id, customer.phone, customer.name])
      
      recipients.push(recipientResult[0])
    }

    // Send messages immediately if requested
    if (send_immediately) {
      await sendCampaignMessages(campaign.id, userId, promotion[0], recipients, message_template)
    }

    return NextResponse.json({
      campaign,
      recipients_count: recipients.length,
      messages_sent: send_immediately ? recipients.length : 0
    })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}

async function sendCampaignMessages(
  campaignId: number, 
  userId: number, 
  promotion: any, 
  recipients: any[], 
  messageTemplate: string
) {
  try {
    // Get business info for template variables
    const businessInfo = await sql(`
      SELECT * FROM business_info WHERE user_id = $1
    `, [userId])

    const business = businessInfo[0] || {}

    for (const recipient of recipients) {
      try {
        // Replace template variables
        let personalizedMessage = messageTemplate
          .replace(/{customer_name}/g, recipient.customer_name || 'Cliente')
          .replace(/{business_name}/g, business.business_name || 'Nuestro restaurante')
          .replace(/{promotion_title}/g, promotion.title)
          .replace(/{discount}/g, getDiscountText(promotion))

        // Send the promotional message
        const result = await sendPromotionalMessageEnhanced(
          userId,
          recipient.customer_phone,
          'promotion',
          personalizedMessage
        )

        if (result.success) {
          // Update recipient status
          await sql(`
            UPDATE promotion_campaign_recipients 
            SET status = 'sent', sent_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [recipient.id])

          // Log promotion usage
          await sql(`
            INSERT INTO promotion_usage (
              promotion_id, customer_id, campaign_id, used_at
            )
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          `, [promotion.id, recipient.customer_id, campaignId])
        } else {
          // Update recipient status to failed
          await sql(`
            UPDATE promotion_campaign_recipients 
            SET status = 'failed', error_message = $2
            WHERE id = $1
          `, [recipient.id, result.error])
        }
      } catch (error) {
        console.error(`Error sending to recipient ${recipient.id}:`, error)
        await sql(`
          UPDATE promotion_campaign_recipients 
          SET status = 'failed', error_message = $2
          WHERE id = $1
        `, [recipient.id, error.message])
      }

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Update campaign status
    await sql(`
      UPDATE promotion_campaigns 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [campaignId])

  } catch (error) {
    console.error('Error sending campaign messages:', error)
    // Update campaign status to failed
    await sql(`
      UPDATE promotion_campaigns 
      SET status = 'failed', error_message = $2
      WHERE id = $1
    `, [campaignId, error.message])
  }
}

function getDiscountText(promotion: any) {
  switch (promotion.discount_type) {
    case 'percentage':
      return `${promotion.discount_value}% de descuento`
    case 'fixed':
      return `$${promotion.discount_value} de descuento`
    case 'points':
      return `${promotion.discount_value} puntos gratis`
    default:
      return 'Descuento especial'
  }
}

async function getCampaignStats(userId: number, campaignId: number) {
  try {
    const stats = await sql(`
      SELECT 
        pc.*,
        p.title as promotion_title,
        COUNT(pcr.id) as total_recipients,
        COUNT(CASE WHEN pcr.status = 'sent' THEN 1 END) as messages_sent,
        COUNT(CASE WHEN pcr.status = 'failed' THEN 1 END) as messages_failed,
        COUNT(CASE WHEN pcr.responded_at IS NOT NULL THEN 1 END) as responses_received,
        COUNT(CASE WHEN pcr.order_generated THEN 1 END) as orders_generated,
        COALESCE(SUM(pcr.revenue_generated), 0) as total_revenue
      FROM promotion_campaigns pc
      LEFT JOIN promotions p ON pc.promotion_id = p.id
      LEFT JOIN promotion_campaign_recipients pcr ON pc.id = pcr.campaign_id
      WHERE pc.id = $1 AND pc.user_id = $2
      GROUP BY pc.id, p.title
    `, [campaignId, userId])

    if (stats.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get recipient details
    const recipients = await sql(`
      SELECT 
        pcr.*,
        c.name as customer_name,
        c.email as customer_email
      FROM promotion_campaign_recipients pcr
      LEFT JOIN customers c ON pcr.customer_id = c.id
      WHERE pcr.campaign_id = $1
      ORDER BY pcr.sent_at DESC
    `, [campaignId])

    return NextResponse.json({
      ...stats[0],
      recipients
    })
  } catch (error) {
    console.error('Error getting campaign stats:', error)
    return NextResponse.json({ error: 'Failed to get campaign stats' }, { status: 500 })
  }
}