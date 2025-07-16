"use server"

import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

// Calcula los puntos a ganar para una orden específica
export async function calculateOrderPoints({ customer_id, items, total }: { customer_id?: number, items: { product_id: number, quantity: number }[], total: number }) {
  const user = await requireAuth();
  const userId = user.id;
  if (!customer_id) return 0;
  // Obtener configuración de puntos
  const configs = await sql`SELECT * FROM points_config WHERE user_id = ${userId}`;
  let points = 0;
  // Puntos por producto
  for (const item of items) {
    const prodConfig = configs.find((c: any) => c.product_id === item.product_id && c.points);
    if (prodConfig) {
      points += prodConfig.points * item.quantity;
      continue;
    }
    // Si no hay config por producto, buscar por categoría
    const catConfig = configs.find((c: any) => c.category_id && c.points && c.category_id === item.category_id);
    if (catConfig) {
      points += catConfig.points * item.quantity;
    }
  }
  // Puntos por compra grande
  const bigConfig = configs.find((c: any) => c.big_purchase_threshold && c.big_purchase_points);
  if (bigConfig && total >= Number(bigConfig.big_purchase_threshold)) {
    points += Number(bigConfig.big_purchase_points);
  }
  // Puntos de bienvenida (solo si es la primera orden, aquí no se calcula)
  return points;
}

// Obtiene los puntos actuales del cliente
export async function getCustomerPoints(customer_id: number) {
  const user = await requireAuth();
  const userId = user.id;
  const [customer] = await sql`SELECT points FROM customers WHERE id = ${customer_id} AND user_id = ${userId}`;
  return customer?.points || 0;
}
