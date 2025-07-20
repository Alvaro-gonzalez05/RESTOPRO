"use server"

import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"


export async function getCustomers(search: string = "") {
  const user = await requireAuth();
  const userId = user.id;
  if (search) {
    const result = await sql(`SELECT id, name, phone, email, address, points FROM customers WHERE user_id = $1 AND (LOWER(name) LIKE $2 OR phone LIKE $3) ORDER BY name`, [userId, "%" + search.toLowerCase() + "%", "%" + search + "%"]);
    return result;
  } else {
    const result = await sql(`SELECT id, name, phone, email, address, points FROM customers WHERE user_id = $1 ORDER BY name`, [userId]);
    return result;
  }
}

export async function createCustomer(data: any) {
  try {
    const user = await requireAuth();
    const userId = user.id;
    
    const [customer] = await sql(
      `INSERT INTO customers (user_id, name, phone, email, address, points, notes, created_at) 
       VALUES ($1, $2, $3, $4, $5, 0, $6, NOW()) 
       RETURNING id, name, phone, email, address, points, notes`,
      [userId, data.name, data.phone || null, data.email || null, data.address || null, data.notes || null]
    );
    
    return { success: true, customer };
  } catch (error) {
    console.error("Error creating customer:", error);
    return { success: false, error: "Error al crear cliente" };
  }
}

// Mantener la función original para compatibilidad
export async function createCustomerLegacy({ name, phone, email, address }: { name: string; phone: string; email?: string; address?: string }) {
  const user = await requireAuth();
  const userId = user.id;
  const [customer] = await sql(`INSERT INTO customers (user_id, name, phone, email, address, points, created_at) VALUES ($1, $2, $3, $4, $5, 0, NOW()) RETURNING id, name, phone, email, address, points`, [userId, name, phone, email || null, address || null]);
  return customer;
}

export async function updateCustomer({ id, name, phone, email, address }: { id: number; name: string; phone: string; email?: string; address?: string }) {
  const user = await requireAuth();
  const userId = user.id;
  const [customer] = await sql(`UPDATE customers SET name = $1, phone = $2, email = $3, address = $4 WHERE id = $5 AND user_id = $6 RETURNING id, name, phone, email, address, points`, [name, phone, email || null, address || null, id, userId]);
  return customer;
}

export async function deleteCustomer(id: number) {
  const user = await requireAuth();
  const userId = user.id;
  await sql(`DELETE FROM customers WHERE id = $1 AND user_id = $2`, [id, userId]);
  return { success: true };
}

export async function getCustomerLastOrder(customerId: number) {
  const user = await requireAuth();
  const userId = user.id;
  // Obtener la última orden del cliente, incluyendo productos
  const [order] = await sql(`SELECT o.id, o.created_at, o.total, o.status, ( SELECT json_agg(json_build_object('product_name', p.name, 'quantity', oi.quantity)) FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id ) AS items FROM orders o WHERE o.user_id = $1 AND o.customer_id = $2 ORDER BY o.created_at DESC LIMIT 1`, [userId, customerId]);
  return order;
}
