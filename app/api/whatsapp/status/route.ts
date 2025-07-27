import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Obtener estado del bot del usuario desde la base de datos
    const result = await sql(
      'SELECT id, status, qr_code, phone_number, ai_enabled FROM user_bots WHERE user_id = $1',
      [user.id]
    )

    if (result.length === 0) {
      return Response.json({ 
        botExists: false,
        status: 'disconnected',
        qrCode: null 
      })
    }

    const bot = result[0]
    
    return Response.json({ 
      botExists: true,
      status: bot.status,
      qrCode: bot.qr_code,
      phoneNumber: bot.phone_number,
      aiEnabled: bot.ai_enabled,
      success: true 
    })
  } catch (error) {
    console.error('Error obteniendo estado del bot:', error)
    return Response.json({ 
      success: false, 
      error: 'Error obteniendo estado del bot' 
    }, { status: 500 })
  }
}
