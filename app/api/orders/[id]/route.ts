import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { cookies } from "next/headers"
import { updateOrder, getOrderById } from "@/lib/orders"

// Forzar renderizado dinámico para API routes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const userId = cookieStore.get("user_id")?.value
    
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Verificar que el usuario existe
    const users = await sql("SELECT id FROM users WHERE id = $1", [Number(userId)])
    if (users.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 })
    }

    const user = users[0]
    const orderId = Number(params.id)

    // Obtener una orden específica
    const order = await getOrderById(orderId, user.id)
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
    }
    
    return NextResponse.json(order)
  } catch (error) {
    console.error("[API][orders][id] GET Error:", error)
    return NextResponse.json({ error: "Error al obtener la orden" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const userId = cookieStore.get("user_id")?.value
    
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Verificar que el usuario existe
    const users = await sql("SELECT id FROM users WHERE id = $1", [Number(userId)])
    if (users.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 })
    }

    const user = users[0]
    const orderId = Number(params.id)
    const body = await request.json()

    // Actualizar una orden existente
    const result = await updateOrder(orderId, body, user.id)
    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.error || "Error al actualizar la orden" }, { status: 400 })
    }
  } catch (error) {
    console.error("[API][orders][id] PUT Error:", error)
    return NextResponse.json({ error: "Error al actualizar la orden" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const userId = cookieStore.get("user_id")?.value
    
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Verificar que el usuario existe
    const users = await sql("SELECT id FROM users WHERE id = $1", [Number(userId)])
    if (users.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 })
    }

    const orderId = Number(params.id)

    // Eliminar orden y sus items
    await sql("DELETE FROM order_items WHERE order_id = $1", [orderId])
    await sql("DELETE FROM orders WHERE id = $1 AND user_id = $2", [orderId, Number(userId)])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API][orders][id] DELETE Error:", error)
    return NextResponse.json({ error: "Error al eliminar la orden" }, { status: 500 })
  }
}
