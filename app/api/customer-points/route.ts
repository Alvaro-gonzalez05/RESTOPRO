import { NextRequest, NextResponse } from "next/server"
import { getCustomerPoints } from "@/app/actions/points-calc"

// Forzar renderizado dinámico para API routes
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const customer_id = Number(req.nextUrl.searchParams.get("customer_id"))
  if (!customer_id) return NextResponse.json({ points: 0 })
  const points = await getCustomerPoints(customer_id)
  return NextResponse.json({ points })
}
