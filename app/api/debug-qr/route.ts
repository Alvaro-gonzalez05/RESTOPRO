import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Sin autenticación para test - usar usuario 2 por defecto
    const userId = 2
    
    // Obtener el QR code del usuario desde la base de datos
    const result = await sql(
      'SELECT qr_code, status, phone_number FROM user_bots WHERE user_id = $1',
      [userId]
    )

    if (result.length === 0) {
      return Response.json({ 
        qrCode: null, 
        message: 'No hay bot configurado',
        needsSetup: true,
        dbResult: 'no_bot'
      })
    }

    const bot = result[0]

    return Response.json({ 
      qrCode: bot.qr_code,
      status: bot.status,
      phone_number: bot.phone_number,
      qrLength: bot.qr_code ? bot.qr_code.length : 0,
      qrPreview: bot.qr_code ? bot.qr_code.substring(0, 50) + '...' : null,
      dbResult: 'found'
    })

  } catch (error) {
    console.error('Error obteniendo QR desde DB:', error)
    return Response.json({ 
      success: false, 
      error: 'Error obteniendo QR code',
      dbResult: 'error'
    }, { status: 500 })
  }
}
