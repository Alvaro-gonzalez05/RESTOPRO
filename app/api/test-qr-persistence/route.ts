import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Obtener todos los bots para verificar persistencia
    const bots = await sql('SELECT user_id, status, LENGTH(qr_code) as qr_length, updated_at FROM user_bots ORDER BY updated_at DESC')
    
    return NextResponse.json({ 
      success: true,
      message: 'Estado de QR en base de datos',
      bots: bots.map(bot => ({
        user_id: bot.user_id,
        status: bot.status,
        qr_length: bot.qr_length,
        updated_at: bot.updated_at,
        has_qr: bot.qr_length > 0
      }))
    })
  } catch (error) {
    console.error('Error verificando QR:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error verificando persistencia' 
    })
  }
}
