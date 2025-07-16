import type { NextApiRequest, NextApiResponse } from "next"
import { sql } from "@/lib/db"
import { updateOrder, getOrderById } from "@/lib/orders"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log cookies y método
  console.log("[API][orders] method:", req.method)
  console.log("[API][orders] cookies:", req.cookies)
  // Log el header cookie crudo
  console.log("[API][orders] raw cookie header:", req.headers.cookie)

  // Leer user_id de la cookie
  const userId = req.cookies["user_id"]
  if (!userId) return res.status(401).json({ error: "No autenticado" })
  // Buscar usuario en la base de datos
  let user = null
  try {
    const result = await sql`
      SELECT id, email, full_name, restaurant_name, created_at
      FROM users
      WHERE id = ${Number(userId)}
    `
    if (result.length > 0) user = result[0]
  } catch (e) {
    console.error("[API][orders] error buscando usuario:", e)
    return res.status(500).json({ error: "Error interno de usuario" })
  }
  if (!user) return res.status(401).json({ error: "No autenticado" })

  const {
    query: { id },
    method,
    body
  } = req

  if (typeof id !== "string") return res.status(400).json({ error: "ID inválido" })


  if (method === "GET") {
    // Obtener una orden específica
    const order = await getOrderById(Number(id), user.id)
    if (!order) return res.status(404).json({ error: "Orden no encontrada" })
    return res.status(200).json(order)
  }


  if (method === "PUT") {
    // Actualizar una orden existente
    const result = await updateOrder(Number(id), body, user.id)
    if (result.success) {
      return res.status(200).json({ success: true })
    } else {
      return res.status(400).json({ error: result.error || "Error al actualizar la orden" })
    }
  }

  if (method === "DELETE") {
    // Eliminar una orden (opcional, si se requiere)
    // ...
    return res.status(405).json({ error: "No implementado" })
  }

  return res.status(405).json({ error: "Método no permitido" })
}
