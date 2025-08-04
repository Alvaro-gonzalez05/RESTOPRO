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
        return await getAutomationRules(userId)
      case 'create':
        return await createAutomationRule(userId, data)
      case 'update':
        return await updateAutomationRule(userId, data)
      case 'delete':
        return await deleteAutomationRule(userId, data.id)
      case 'toggle':
        return await toggleAutomationRule(userId, data.id)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in automation rules API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getAutomationRules(userId: number) {
  try {
    const rules = await sql(`
      SELECT 
        ar.*,
        COALESCE(ae.execution_count, 0) as execution_count,
        ae.last_executed
      FROM automation_rules ar
      LEFT JOIN (
        SELECT 
          automation_rule_id,
          COUNT(*) as execution_count,
          MAX(executed_at) as last_executed
        FROM automation_executions 
        GROUP BY automation_rule_id
      ) ae ON ar.id = ae.automation_rule_id
      WHERE ar.user_id = $1
      ORDER BY ar.created_at DESC
    `, [userId])

    // Parse JSON fields
    const parsedRules = rules.map(rule => ({
      ...rule,
      trigger_conditions: typeof rule.trigger_conditions === 'string' 
        ? JSON.parse(rule.trigger_conditions) 
        : rule.trigger_conditions,
      action_data: typeof rule.action_data === 'string' 
        ? JSON.parse(rule.action_data) 
        : rule.action_data
    }))

    return NextResponse.json(parsedRules)
  } catch (error) {
    console.error('Error getting automation rules:', error)
    return NextResponse.json({ error: 'Failed to get automation rules' }, { status: 500 })
  }
}

async function createAutomationRule(userId: number, data: any) {
  try {
    const {
      name,
      trigger_type,
      trigger_conditions,
      action_type,
      action_data,
      is_active
    } = data

    const result = await sql(`
      INSERT INTO automation_rules (
        user_id, name, trigger_type, trigger_conditions, action_type, action_data, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      userId,
      name,
      trigger_type,
      JSON.stringify(trigger_conditions),
      action_type,
      JSON.stringify(action_data),
      is_active
    ])

    const rule = result[0]
    return NextResponse.json({
      ...rule,
      trigger_conditions: JSON.parse(rule.trigger_conditions),
      action_data: JSON.parse(rule.action_data)
    })
  } catch (error) {
    console.error('Error creating automation rule:', error)
    return NextResponse.json({ error: 'Failed to create automation rule' }, { status: 500 })
  }
}

async function updateAutomationRule(userId: number, data: any) {
  try {
    const {
      id,
      name,
      trigger_type,
      trigger_conditions,
      action_type,
      action_data,
      is_active
    } = data

    const result = await sql(`
      UPDATE automation_rules 
      SET 
        name = $2,
        trigger_type = $3,
        trigger_conditions = $4,
        action_type = $5,
        action_data = $6,
        is_active = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $8
      RETURNING *
    `, [
      id,
      name,
      trigger_type,
      JSON.stringify(trigger_conditions),
      action_type,
      JSON.stringify(action_data),
      is_active,
      userId
    ])

    if (result.length === 0) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }

    const rule = result[0]
    return NextResponse.json({
      ...rule,
      trigger_conditions: JSON.parse(rule.trigger_conditions),
      action_data: JSON.parse(rule.action_data)
    })
  } catch (error) {
    console.error('Error updating automation rule:', error)
    return NextResponse.json({ error: 'Failed to update automation rule' }, { status: 500 })
  }
}

async function deleteAutomationRule(userId: number, ruleId: number) {
  try {
    const result = await sql(`
      DELETE FROM automation_rules 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [ruleId, userId])

    if (result.length === 0) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting automation rule:', error)
    return NextResponse.json({ error: 'Failed to delete automation rule' }, { status: 500 })
  }
}

async function toggleAutomationRule(userId: number, ruleId: number) {
  try {
    const result = await sql(`
      UPDATE automation_rules 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [ruleId, userId])

    if (result.length === 0) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }

    const rule = result[0]
    return NextResponse.json({
      ...rule,
      trigger_conditions: JSON.parse(rule.trigger_conditions),
      action_data: JSON.parse(rule.action_data)
    })
  } catch (error) {
    console.error('Error toggling automation rule:', error)
    return NextResponse.json({ error: 'Failed to toggle automation rule' }, { status: 500 })
  }
}