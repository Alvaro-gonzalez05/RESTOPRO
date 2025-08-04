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
    const { action, userId, period = 'month' } = body

    // Verify user owns this data
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    switch (action) {
      case 'get':
        return await getAutomationStats(userId, period)
      case 'get_detailed':
        return await getDetailedStats(userId, period)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in automation stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getAutomationStats(userId: number, period: 'today' | 'week' | 'month' = 'month') {
  try {
    let dateFilter = ''
    
    switch (period) {
      case 'today':
        dateFilter = "AND ae.executed_at >= CURRENT_DATE"
        break
      case 'week':
        dateFilter = "AND ae.executed_at >= CURRENT_DATE - INTERVAL '7 days'"
        break
      case 'month':
        dateFilter = "AND ae.executed_at >= CURRENT_DATE - INTERVAL '30 days'"
        break
    }

    const stats = await sql(`
      SELECT 
        COUNT(ae.id) as total_executions,
        COUNT(DISTINCT ae.customer_phone) as unique_customers,
        COUNT(CASE WHEN ae.error_message IS NULL THEN 1 END) as successful_executions,
        COUNT(CASE WHEN ae.error_message IS NOT NULL THEN 1 END) as failed_executions,
        CASE 
          WHEN COUNT(ae.id) > 0 THEN 
            (COUNT(CASE WHEN ae.error_message IS NULL THEN 1 END)::float / COUNT(ae.id)::float) * 100
          ELSE 0 
        END as success_rate
      FROM automation_executions ae
      JOIN automation_rules ar ON ae.automation_rule_id = ar.id
      WHERE ar.user_id = $1 ${dateFilter}
    `, [userId])

    // Get stats by trigger type
    const statsByType = await sql(`
      SELECT 
        ar.trigger_type,
        COUNT(ae.id) as executions,
        COUNT(DISTINCT ae.customer_phone) as unique_customers,
        COUNT(CASE WHEN ae.error_message IS NULL THEN 1 END) as successful_executions
      FROM automation_rules ar
      LEFT JOIN automation_executions ae ON ar.id = ae.automation_rule_id ${dateFilter.replace('ae.executed_at', 'ae.executed_at')}
      WHERE ar.user_id = $1
      GROUP BY ar.trigger_type
      ORDER BY executions DESC
    `, [userId])

    // Get active rules count
    const rulesCount = await sql(`
      SELECT 
        COUNT(*) as total_rules,
        COUNT(CASE WHEN is_active THEN 1 END) as active_rules
      FROM automation_rules
      WHERE user_id = $1
    `, [userId])

    return NextResponse.json({
      ...stats[0],
      stats_by_type: statsByType,
      rules_summary: rulesCount[0]
    })
  } catch (error) {
    console.error('Error getting automation stats:', error)
    return NextResponse.json({ error: 'Failed to get automation stats' }, { status: 500 })
  }
}

async function getDetailedStats(userId: number, period: 'today' | 'week' | 'month' = 'month') {
  try {
    let dateFilter = ''
    let dateGrouping = ''
    
    switch (period) {
      case 'today':
        dateFilter = "AND ae.executed_at >= CURRENT_DATE"
        dateGrouping = "DATE_TRUNC('hour', ae.executed_at)"
        break
      case 'week':
        dateFilter = "AND ae.executed_at >= CURRENT_DATE - INTERVAL '7 days'"
        dateGrouping = "DATE_TRUNC('day', ae.executed_at)"
        break
      case 'month':
        dateFilter = "AND ae.executed_at >= CURRENT_DATE - INTERVAL '30 days'"
        dateGrouping = "DATE_TRUNC('day', ae.executed_at)"
        break
    }

    // Executions over time
    const timelineStats = await sql(`
      SELECT 
        ${dateGrouping} as time_period,
        COUNT(ae.id) as executions,
        COUNT(CASE WHEN ae.error_message IS NULL THEN 1 END) as successful_executions
      FROM automation_executions ae
      JOIN automation_rules ar ON ae.automation_rule_id = ar.id
      WHERE ar.user_id = $1 ${dateFilter}
      GROUP BY time_period
      ORDER BY time_period
    `, [userId])

    // Top performing rules
    const topRules = await sql(`
      SELECT 
        ar.name,
        ar.trigger_type,
        COUNT(ae.id) as executions,
        COUNT(CASE WHEN ae.error_message IS NULL THEN 1 END) as successful_executions,
        COUNT(DISTINCT ae.customer_phone) as unique_customers_reached
      FROM automation_rules ar
      LEFT JOIN automation_executions ae ON ar.id = ae.automation_rule_id ${dateFilter.replace('ae.executed_at', 'ae.executed_at')}
      WHERE ar.user_id = $1
      GROUP BY ar.id, ar.name, ar.trigger_type
      ORDER BY executions DESC
      LIMIT 10
    `, [userId])

    // Customer engagement
    const customerEngagement = await sql(`
      SELECT 
        ae.customer_phone,
        COUNT(ae.id) as messages_received,
        COUNT(DISTINCT ar.trigger_type) as different_automation_types,
        MAX(ae.executed_at) as last_interaction
      FROM automation_executions ae
      JOIN automation_rules ar ON ae.automation_rule_id = ar.id
      WHERE ar.user_id = $1 ${dateFilter}
      AND ae.error_message IS NULL
      GROUP BY ae.customer_phone
      ORDER BY messages_received DESC
      LIMIT 20
    `, [userId])

    return NextResponse.json({
      timeline_stats: timelineStats,
      top_rules: topRules,
      customer_engagement: customerEngagement
    })
  } catch (error) {
    console.error('Error getting detailed automation stats:', error)
    return NextResponse.json({ error: 'Failed to get detailed automation stats' }, { status: 500 })
  }
}