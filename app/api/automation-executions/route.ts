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
        return await getAutomationExecutions(userId, data.limit, data.offset)
      case 'get_by_rule':
        return await getExecutionsByRule(userId, data.ruleId, data.limit)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in automation executions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getAutomationExecutions(userId: number, limit: number = 50, offset: number = 0) {
  try {
    const executions = await sql(`
      SELECT 
        ae.*,
        ar.name as rule_name,
        ar.trigger_type,
        CASE 
          WHEN ae.error_message IS NULL THEN true 
          ELSE false 
        END as success
      FROM automation_executions ae
      LEFT JOIN automation_rules ar ON ae.automation_rule_id = ar.id
      WHERE ar.user_id = $1
      ORDER BY ae.executed_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset])

    // Parse JSON metadata
    const parsedExecutions = executions.map(execution => ({
      ...execution,
      metadata: typeof execution.metadata === 'string' 
        ? JSON.parse(execution.metadata) 
        : execution.metadata
    }))

    return NextResponse.json(parsedExecutions)
  } catch (error) {
    console.error('Error getting automation executions:', error)
    return NextResponse.json({ error: 'Failed to get automation executions' }, { status: 500 })
  }
}

async function getExecutionsByRule(userId: number, ruleId: number, limit: number = 20) {
  try {
    // First verify the rule belongs to the user
    const ruleCheck = await sql(`
      SELECT id FROM automation_rules WHERE id = $1 AND user_id = $2
    `, [ruleId, userId])

    if (ruleCheck.length === 0) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const executions = await sql(`
      SELECT 
        ae.*,
        CASE 
          WHEN ae.error_message IS NULL THEN true 
          ELSE false 
        END as success
      FROM automation_executions ae
      WHERE ae.automation_rule_id = $1
      ORDER BY ae.executed_at DESC
      LIMIT $2
    `, [ruleId, limit])

    // Parse JSON metadata
    const parsedExecutions = executions.map(execution => ({
      ...execution,
      metadata: typeof execution.metadata === 'string' 
        ? JSON.parse(execution.metadata) 
        : execution.metadata
    }))

    return NextResponse.json(parsedExecutions)
  } catch (error) {
    console.error('Error getting executions by rule:', error)
    return NextResponse.json({ error: 'Failed to get executions by rule' }, { status: 500 })
  }
}