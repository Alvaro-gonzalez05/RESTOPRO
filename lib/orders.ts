import { sql } from "./db"

export async function getOrderById(orderId: number, userId: number) {
  const orders = await sql(`SELECT * FROM orders WHERE id = $1 AND user_id = $2`, [orderId, userId])
  if (orders.length === 0) return null
  const order = orders[0]
  const items = await sql(`SELECT * FROM order_items WHERE order_id = $1`, [orderId])
  return { ...order, items }
}

export async function updateOrder(orderId: number, data: any, userId: number) {
  // Validar que la orden existe y pertenece al usuario
  const orders = await sql(`SELECT * FROM orders WHERE id = $1 AND user_id = $2`, [orderId, userId])
  if (orders.length === 0) return { success: false, error: "Orden no encontrada" }

  // Depuración: loggear el customer_id recibido
  console.log("[updateOrder] customer_id recibido:", data.customer_id, typeof data.customer_id)
  let customerId = data.customer_id;
  if (customerId === undefined || customerId === "" || Number.isNaN(Number(customerId))) customerId = null;
  else customerId = Number(customerId);

  // Actualizar datos principales
  await sql(`
    UPDATE orders SET
      customer_id = $1,
      customer_name = $2,
      table_number = $3,
      notes = $4,
      status = $5,
      payment_method_id = $6,
      total = $7,
      updated_at = NOW()
    WHERE id = $8
  `, [customerId, data.customer_name, data.table_number || null, data.notes || null, data.status, data.payment_method_id || null, data.total, orderId])

  // Eliminar items actuales
  await sql(`DELETE FROM order_items WHERE order_id = $1`, [orderId])

  // Insertar nuevos items
  for (const item of data.items) {
    await sql(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [orderId, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price])
  }

  return { success: true }
}
