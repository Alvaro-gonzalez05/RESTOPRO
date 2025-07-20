"use server"

import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import type { Product, Category } from "@/lib/types"

export async function getProducts(): Promise<Product[]> {
  try {
    const user = await requireAuth()

    const result = await sql(`SELECT p.id, p.user_id, p.name, p.description, p.price, p.image_url, p.is_available, p.category_id, c.name as category_name, p.created_at FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.user_id = $1 ORDER BY p.created_at DESC`, [user.id])
    return result as Product[]
  } catch (error) {
    console.error("Error fetching products:", error)
    return []
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const user = await requireAuth()

    const result = await sql(`SELECT id, user_id, name, created_at FROM categories WHERE user_id = $1 ORDER BY name ASC`, [user.id])
    return result as Category[]
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}

export async function createProduct(prevState: any, formData: FormData) {
  try {
    const user = await requireAuth()

    const name = formData.get("name") as string
    const description = (formData.get("description") as string) || ""
    const price = Number.parseFloat(formData.get("price") as string)
    const categoryId = formData.get("categoryId") as string
    const imageUrl = (formData.get("imageUrl") as string) || ""
    const isAvailable = formData.get("isAvailable") === "on"

    if (!name || isNaN(price)) {
      return { error: "Nombre y precio son requeridos" }
    }

    const categoryIdValue =
      categoryId && categoryId !== "none" && categoryId !== "" ? Number.parseInt(categoryId) : null

    await sql(`INSERT INTO products (user_id, name, description, price, category_id, image_url, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [user.id, name, description, price, categoryIdValue, imageUrl, isAvailable])

    revalidatePath("/dashboard/productos")
    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    console.error("Error creating product:", error)
    return { error: "Error al crear el producto" }
  }
}

export async function createCategory(formData: FormData) {
  try {
    const user = await requireAuth()
    const name = formData.get("name") as string

    if (!name) {
      return { error: "El nombre es requerido" }
    }

    const existing = await sql(`SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND user_id = $2`, [name, user.id])

    if (existing.length > 0) {
      return { error: "Ya existe una categoría con ese nombre" }
    }

    const result = await sql(`INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id, user_id, name, created_at`, [user.id, name])

    revalidatePath("/dashboard/productos")
    revalidatePath("/dashboard/menu")
    return {
      success: true,
      category: result[0] as Category,
    }
  } catch (error) {
    console.error("Error creating category:", error)
    return { error: "Error al crear la categoría" }
  }
}

export async function updateProduct(id: number, formData: FormData) {
  try {
    const user = await requireAuth()

    const name = formData.get("name") as string
    const description = (formData.get("description") as string) || ""
    const price = Number.parseFloat(formData.get("price") as string)
    const categoryId = formData.get("categoryId") as string
    const imageUrl = (formData.get("imageUrl") as string) || ""
    const isAvailable = formData.get("isAvailable") === "on"

    if (!name || isNaN(price)) {
      return { error: "Nombre y precio son requeridos" }
    }

    const categoryIdValue =
      categoryId && categoryId !== "none" && categoryId !== "" ? Number.parseInt(categoryId) : null

    await sql(`UPDATE products SET name = $1, description = $2, price = $3, category_id = $4, image_url = $5, is_available = $6 WHERE id = $7 AND user_id = $8`, [name, description, price, categoryIdValue, imageUrl, isAvailable, id, user.id])

    revalidatePath("/dashboard/productos")
    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    console.error("Error updating product:", error)
    return { error: "Error al actualizar el producto" }
  }
}

export async function deleteProduct(id: number) {
  try {
    const user = await requireAuth()

    await sql(`DELETE FROM products WHERE id = $1 AND user_id = $2`, [id, user.id])

    revalidatePath("/dashboard/productos")
    revalidatePath("/dashboard/menu")
    return { success: true }
  } catch (error) {
    console.error("Error deleting product:", error)
    return { error: "Error al eliminar el producto" }
  }
}
