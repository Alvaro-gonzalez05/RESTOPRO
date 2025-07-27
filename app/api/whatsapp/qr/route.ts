import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Obtener el QR code del usuario desde la base de datos
    const result = await sql(
      'SELECT qr_code, status, phone_number FROM user_bots WHERE user_id = $1',
      [user.id]
    )

    if (result.length === 0) {
      return Response.json({ 
        qrCode: null, 
        message: 'No hay bot configurado. Configura tu bot primero.',
        needsSetup: true
      })
    }

    const bot = result[0]

    // Si ya está conectado, no necesita QR
    if (bot.status === 'connected' && bot.phone_number) {
      return Response.json({ 
        qrCode: null,
        message: `Bot conectado al número ${bot.phone_number}`,
        isConnected: true,
        success: true
      })
    }

    // Si tiene QR pendiente
    if (bot.qr_code) {
      return Response.json({ 
        qrCode: bot.qr_code,
        message: 'Escanea el código QR con WhatsApp',
        success: true 
      })
    }

    // Si no tiene QR, el bot necesita ser iniciado
    return Response.json({ 
      qrCode: null,
      message: 'Inicia el bot para generar el código QR',
      needsStart: true,
      success: true
    })

  } catch (error) {
    console.error('Error obteniendo QR:', error)
    return Response.json({ 
      success: false, 
      error: 'Error obteniendo QR code' 
    }, { status: 500 })
  }
}
