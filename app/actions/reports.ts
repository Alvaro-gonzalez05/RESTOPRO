"use server"

import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { ReportData } from "@/lib/types"

export async function getReportData(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<ReportData> {
  const user = await requireAuth()
  
  try {
    // Configurar el formato de fecha según el período
    let dateFormat = 'YYYY-MM-DD'
    let daysBack = 30
    
    switch (period) {
      case 'weekly':
        dateFormat = 'YYYY-"W"WW'
        daysBack = 84 // 12 semanas
        break
      case 'monthly':
        dateFormat = 'YYYY-MM'
        daysBack = 365 // 12 meses
        break
      case 'daily':
      default:
        daysBack = 30 // 30 días
        break
    }
    
    // Calcular fecha límite usando zona horaria de Argentina
    const now = new Date()
    const argentinaTimeString = now.toLocaleString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    const argentinaDateStr = argentinaTimeString.split(',')[0] // Formato YYYY-MM-DD
    
    const argentinaDate = new Date(argentinaDateStr + 'T00:00:00')
    const startDate = new Date(argentinaDate)
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString().split('T')[0]
    
    console.log('Reports fecha límite para Argentina:', startDateStr, 'Fecha actual Argentina:', argentinaDateStr)

    // Ventas por período - Query simplificada con zona horaria
    const salesByPeriod = await sql`
      SELECT 
        DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') as date,
        COUNT(*) as orders,
        COALESCE(SUM(total), 0) as sales
      FROM orders 
      WHERE user_id = ${user.id} 
        AND created_at >= ${startDateStr}
        AND status IN ('completado', 'entregado', 'pendiente')
      GROUP BY DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')
      ORDER BY date DESC
      LIMIT 20
    `
    
    // Productos más vendidos - Query simplificada
    const topProducts = await sql`
      SELECT 
        p.name,
        SUM(oi.quantity) as quantity,
        SUM(oi.total_price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.user_id = ${user.id} 
        AND o.created_at >= ${startDateStr}
        AND o.status IN ('completado', 'entregado', 'pendiente')
      GROUP BY p.id, p.name
      ORDER BY quantity DESC
      LIMIT 10
    `
    
    // Ticket promedio
    const avgTicketResult = await sql`
      SELECT COALESCE(AVG(total), 0) as average_ticket
      FROM orders 
      WHERE user_id = ${user.id} 
        AND created_at >= ${startDateStr}
        AND status IN ('completado', 'entregado', 'pendiente')
    `
    
    // Horas pico - Query simplificada con zona horaria
    const peakHours = await sql`
      SELECT 
        EXTRACT(hour FROM created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::integer as hour,
        COUNT(*) as orders
      FROM orders 
      WHERE user_id = ${user.id} 
        AND created_at >= ${startDateStr}
        AND status IN ('completado', 'entregado', 'pendiente')
      GROUP BY EXTRACT(hour FROM created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')
      ORDER BY orders DESC
    `
    
    // Métodos de pago por período - Query mejorada con datos reales
    let paymentMethodsQuery
    
    if (period === 'weekly') {
      paymentMethodsQuery = sql`
        SELECT 
          TO_CHAR(DATE_TRUNC('week', created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'), 'YYYY-"W"WW') as period,
          CASE 
            WHEN o.payment_method_id IS NOT NULL THEN pm.name
            WHEN o.payment_method_name IS NOT NULL THEN o.payment_method_name
            ELSE 'Efectivo'
          END as method,
          COUNT(*) as count,
          SUM(o.total) as amount
        FROM orders o
        LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
        WHERE o.user_id = ${user.id} 
          AND o.created_at >= ${startDateStr}
          AND o.status IN ('completado', 'entregado', 'pendiente')
        GROUP BY 
          TO_CHAR(DATE_TRUNC('week', created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'), 'YYYY-"W"WW'),
          CASE 
            WHEN o.payment_method_id IS NOT NULL THEN pm.name
            WHEN o.payment_method_name IS NOT NULL THEN o.payment_method_name
            ELSE 'Efectivo'
          END
        ORDER BY period DESC, amount DESC
      `
    } else if (period === 'monthly') {
      paymentMethodsQuery = sql`
        SELECT 
          TO_CHAR(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') as period,
          CASE 
            WHEN o.payment_method_id IS NOT NULL THEN pm.name
            WHEN o.payment_method_name IS NOT NULL THEN o.payment_method_name
            ELSE 'Efectivo'
          END as method,
          COUNT(*) as count,
          SUM(o.total) as amount
        FROM orders o
        LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
        WHERE o.user_id = ${user.id} 
          AND o.created_at >= ${startDateStr}
          AND o.status IN ('completado', 'entregado', 'pendiente')
        GROUP BY 
          TO_CHAR(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM'),
          CASE 
            WHEN o.payment_method_id IS NOT NULL THEN pm.name
            WHEN o.payment_method_name IS NOT NULL THEN o.payment_method_name
            ELSE 'Efectivo'
          END
        ORDER BY period DESC, amount DESC
      `
    } else {
      // Período diario - mantener la lógica original pero agrupado
      paymentMethodsQuery = sql`
        SELECT 
          CASE 
            WHEN o.payment_method_id IS NOT NULL THEN pm.name
            WHEN o.payment_method_name IS NOT NULL THEN o.payment_method_name
            ELSE 'Efectivo'
          END as method,
          COUNT(*) as count,
          SUM(o.total) as amount
        FROM orders o
        LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
        WHERE o.user_id = ${user.id} 
          AND o.created_at >= ${startDateStr}
          AND o.status IN ('completado', 'entregado', 'pendiente')
        GROUP BY 
          CASE 
            WHEN o.payment_method_id IS NOT NULL THEN pm.name
            WHEN o.payment_method_name IS NOT NULL THEN o.payment_method_name
            ELSE 'Efectivo'
          END
        ORDER BY amount DESC
      `
    }
    
    const paymentMethodsData = await paymentMethodsQuery
    
    console.log('🔍 Payment methods raw data:', {
      period,
      dataLength: paymentMethodsData.length,
      rawData: paymentMethodsData,
      query: period
    })
    
    // Debug: ver todas las órdenes recientes sin filtrar por status
    const debugOrders = await sql`
      SELECT 
        id,
        status,
        total,
        payment_method_id,
        payment_method_name,
        created_at,
        CASE 
          WHEN payment_method_id IS NOT NULL THEN (SELECT name FROM payment_methods WHERE id = payment_method_id)
          WHEN payment_method_name IS NOT NULL THEN payment_method_name
          ELSE 'Efectivo'
        END as resolved_method
      FROM orders 
      WHERE user_id = ${user.id} 
        AND created_at >= NOW() - INTERVAL '1 day'
      ORDER BY created_at DESC
      LIMIT 10
    `
    
    console.log('🔍 Debug - Recent orders (last 24h):', debugOrders)
    
    // Procesar datos de métodos de pago según el período
    let paymentMethods
    
    if (period === 'weekly' || period === 'monthly') {
      // Para períodos semanales y mensuales, necesitamos agrupar por método y sumar totales
      const methodTotals = new Map()
      
      paymentMethodsData.forEach(item => {
        const method = item.method || 'Efectivo'
        const amount = Number(item.amount || 0)
        
        if (methodTotals.has(method)) {
          methodTotals.set(method, methodTotals.get(method) + amount)
        } else {
          methodTotals.set(method, amount)
        }
      })
      
      const totalPayments = Array.from(methodTotals.values()).reduce((sum, amount) => sum + amount, 0)
      
      paymentMethods = Array.from(methodTotals.entries()).map(([method, amount]) => ({
        method,
        amount,
        percentage: totalPayments > 0 ? (amount / totalPayments) * 100 : 0
      })).sort((a, b) => b.amount - a.amount)
      
    } else {
      // Para período diario, usar el procesamiento original
      const totalPayments = paymentMethodsData.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      paymentMethods = paymentMethodsData.map(item => ({
        method: item.method || 'Efectivo',
        amount: Number(item.amount || 0),
        percentage: totalPayments > 0 ? (Number(item.amount || 0) / totalPayments) * 100 : 0
      }))
    }
    
    // Si no hay datos de pagos, agregar datos de muestra
    if (paymentMethods.length === 0) {
      paymentMethods.push({
        method: 'Efectivo',
        amount: 0,
        percentage: 100
      })
    }
    
    console.log('🔍 Payment methods processing:', {
      period,
      rawData: paymentMethodsData.length,
      processedMethods: paymentMethods.length,
      methods: paymentMethods.map(p => `${p.method}: $${p.amount}`)
    })
    
    return {
      salesByPeriod: salesByPeriod.map(item => ({
        date: item.date,
        sales: Number(item.sales || 0),
        orders: Number(item.orders || 0)
      })),
      topProducts: topProducts.map(item => ({
        name: item.name || 'Producto sin nombre',
        quantity: Number(item.quantity || 0),
        revenue: Number(item.revenue || 0)
      })),
      averageTicket: Number(avgTicketResult[0]?.average_ticket || 0),
      peakHours: peakHours.map(item => ({
        hour: `${item.hour}:00`,
        orders: Number(item.orders || 0)
      })),
      paymentMethods
    }
  } catch (error) {
    console.error('Error en getReportData:', error)
    // Retornar datos vacíos en caso de error
    return {
      salesByPeriod: [],
      topProducts: [],
      averageTicket: 0,
      peakHours: [],
      paymentMethods: []
    }
  }
}
