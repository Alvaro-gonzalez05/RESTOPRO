import { NextRequest, NextResponse } from "next/server"
import { calculateOrderPoints } from "@/app/actions/points-calc"

// Forzar renderizado dinámico para API routes
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const points = await calculateOrderPoints(body)
  return NextResponse.json({ points })
}
