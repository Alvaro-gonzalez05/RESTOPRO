import type { NextApiRequest, NextApiResponse } from "next"
import { sql } from "@/lib/db"
import type { User } from "@/lib/types"

// Utilidad para obtener el usuario autenticado por cookie (solo para API routes)
async function getCurrentUserFromApiRoute(req: NextApiRequest): Promise<User | null> {
  const userId = req.cookies["user_id"]
  if (!userId) return null
  const result = await sql`
    SELECT id, email, full_name, restaurant_name, created_at
    FROM users
    WHERE id = ${Number(userId)}
  `
  if (result.length === 0) return null
  return result[0] as User
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const user = await getCurrentUserFromApiRoute(req)
  if (!user) {
    return res.status(401).json({ error: "No autenticado" })
  }

  try {
    // Traer todas las órdenes del usuario autenticado con sus items
    const orders = await sql`
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'category_id', oi.category_id
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ${user.id}
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `

    const formattedOrders = orders.map((order) => ({
      ...order,
      items: order.items?.[0]?.product_name ? order.items : [],
    }))

    return res.status(200).json(formattedOrders)
  } catch (error) {
    console.error("[API][orders][index] Error:", error)
    return res.status(500).json({ error: "Error al obtener las órdenes" })
  }
}
