import { NextRequest } from "next/server"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const customer_id = searchParams.get("customer_id")
  if (!customer_id) return new Response(JSON.stringify({ error: "Falta customer_id" }), { status: 400 })

  // Obtener puntos del cliente
  const customers = await sql(`SELECT points FROM customers WHERE id = $1`, [customer_id])
  if (customers.length === 0) return new Response(JSON.stringify({ error: "Cliente no encontrado" }), { status: 404 })
  const customer = customers[0]
  const points = customer.points || 0

  // Obtener todos los productos canjeables (sin filtrar por puntos)
  const products = await sql(`
    SELECT p.id, p.name, p.price, pc.redeem_points
    FROM products p
    JOIN points_config pc ON pc.product_id = p.id
    WHERE pc.redeem_points > 0
  `);
  
  // Devolver también los puntos actuales del cliente
  return new Response(JSON.stringify({ products, points }), { status: 200 });
}
