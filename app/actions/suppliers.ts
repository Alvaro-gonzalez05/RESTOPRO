"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function getSuppliers() {
  try {
    const user = await requireAuth()
    const suppliers = await sql(
      "SELECT * FROM suppliers WHERE user_id = $1 ORDER BY name ASC",
      [user.id]
    )
    return suppliers
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return []
  }
}

export async function createSupplier(data: any) {
  try {
    const user = await requireAuth()
    
    const [supplier] = await sql(
      `INSERT INTO suppliers (user_id, name, email, phone, address, contact_person, notes, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
       RETURNING id`,
      [user.id, data.name, data.email || null, data.phone || null, data.address || null, data.contact_person || null, data.notes || null]
    )

    revalidatePath("/dashboard/proveedores")
    return { success: true, supplierId: supplier.id }
  } catch (error) {
    console.error("Error creating supplier:", error)
    return { success: false, error: "Error al crear proveedor" }
  }
}

export async function updateSupplier(id: number, data: any) {
  try {
    const user = await requireAuth()
    
    await sql(
      `UPDATE suppliers 
       SET name = $1, email = $2, phone = $3, address = $4, contact_person = $5, notes = $6, updated_at = NOW()
       WHERE id = $7 AND user_id = $8`,
      [data.name, data.email || null, data.phone || null, data.address || null, data.contact_person || null, data.notes || null, id, user.id]
    )

    revalidatePath("/dashboard/proveedores")
    return { success: true }
  } catch (error) {
    console.error("Error updating supplier:", error)
    return { success: false, error: "Error al actualizar proveedor" }
  }
}

export async function deleteSupplier(id: number) {
  try {
    const user = await requireAuth()
    
    await sql(
      "DELETE FROM suppliers WHERE id = $1 AND user_id = $2",
      [id, user.id]
    )

    revalidatePath("/dashboard/proveedores")
    return { success: true }
  } catch (error) {
    console.error("Error deleting supplier:", error)
    return { success: false, error: "Error al eliminar proveedor" }
  }
}
