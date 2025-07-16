import { NextRequest, NextResponse } from "next/server"
import { calculateOrderPoints } from "@/app/actions/points-calc"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const points = await calculateOrderPoints(body)
  return NextResponse.json({ points })
}
