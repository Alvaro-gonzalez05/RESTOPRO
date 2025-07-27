import { NextRequest, NextResponse } from 'next/server'
import { createTestBot } from '@/lib/test-bot'

export async function GET() {
  try {
    console.log('🔄 Generando QR fresco...')
    
    // Eliminar cualquier sesión anterior para forzar nuevo QR
    const fs = require('fs')
    const path = require('path')
    const authPath = path.join(process.cwd(), 'auth-sessions', 'session-fresh')
    
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true })
    }
    
    // Crear bot temporal para generar QR fresco con sesión única
    const sessionName = `session-fresh-${Date.now()}`
    const result = await createTestBot(sessionName)
    
    if (result.qr) {
      console.log('✅ QR fresco generado!')
      return NextResponse.json({ 
        success: true, 
        qr: result.qr,
        timestamp: Date.now(),
        message: 'QR fresco generado. Escanea inmediatamente!'
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo generar QR fresco'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Error generando QR fresco:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
