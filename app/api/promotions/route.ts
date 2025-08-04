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
        return await getPromotions(userId)
      case 'create':
        return await createPromotion(userId, data)
      case 'update':
        return await updatePromotion(userId, data)
      case 'delete':
        return await deletePromotion(userId, data.id)
      case 'toggle':
        return await togglePromotion(userId, data.id)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in promotions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getPromotions(userId: number) {
  try {
    const promotions = await sql(`
      SELECT 
        p.*,
        COALESCE(usage.usage_count, 0) as usage_count
      FROM promotions p
      LEFT JOIN (
        SELECT 
          promotion_id,
          COUNT(*) as usage_count
        FROM promotion_usage 
        GROUP BY promotion_id
      ) usage ON p.id = usage.promotion_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `, [userId])

    return NextResponse.json(promotions)
  } catch (error) {
    console.error('Error getting promotions:', error)
    return NextResponse.json({ error: 'Failed to get promotions' }, { status: 500 })
  }
}

async function createPromotion(userId: number, data: any) {
  try {
    const {
      title,
      description,
      discount_type,
      discount_value,
      conditions,
      start_date,
      end_date,
      target_audience,
      is_active
    } = data

    const result = await sql(`
      INSERT INTO promotions (
        user_id, title, description, discount_type, discount_value,
        conditions, start_date, end_date, target_audience, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      userId,
      title,
      description,
      discount_type,
      discount_value,
      conditions || null,
      start_date || null,
      end_date || null,
      target_audience,
      is_active
    ])

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error creating promotion:', error)
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 })
  }
}

async function updatePromotion(userId: number, data: any) {
  try {
    const {
      id,
      title,
      description,
      discount_type,
      discount_value,
      conditions,
      start_date,
      end_date,
      target_audience,
      is_active
    } = data

    const result = await sql(`
      UPDATE promotions 
      SET 
        title = $2,
        description = $3,
        discount_type = $4,
        discount_value = $5,
        conditions = $6,
        start_date = $7,
        end_date = $8,
        target_audience = $9,
        is_active = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $11
      RETURNING *
    `, [
      id,
      title,
      description,
      discount_type,
      discount_value,
      conditions,
      start_date,
      end_date,
      target_audience,
      is_active,
      userId
    ])

    if (result.length === 0) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating promotion:', error)
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 })
  }
}

async function deletePromotion(userId: number, promotionId: number) {
  try {
    const result = await sql(`
      DELETE FROM promotions 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [promotionId, userId])

    if (result.length === 0) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting promotion:', error)
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 })
  }
}

async function togglePromotion(userId: number, promotionId: number) {
  try {
    const result = await sql(`
      UPDATE promotions 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [promotionId, userId])

    if (result.length === 0) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error toggling promotion:', error)
    return NextResponse.json({ error: 'Failed to toggle promotion' }, { status: 500 })
  }
}