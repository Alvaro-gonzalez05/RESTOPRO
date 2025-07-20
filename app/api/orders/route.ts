import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const userId = cookieStore.get("user_id")?.value
    
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Verificar que el usuario existe
    const users = await sql("SELECT id FROM users WHERE id = $1", [Number(userId)])
    if (users.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 })
    }

    // Obtener todas las órdenes del usuario con sus items
    const orders = await sql(`
      SELECT 
        o.id,
        o.user_id,
        o.customer_id,
        o.customer_name,
        o.table_number,
        o.total,
        o.notes,
        o.status,
        o.payment_method_id,
        o.payment_method_name,
        o.created_at,
        o.updated_at,
        json_agg(
          CASE 
            WHEN oi.product_id IS NOT NULL THEN
              json_build_object(
                'product_id', oi.product_id,
                'product_name', oi.product_name,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'total_price', oi.total_price,
                'category_id', oi.category_id,
                'redeemed_quantity', COALESCE(oi.redeemed_quantity, 0)
              )
            ELSE NULL
          END
        ) as items
      FROM orders o 
      LEFT JOIN order_items oi ON o.id = oi.order_id 
      WHERE o.user_id = $1
      GROUP BY o.id, o.user_id, o.customer_id, o.customer_name, o.table_number, o.total, o.notes, o.status, o.payment_method_id, o.payment_method_name, o.created_at, o.updated_at
      ORDER BY o.created_at DESC
    `, [Number(userId)])

    // Formatear las órdenes
    const formattedOrders = orders.map((order) => ({
      ...order,
      items: order.items?.[0] ? order.items.filter((item: any) => item !== null) : [],
    }))

    return NextResponse.json(formattedOrders)
  } catch (error) {
    console.error("[API][orders] Error:", error)
    return NextResponse.json({ error: "Error al obtener las órdenes" }, { status: 500 })
  }
}
