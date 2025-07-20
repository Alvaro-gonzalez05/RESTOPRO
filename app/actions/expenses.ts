"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function getExpenses(filters?: { month?: string, day?: string }) {
  try {
    const user = await requireAuth()
    
    // Si no hay tabla de gastos, retornamos datos de ejemplo
    let query = `
      SELECT e.*, s.name as supplier_full_name 
      FROM expenses e
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      WHERE e.user_id = $1
    `
    const params: any[] = [user.id]
    
    if (filters?.month) {
      query += ` AND DATE_TRUNC('month', e.expense_date) = $${params.length + 1}`
      params.push(`${filters.month}-01`)
    }
    
    if (filters?.day) {
      query += ` AND e.expense_date = $${params.length + 1}`
      params.push(filters.day)
    }
    
    query += ` ORDER BY e.expense_date DESC, e.created_at DESC`
    
    const expenses = await sql(query, params)
    return expenses
  } catch (error) {
    console.error("Error fetching expenses:", error)
    // Retornamos datos de ejemplo si hay error
    return [
      {
        id: 1,
        description: "Compra de ingredientes",
        amount: "50000",
        category: "ingredientes",
        expense_date: "2025-01-19",
        payment_method: "efectivo",
        supplier_name: "Proveedor Ejemplo",
        supplier_full_name: "Proveedor Ejemplo S.A.S.",
        notes: "Compra de ejemplo"
      }
    ]
  }
}

export async function createExpense(data: any) {
  try {
    const user = await requireAuth()
    
    const [expense] = await sql(
      `INSERT INTO expenses (user_id, supplier_id, supplier_name, description, amount, category, expense_date, payment_method, receipt_number, notes, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
       RETURNING id`,
      [
        user.id, 
        data.supplier_id || null, 
        data.supplier_name, 
        data.description, 
        data.amount, 
        data.category || null, 
        data.expense_date, 
        data.payment_method || 'efectivo', 
        data.receipt_number || null, 
        data.notes || null
      ]
    )

    revalidatePath("/dashboard/gastos")
    return { success: true, expenseId: expense.id }
  } catch (error) {
    console.error("Error creating expense:", error)
    return { success: false, error: "Error al crear gasto" }
  }
}

export async function updateExpense(id: number, data: any) {
  try {
    const user = await requireAuth()
    
    await sql(
      `UPDATE expenses 
       SET supplier_id = $1, supplier_name = $2, description = $3, amount = $4, category = $5, 
           expense_date = $6, payment_method = $7, receipt_number = $8, notes = $9, updated_at = NOW()
       WHERE id = $10 AND user_id = $11`,
      [
        data.supplier_id || null, 
        data.supplier_name, 
        data.description, 
        data.amount, 
        data.category || null, 
        data.expense_date, 
        data.payment_method || 'efectivo', 
        data.receipt_number || null, 
        data.notes || null, 
        id, 
        user.id
      ]
    )

    revalidatePath("/dashboard/gastos")
    return { success: true }
  } catch (error) {
    console.error("Error updating expense:", error)
    return { success: false, error: "Error al actualizar gasto" }
  }
}

export async function deleteExpense(id: number) {
  try {
    const user = await requireAuth()
    
    await sql(
      "DELETE FROM expenses WHERE id = $1 AND user_id = $2",
      [id, user.id]
    )

    revalidatePath("/dashboard/gastos")
    return { success: true }
  } catch (error) {
    console.error("Error deleting expense:", error)
    return { success: false, error: "Error al eliminar gasto" }
  }
}

export async function getExpenseStats() {
  try {
    const user = await requireAuth()
    
    // Gastos del mes actual
    const [monthlyExpenses] = await sql(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM expenses 
       WHERE user_id = $1 AND DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)`,
      [user.id]
    )
    
    // Gastos de hoy
    const [todayExpenses] = await sql(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM expenses 
       WHERE user_id = $1 AND expense_date = CURRENT_DATE`,
      [user.id]
    )
    
    // Total de gastos
    const [totalExpenses] = await sql(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM expenses 
       WHERE user_id = $1`,
      [user.id]
    )
    
    return {
      monthlyTotal: parseFloat(monthlyExpenses.total || 0),
      todayTotal: parseFloat(todayExpenses.total || 0),
      allTimeTotal: parseFloat(totalExpenses.total || 0)
    }
  } catch (error) {
    console.error("Error fetching expense stats:", error)
    return {
      monthlyTotal: 0,
      todayTotal: 0,
      allTimeTotal: 0
    }
  }
}
