import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function getOrderById(orderId: number, userId: number) {
  const [order] = await sql`SELECT * FROM orders WHERE id = ${orderId} AND user_id = ${userId}`
  if (!order) return null
  const items = await sql`SELECT * FROM order_items WHERE order_id = ${orderId}`
  return { ...order, items }
}

export async function updateOrder(orderId: number, data: any, userId: number) {
  // Validar que la orden existe y pertenece al usuario
  const [order] = await sql`SELECT * FROM orders WHERE id = ${orderId} AND user_id = ${userId}`
  if (!order) return { success: false, error: "Orden no encontrada" }

  // Depuración: loggear el customer_id recibido
  console.log("[updateOrder] customer_id recibido:", data.customer_id, typeof data.customer_id)
  let customerId = data.customer_id;
  if (customerId === undefined || customerId === "" || Number.isNaN(Number(customerId))) customerId = null;
  else customerId = Number(customerId);

  // Actualizar datos principales
  await sql`
    UPDATE orders SET
      customer_id = ${customerId},
      customer_name = ${data.customer_name},
      table_number = ${data.table_number || null},
      notes = ${data.notes || null},
      status = ${data.status},
      payment_method_id = ${data.payment_method_id || null},
      total = ${data.total},
      updated_at = NOW()
    WHERE id = ${orderId}
  `

  // Eliminar items actuales
  await sql`DELETE FROM order_items WHERE order_id = ${orderId}`

  // Insertar nuevos items
  for (const item of data.items) {
    await sql`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
      VALUES (${orderId}, ${item.product_id}, ${item.product_name}, ${item.quantity}, ${item.unit_price}, ${item.total_price})
    `
  }

  return { success: true }
}
