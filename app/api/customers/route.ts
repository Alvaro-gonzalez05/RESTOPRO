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
    const { action, userId, ...data } = body

    // Verify user owns this data
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    switch (action) {
      case 'get':
        return await getCustomers(userId)
      case 'get_with_stats':
        return await getCustomersWithStats(userId)
      case 'get_segments':
        return await getCustomerSegments(userId)
      case 'create':
        return await createCustomer(userId, data)
      case 'update':
        return await updateCustomer(userId, data)
      case 'add_points':
        return await addPoints(userId, data)
      case 'redeem_points':
        return await redeemPoints(userId, data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in customers API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getCustomers(userId: number) {
  try {
    const customers = await sql(`
      SELECT * FROM customers 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId])

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Error getting customers:', error)
    return NextResponse.json({ error: 'Failed to get customers' }, { status: 500 })
  }
}

async function getCustomersWithStats(userId: number) {
  try {
    const customers = await sql(`
      SELECT 
        c.*,
        COALESCE(SUM(o.total), 0) as total_spent,
        COUNT(o.id) as orders_count,
        MAX(o.created_at) as last_purchase,
        CASE 
          WHEN MAX(o.created_at) IS NULL THEN 999
          ELSE EXTRACT(DAYS FROM CURRENT_TIMESTAMP - MAX(o.created_at))
        END as days_since_last_purchase
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [userId])

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Error getting customers with stats:', error)
    return NextResponse.json({ error: 'Failed to get customers with stats' }, { status: 500 })
  }
}

async function getCustomerSegments(userId: number) {
  try {
    const segments = await sql(`
      SELECT 
        'all' as segment,
        COUNT(*) as count,
        COALESCE(AVG(points), 0) as avg_points,
        COALESCE(AVG(total_spent), 0) as avg_spent
      FROM (
        SELECT 
          c.id,
          c.points,
          COALESCE(SUM(o.total), 0) as total_spent,
          COUNT(o.id) as orders_count,
          CASE 
            WHEN MAX(o.created_at) IS NULL THEN 999
            ELSE EXTRACT(DAYS FROM CURRENT_TIMESTAMP - MAX(o.created_at))
          END as days_since_last_purchase
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE c.user_id = $1
        GROUP BY c.id, c.points
      ) customer_stats
      
      UNION ALL
      
      SELECT 
        'inactive' as segment,
        COUNT(*) as count,
        COALESCE(AVG(points), 0) as avg_points,
        COALESCE(AVG(total_spent), 0) as avg_spent
      FROM (
        SELECT 
          c.id,
          c.points,
          COALESCE(SUM(o.total), 0) as total_spent,
          COUNT(o.id) as orders_count,
          CASE 
            WHEN MAX(o.created_at) IS NULL THEN 999
            ELSE EXTRACT(DAYS FROM CURRENT_TIMESTAMP - MAX(o.created_at))
          END as days_since_last_purchase
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE c.user_id = $1
        GROUP BY c.id, c.points
        HAVING (CASE 
          WHEN MAX(o.created_at) IS NULL THEN 999
          ELSE EXTRACT(DAYS FROM CURRENT_TIMESTAMP - MAX(o.created_at))
        END) > 30
      ) customer_stats
      
      UNION ALL
      
      SELECT 
        'vip' as segment,
        COUNT(*) as count,
        COALESCE(AVG(points), 0) as avg_points,
        COALESCE(AVG(total_spent), 0) as avg_spent
      FROM (
        SELECT 
          c.id,
          c.points,
          COALESCE(SUM(o.total), 0) as total_spent,
          COUNT(o.id) as orders_count
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE c.user_id = $1
        GROUP BY c.id, c.points
        HAVING COALESCE(SUM(o.total), 0) > 1000 OR COUNT(o.id) > 10
      ) customer_stats
      
      UNION ALL
      
      SELECT 
        'new' as segment,
        COUNT(*) as count,
        COALESCE(AVG(points), 0) as avg_points,
        COALESCE(AVG(total_spent), 0) as avg_spent
      FROM (
        SELECT 
          c.id,
          c.points,
          COALESCE(SUM(o.total), 0) as total_spent,
          COUNT(o.id) as orders_count
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE c.user_id = $1
        GROUP BY c.id, c.points
        HAVING COUNT(o.id) <= 2
      ) customer_stats
      
      UNION ALL
      
      SELECT 
        'high_points' as segment,
        COUNT(*) as count,
        COALESCE(AVG(points), 0) as avg_points,
        COALESCE(AVG(total_spent), 0) as avg_spent
      FROM customers c
      WHERE c.user_id = $1 AND c.points > 100
    `, [userId])

    return NextResponse.json(segments)
  } catch (error) {
    console.error('Error getting customer segments:', error)
    return NextResponse.json({ error: 'Failed to get customer segments' }, { status: 500 })
  }
}

async function createCustomer(userId: number, data: any) {
  try {
    const { name, phone, email, address, points = 0 } = data

    const result = await sql(`
      INSERT INTO customers (user_id, name, phone, email, address, points)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, name, phone, email || null, address || null, points])

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}

async function updateCustomer(userId: number, data: any) {
  try {
    const { id, name, phone, email, address } = data

    const result = await sql(`
      UPDATE customers 
      SET name = $2, phone = $3, email = $4, address = $5
      WHERE id = $1 AND user_id = $6
      RETURNING *
    `, [id, name, phone, email, address, userId])

    if (result.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

async function addPoints(userId: number, data: any) {
  try {
    const { customer_id, points, reason = 'Manual adjustment' } = data

    // Add points to customer
    const customerResult = await sql(`
      UPDATE customers 
      SET points = points + $2
      WHERE id = $1 AND user_id = $3
      RETURNING *
    `, [customer_id, points, userId])

    if (customerResult.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Log points transaction
    await sql(`
      INSERT INTO points_transactions (
        customer_id, user_id, points_change, transaction_type, description
      )
      VALUES ($1, $2, $3, 'earned', $4)
    `, [customer_id, userId, points, reason])

    return NextResponse.json(customerResult[0])
  } catch (error) {
    console.error('Error adding points:', error)
    return NextResponse.json({ error: 'Failed to add points' }, { status: 500 })
  }
}

async function redeemPoints(userId: number, data: any) {
  try {
    const { customer_id, points, reason = 'Points redemption' } = data

    // Check if customer has enough points
    const customer = await sql(`
      SELECT * FROM customers WHERE id = $1 AND user_id = $2
    `, [customer_id, userId])

    if (customer.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (customer[0].points < points) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
    }

    // Redeem points
    const customerResult = await sql(`
      UPDATE customers 
      SET points = points - $2
      WHERE id = $1 AND user_id = $3
      RETURNING *
    `, [customer_id, points, userId])

    // Log points transaction
    await sql(`
      INSERT INTO points_transactions (
        customer_id, user_id, points_change, transaction_type, description
      )
      VALUES ($1, $2, $3, 'redeemed', $4)
    `, [customer_id, userId, -points, reason])

    return NextResponse.json(customerResult[0])
  } catch (error) {
    console.error('Error redeeming points:', error)
    return NextResponse.json({ error: 'Failed to redeem points' }, { status: 500 })
  }
}