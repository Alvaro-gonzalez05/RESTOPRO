"use server"

import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"


export async function getCustomers(search: string = "") {
  const user = await requireAuth();
  const userId = user.id;
  if (search) {
    const result = await sql`
      SELECT id, name, phone, email, address, points FROM customers
      WHERE user_id = ${userId}
      AND (LOWER(name) LIKE ${"%" + search.toLowerCase() + "%"} OR phone LIKE ${"%" + search + "%"})
      ORDER BY name
    `;
    return result;
  } else {
    const result = await sql`
      SELECT id, name, phone, email, address, points FROM customers
      WHERE user_id = ${userId}
      ORDER BY name
    `;
    return result;
  }
}

export async function createCustomer({ name, phone, email, address }: { name: string; phone: string; email?: string; address?: string }) {
  const user = await requireAuth();
  const userId = user.id;
  const [customer] = await sql`
    INSERT INTO customers (user_id, name, phone, email, address, points, created_at)
    VALUES (${userId}, ${name}, ${phone}, ${email || null}, ${address || null}, 0, NOW())
    RETURNING id, name, phone, email, address, points
  `;
  return customer;
}

export async function updateCustomer({ id, name, phone, email, address }: { id: number; name: string; phone: string; email?: string; address?: string }) {
  const user = await requireAuth();
  const userId = user.id;
  const [customer] = await sql`
    UPDATE customers SET name = ${name}, phone = ${phone}, email = ${email || null}, address = ${address || null}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, name, phone, email, address, points
  `;
  return customer;
}

export async function deleteCustomer(id: number) {
  const user = await requireAuth();
  const userId = user.id;
  await sql`
    DELETE FROM customers WHERE id = ${id} AND user_id = ${userId}
  `;
  return { success: true };
}

export async function getCustomerLastOrder(customerId: number) {
  const user = await requireAuth();
  const userId = user.id;
  // Obtener la última orden del cliente, incluyendo productos
  const [order] = await sql`
    SELECT o.id, o.created_at, o.total, o.status,
      (
        SELECT json_agg(json_build_object('product_name', p.name, 'quantity', oi.quantity))
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = o.id
      ) AS items
    FROM orders o
    WHERE o.user_id = ${userId} AND o.customer_id = ${customerId}
    ORDER BY o.created_at DESC
    LIMIT 1
  `;
  return order;
}
