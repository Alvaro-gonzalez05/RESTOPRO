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
      case 'get_segments':
        return await getCustomerSegments(user.id)
      case 'get_segment_customers':
        return await getSegmentCustomers(user.id, data.segment, data.limit, data.offset)
      case 'get_customer_analytics':
        return await getCustomerAnalytics(user.id, data.period)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in customer segmentation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getCustomerSegments(userId: number) {
  try {
    const segments = await sql(`
      WITH customer_stats AS (
        SELECT 
          c.id,
          c.name,
          c.phone,
          c.email,
          c.points,
          c.created_at as customer_since,
          COALESCE(SUM(o.total), 0) as total_spent,
          COUNT(o.id) as orders_count,
          MAX(o.created_at) as last_purchase,
          -- Customer status calculation
          CASE 
            WHEN COUNT(o.id) = 0 THEN 'new'
            WHEN MAX(o.created_at) < CURRENT_DATE - INTERVAL '30 days' THEN 'inactive'
            WHEN COALESCE(SUM(o.total), 0) > 1000 OR COUNT(o.id) > 10 THEN 'vip'
            WHEN COUNT(o.id) <= 2 THEN 'new'
            ELSE 'regular'
          END as customer_status,
          -- Days since last purchase
          CASE 
            WHEN MAX(o.created_at) IS NULL THEN NULL
            ELSE EXTRACT(DAYS FROM CURRENT_TIMESTAMP - MAX(o.created_at))
          END as days_since_last_purchase
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE c.user_id = $1
        GROUP BY c.id, c.name, c.phone, c.email, c.points, c.created_at
      )
      SELECT 
        customer_status as segment,
        COUNT(*) as customer_count,
        AVG(total_spent) as avg_spent,
        AVG(orders_count) as avg_orders,
        AVG(points) as avg_points,
        -- Segment descriptions
        CASE customer_status
          WHEN 'new' THEN 'Clientes nuevos o con pocas compras'
          WHEN 'regular' THEN 'Clientes regulares con actividad moderada'
          WHEN 'vip' THEN 'Clientes VIP con alta frecuencia o gasto'
          WHEN 'inactive' THEN 'Clientes inactivos por más de 30 días'
          ELSE 'Otros'
        END as description
      FROM customer_stats
      GROUP BY customer_status
      ORDER BY 
        CASE customer_status
          WHEN 'vip' THEN 1
          WHEN 'regular' THEN 2
          WHEN 'new' THEN 3
          WHEN 'inactive' THEN 4
          ELSE 5
        END
    `, [userId])

    // Also get overall stats
    const overallStats = await sql(`
      SELECT 
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_revenue,
        COUNT(DISTINCT CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN c.id END) as active_customers_30d
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE c.user_id = $1
    `, [userId])

    return NextResponse.json({
      segments,
      overall_stats: overallStats[0]
    })
  } catch (error) {
    console.error('Error getting customer segments:', error)
    return NextResponse.json({ error: 'Failed to get customer segments' }, { status: 500 })
  }
}

async function getSegmentCustomers(userId: number, segment: string, limit: number = 50, offset: number = 0) {
  try {
    let segmentCondition = ''
    
    switch (segment) {
      case 'new':
        segmentCondition = `
          AND (
            COUNT(o.id) = 0 OR 
            COUNT(o.id) <= 2
          )`
        break
      case 'regular':
        segmentCondition = `
          AND COUNT(o.id) > 2 
          AND COUNT(o.id) <= 10
          AND COALESCE(SUM(o.total), 0) <= 1000
          AND (MAX(o.created_at) >= CURRENT_DATE - INTERVAL '30 days' OR MAX(o.created_at) IS NULL)`
        break
      case 'vip':
        segmentCondition = `
          AND (
            COALESCE(SUM(o.total), 0) > 1000 OR 
            COUNT(o.id) > 10
          )`
        break
      case 'inactive':
        segmentCondition = `
          AND MAX(o.created_at) < CURRENT_DATE - INTERVAL '30 days'
          AND COUNT(o.id) > 0`
        break
      default:
        return NextResponse.json({ error: 'Invalid segment' }, { status: 400 })
    }

    const customers = await sql(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        c.points,
        c.created_at as customer_since,
        COALESCE(SUM(o.total), 0) as total_spent,
        COUNT(o.id) as orders_count,
        MAX(o.created_at) as last_purchase,
        CASE 
          WHEN MAX(o.created_at) IS NULL THEN NULL
          ELSE EXTRACT(DAYS FROM CURRENT_TIMESTAMP - MAX(o.created_at))
        END as days_since_last_purchase,
        -- Get favorite products
        (
          SELECT STRING_AGG(DISTINCT oi.product_name, ', ')
          FROM orders o2
          JOIN order_items oi ON o2.id = oi.order_id
          WHERE o2.customer_id = c.id
          GROUP BY o2.customer_id
          LIMIT 3
        ) as favorite_products
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE c.user_id = $1
      GROUP BY c.id, c.name, c.phone, c.email, c.points, c.created_at
      HAVING 1=1 ${segmentCondition}
      ORDER BY total_spent DESC, orders_count DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset])

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Error getting segment customers:', error)
    return NextResponse.json({ error: 'Failed to get segment customers' }, { status: 500 })
  }
}

async function getCustomerAnalytics(userId: number, period: 'week' | 'month' | 'quarter' = 'month') {
  try {
    let dateFilter = ''
    let dateGrouping = ''
    
    switch (period) {
      case 'week':
        dateFilter = "AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'"
        dateGrouping = "DATE_TRUNC('day', o.created_at)"
        break
      case 'month':
        dateFilter = "AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'"
        dateGrouping = "DATE_TRUNC('day', o.created_at)"
        break
      case 'quarter':
        dateFilter = "AND o.created_at >= CURRENT_DATE - INTERVAL '90 days'"
        dateGrouping = "DATE_TRUNC('week', o.created_at)"
        break
    }

    // Customer acquisition over time
    const acquisitionData = await sql(`
      SELECT 
        ${dateGrouping.replace('o.created_at', 'c.created_at')} as time_period,
        COUNT(c.id) as new_customers
      FROM customers c
      WHERE c.user_id = $1 ${dateFilter.replace('o.created_at', 'c.created_at')}
      GROUP BY time_period
      ORDER BY time_period
    `, [userId])

    // Customer lifetime value distribution
    const clvDistribution = await sql(`
      SELECT 
        CASE 
          WHEN total_spent = 0 THEN '0'
          WHEN total_spent <= 100 THEN '1-100'
          WHEN total_spent <= 500 THEN '101-500'
          WHEN total_spent <= 1000 THEN '501-1000'
          ELSE '1000+'
        END as spending_range,
        COUNT(*) as customer_count,
        AVG(total_spent) as avg_spent
      FROM (
        SELECT 
          c.id,
          COALESCE(SUM(o.total), 0) as total_spent
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE c.user_id = $1
        GROUP BY c.id
      ) customer_spending
      GROUP BY spending_range
      ORDER BY 
        CASE spending_range
          WHEN '0' THEN 1
          WHEN '1-100' THEN 2
          WHEN '101-500' THEN 3
          WHEN '501-1000' THEN 4
          WHEN '1000+' THEN 5
        END
    `, [userId])

    // Purchase frequency analysis
    const frequencyAnalysis = await sql(`
      SELECT 
        CASE 
          WHEN order_count = 0 THEN 'No purchases'
          WHEN order_count = 1 THEN '1 purchase'
          WHEN order_count <= 5 THEN '2-5 purchases'
          WHEN order_count <= 10 THEN '6-10 purchases'
          ELSE '10+ purchases'
        END as frequency_range,
        COUNT(*) as customer_count,
        AVG(order_count) as avg_orders
      FROM (
        SELECT 
          c.id,
          COUNT(o.id) as order_count
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE c.user_id = $1
        GROUP BY c.id
      ) customer_frequency
      GROUP BY frequency_range
      ORDER BY 
        CASE frequency_range
          WHEN 'No purchases' THEN 1
          WHEN '1 purchase' THEN 2
          WHEN '2-5 purchases' THEN 3
          WHEN '6-10 purchases' THEN 4
          WHEN '10+ purchases' THEN 5
        END
    `, [userId])

    return NextResponse.json({
      acquisition_data: acquisitionData,
      clv_distribution: clvDistribution,
      frequency_analysis: frequencyAnalysis
    })
  } catch (error) {
    console.error('Error getting customer analytics:', error)
    return NextResponse.json({ error: 'Failed to get customer analytics' }, { status: 500 })
  }
}