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
  const configs = await sql(`SELECT redeem_points FROM points_config WHERE product_id = $1`, [product_id]);
  if (configs.length === 0 || !configs[0].redeem_points) {
    console.log('PRODUCTO NO CANJEABLE', { product_id, config: configs[0] });
    return new Response(JSON.stringify({ error: "Producto no canjeable" }), { status: 400 });
  }
  const config = configs[0];

  // Obtener cantidad disponible en la orden
  const orderItems = await sql(`SELECT quantity, redeemed_quantity FROM order_items WHERE order_id = $1 AND product_id = $2`, [order_id, product_id]);
  if (orderItems.length === 0) {
    console.log('PRODUCTO NO ENCONTRADO EN LA ORDEN', { order_id, product_id });
    return new Response(JSON.stringify({ error: "Producto no encontrado en la orden" }), { status: 400 });
  }
  const orderItem = orderItems[0];
  const maxCanjeable = orderItem.quantity - (orderItem.redeemed_quantity || 0);
  if (quantity > maxCanjeable) {
    console.log('CANTIDAD SUPERA DISPONIBLE', { quantity, maxCanjeable, orderItem });
    return new Response(JSON.stringify({ error: "No puedes canjear más de lo disponible" }), { status: 400 });
  }

  // Obtener puntos actuales del cliente (solo para validar, no restar aún)
  const customers = await sql(`SELECT points FROM customers WHERE id = $1`, [customer_id]);
  const totalPointsNeeded = config.redeem_points * quantity;
  if (customers.length === 0 || (customers[0].points ?? 0) < totalPointsNeeded) {
    console.log('PUNTOS INSUFICIENTES', { customer: customers[0], totalPointsNeeded, config, quantity });
    return new Response(JSON.stringify({ error: "Puntos insuficientes" }), { status: 400 });
  }

  // Solo actualizar redeemed_quantity en la orden (no restar puntos todavía)
  await sql(`UPDATE order_items SET redeemed_quantity = COALESCE(redeemed_quantity,0) + $1 WHERE order_id = $2 AND product_id = $3`, [quantity, order_id, product_id]);

  return new Response(JSON.stringify({ success: true, message: `Canjeaste ${quantity} unidad${quantity > 1 ? 'es' : ''} exitosamente` }), { status: 200 });
}
