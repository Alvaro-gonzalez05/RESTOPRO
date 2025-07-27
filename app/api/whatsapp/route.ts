import { NextRequest, NextResponse } from 'next/server'
import { connectWhatsApp, disconnectWhatsApp, getWhatsAppConnection } from '@/app/actions/chatbot'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()

    if (action === 'connect') {
      const result = await connectWhatsApp(user.id)
      if (result.success) {
        return NextResponse.json({ status: result.data.status, qrCode: result.data.qr_code, phoneNumber: result.data.phone_number })
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
    } else if (action === 'disconnect') {
      const result = await disconnectWhatsApp(user.id)
      if (result.success) {
        return NextResponse.json({ status: 'disconnected' })
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('WhatsApp API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connection = await getWhatsAppConnection(user.id)
    return NextResponse.json(connection)
  } catch (error) {
    console.error('WhatsApp API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
