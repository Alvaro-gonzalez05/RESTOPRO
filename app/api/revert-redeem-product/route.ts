import { NextRequest } from "next/server"
import { sql } from "@/lib/db"

// Forzar renderizado dinámico para API routes
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { order_id, product_id, quantity } = body;
  if (!order_id || !product_id || !quantity) {
    return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
  }
  // Restar la cantidad canjeada en redeemed_quantity
  await sql(`UPDATE order_items SET redeemed_quantity = GREATEST(COALESCE(redeemed_quantity,0) - $1, 0) WHERE order_id = $2 AND product_id = $3`, [quantity, order_id, product_id]);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
