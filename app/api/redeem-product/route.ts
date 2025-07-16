import { NextRequest } from "next/server"
import { sql } from "@/lib/db"


export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customer_id, product_id, order_id, quantity } = body;
  console.log('REDEEM PRODUCT BODY:', body);
  if (!customer_id || !product_id || !order_id || !quantity) {
    console.log('FALTAN DATOS', { customer_id, product_id, order_id, quantity });
    return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
  }

  // Obtener puntos necesarios para canjeo
  const [config] = await sql`SELECT redeem_points FROM points_config WHERE product_id = ${product_id}`;
  if (!config || !config.redeem_points) {
    console.log('PRODUCTO NO CANJEABLE', { product_id, config });
    return new Response(JSON.stringify({ error: "Producto no canjeable" }), { status: 400 });
  }

  // Obtener cantidad disponible en la orden
  const [orderItem] = await sql`SELECT quantity, redeemed_quantity FROM order_items WHERE order_id = ${order_id} AND product_id = ${product_id}`;
  if (!orderItem) {
    console.log('PRODUCTO NO ENCONTRADO EN LA ORDEN', { order_id, product_id });
    return new Response(JSON.stringify({ error: "Producto no encontrado en la orden" }), { status: 400 });
  }
  const maxCanjeable = orderItem.quantity - (orderItem.redeemed_quantity || 0);
  if (quantity > maxCanjeable) {
    console.log('CANTIDAD SUPERA DISPONIBLE', { quantity, maxCanjeable, orderItem });
    return new Response(JSON.stringify({ error: "No puedes canjear más de lo disponible" }), { status: 400 });
  }

  // Obtener puntos actuales del cliente (solo para validar, no restar aún)
  const [customer] = await sql`SELECT points FROM customers WHERE id = ${customer_id}`;
  const totalPointsNeeded = config.redeem_points * quantity;
  if (!customer || (customer.points ?? 0) < totalPointsNeeded) {
    console.log('PUNTOS INSUFICIENTES', { customer, totalPointsNeeded, config, quantity });
    return new Response(JSON.stringify({ error: "Puntos insuficientes" }), { status: 400 });
  }

  // Solo actualizar redeemed_quantity en la orden (no restar puntos todavía)
  await sql`UPDATE order_items SET redeemed_quantity = COALESCE(redeemed_quantity,0) + ${quantity} WHERE order_id = ${order_id} AND product_id = ${product_id}`;

  return new Response(JSON.stringify({ success: true, message: `Canjeaste ${quantity} unidad${quantity > 1 ? 'es' : ''} exitosamente` }), { status: 200 });
}
