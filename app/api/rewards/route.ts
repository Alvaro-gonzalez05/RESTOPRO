import { NextRequest, NextResponse } from "next/server"
import { getRewardOptions, createRewardOption, deleteRewardOption, redeemReward } from "@/lib/rewards"
import { requireAuth } from "@/lib/auth"

// Forzar renderizado dinámico para API routes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const rewards = await getRewardOptions(user.id)
    return NextResponse.json(rewards)
  } catch (error) {
    console.error("[API][rewards] GET error:", error)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { name, points_cost, description } = await request.json()
    
    if (!name || !points_cost) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
    }
    
    const reward = await createRewardOption({ user_id: user.id, name, points_cost, description })
    return NextResponse.json(reward, { status: 201 })
  } catch (error) {
    console.error("[API][rewards] POST error:", error)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { id } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 })
    }
    
    await deleteRewardOption(id, user.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[API][rewards] DELETE error:", error)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { customer_id, reward_id } = await request.json()
    
    if (!customer_id || !reward_id) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
    }
    
    const result = await redeemReward({ customer_id, reward_id })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[API][rewards] PUT error:", error)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }
}
