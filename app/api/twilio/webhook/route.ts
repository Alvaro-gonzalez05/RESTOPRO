// app/api/twilio/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { processIncomingMessage } from '@/app/actions/chatbot-ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)
    
    const messageSid = params.get('MessageSid')
    const from = params.get('From') || ''
    const to = params.get('To') || ''
    const messageBody = params.get('Body') || ''
    const messageStatus = params.get('SmsStatus') || 'received'

    console.log('Twilio webhook received:', {
      messageSid,
      from,
      to,
      body: messageBody,
      status: messageStatus
    })

    // Buscar las credenciales del usuario basado en el número de WhatsApp
    const userCredentials = await sql(`
      SELECT user_id FROM twilio_credentials 
      WHERE whatsapp_number = $1
    `, [to.replace('whatsapp:', '')])

    if (userCredentials.length === 0) {
      console.error('No user found for WhatsApp number:', to)
      // Por ahora usar userId = 2 como fallback
      const userId = 2
      await processIncomingMessage(userId, from, messageBody)
    } else {
      const userId = userCredentials[0].user_id
      await processIncomingMessage(userId, from, messageBody)
    }

    // Responder con TwiML vacío (Twilio espera una respuesta XML)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
       <Response></Response>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      }
    )
  } catch (error) {
    console.error('Twilio webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Twilio webhook endpoint',
    status: 'active' 
  })
}
