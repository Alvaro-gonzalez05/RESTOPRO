"use server"

import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import type { DashboardStats, Order } from "@/lib/types"

export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await requireAuth()

  // Usar zona horaria de Argentina
  const now = new Date()
  const argentinaTimeString = now.toLocaleString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
  const today = argentinaTimeString.split(',')[0] // Formato YYYY-MM-DD

  // Órdenes de hoy (solo completadas/entregadas)
  const ordersToday = await sql(`SELECT COUNT(*) as count FROM orders WHERE user_id = $1 AND DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') = $2 AND status IN ('completado', 'entregado')`, [user.id, today])

  // Ingresos de hoy (solo de órdenes completadas/entregadas)
  const revenueToday = await sql(`SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE user_id = $1 AND DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') = $2 AND status IN ('completado', 'entregado')`, [user.id, today])

  // Clientes nuevos de hoy
  const newCustomers = await sql(`SELECT COUNT(*) as count FROM customers WHERE user_id = $1 AND DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') = $2`, [user.id, today])

  // Total de productos
  const totalProducts = await sql(`SELECT COUNT(*) as count FROM products WHERE user_id = $1`, [user.id])

  // Total de proveedores
  const totalSuppliers = await sql(`SELECT COUNT(*) as count FROM suppliers WHERE user_id = $1`, [user.id])

  // Gastos del mes actual
  const monthlyExpenses = await sql(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM expenses 
     WHERE user_id = $1 AND DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)`,
    [user.id]
  )

  // Ingresos del mes actual (solo de órdenes completadas/entregadas)
  const monthlyRevenue = await sql(
    `SELECT COALESCE(SUM(total), 0) as revenue 
     FROM orders 
     WHERE user_id = $1 AND DATE_TRUNC('month', created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') = DATE_TRUNC('month', CURRENT_DATE AT TIME ZONE 'America/Argentina/Buenos_Aires') AND status IN ('completado', 'entregado')`,
    [user.id]
  )

  const monthlyExpensesTotal = Number(monthlyExpenses[0]?.total || 0)
  const monthlyRevenueTotal = Number(monthlyRevenue[0]?.revenue || 0)
  const realProfitMonth = monthlyRevenueTotal - monthlyExpensesTotal

  return {
    ordersToday: Number(ordersToday[0].count),
    revenueToday: Number(revenueToday[0].revenue),
    newCustomers: Number(newCustomers[0].count),
    totalProducts: Number(totalProducts[0].count),
    totalSuppliers: Number(totalSuppliers[0].count),
    monthlyExpenses: monthlyExpensesTotal,
    monthlyRevenue: monthlyRevenueTotal,
    realProfitMonth: realProfitMonth,
  }
}

export async function getRecentOrders(): Promise<Order[]> {
  const user = await requireAuth()

  const orders = await sql(`SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [user.id])

  return orders as Order[]
}
