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
  
  console.log('Dashboard fecha calculada para Argentina:', today, 'Hora actual Argentina:', argentinaTimeString)

  // Órdenes de hoy (solo completadas/entregadas)
  const ordersToday = await sql`
    SELECT COUNT(*) as count 
    FROM orders 
    WHERE user_id = ${user.id} 
    AND DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') = ${today}
    AND status IN ('completado', 'entregado')
  `

  // Ingresos de hoy (solo de órdenes completadas/entregadas)
  const revenueToday = await sql`
    SELECT COALESCE(SUM(total), 0) as revenue 
    FROM orders 
    WHERE user_id = ${user.id} 
    AND DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') = ${today}
    AND status IN ('completado', 'entregado')
  `

  // Clientes nuevos de hoy
  const newCustomers = await sql`
    SELECT COUNT(*) as count 
    FROM customers 
    WHERE user_id = ${user.id} 
    AND DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') = ${today}
  `

  // Total de productos
  const totalProducts = await sql`
    SELECT COUNT(*) as count 
    FROM products 
    WHERE user_id = ${user.id}
  `

  return {
    ordersToday: Number(ordersToday[0].count),
    revenueToday: Number(revenueToday[0].revenue),
    newCustomers: Number(newCustomers[0].count),
    totalProducts: Number(totalProducts[0].count),
  }
}

export async function getRecentOrders(): Promise<Order[]> {
  const user = await requireAuth()

  const orders = await sql`
    SELECT * FROM orders 
    WHERE user_id = ${user.id} 
    ORDER BY created_at DESC 
    LIMIT 10
  `

  return orders as Order[]
}
