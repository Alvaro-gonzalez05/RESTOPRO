import { NextRequest, NextResponse } from 'next/server'
import { createTestBot } from '@/lib/test-bot'

export async function GET() {
  try {
    console.log('🧪 Iniciando test del bot...')
    
    const result = await createTestBot()
    
    if (result.qr) {
      console.log('✅ QR capturado exitosamente!')
      return NextResponse.json({ 
        success: true, 
        message: 'Bot de prueba iniciado con QR generado.',
        hasQR: true,
        qrLength: result.qr.length,
        qrPreview: result.qr.substring(0, 50) + '...'
      })
    } else {
      console.log('⚠️ Bot iniciado pero sin QR (posiblemente ya autenticado)')
      return NextResponse.json({ 
        success: true, 
        message: 'Bot de prueba iniciado pero ya está autenticado.',
        hasQR: false
      })
    }
    
  } catch (error) {
    console.error('❌ Error en test bot:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Error iniciando bot de prueba',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
