"use server"

import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { PaymentMethod } from "@/lib/types"

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const user = await requireAuth()
  
  const result = await sql`
    SELECT * FROM payment_methods 
    WHERE user_id = ${user.id} AND is_active = true
    ORDER BY name ASC
  `
  
  return result as PaymentMethod[]
}

export async function createPaymentMethod(name: string): Promise<PaymentMethod> {
  const user = await requireAuth()
  
  const result = await sql`
    INSERT INTO payment_methods (user_id, name, is_active)
    VALUES (${user.id}, ${name}, true)
    RETURNING *
  `
  
  return result[0] as PaymentMethod
}

export async function deletePaymentMethod(id: number): Promise<void> {
  const user = await requireAuth()
  
  await sql`
    UPDATE payment_methods 
    SET is_active = false 
    WHERE id = ${id} AND user_id = ${user.id}
  `
}

export async function updatePaymentMethod(id: number, name: string): Promise<PaymentMethod> {
  const user = await requireAuth()
  
  const result = await sql`
    UPDATE payment_methods 
    SET name = ${name}
    WHERE id = ${id} AND user_id = ${user.id}
    RETURNING *
  `
  
  return result[0] as PaymentMethod
}
