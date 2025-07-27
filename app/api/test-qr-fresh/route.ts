import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppBotManager } from '@/lib/whatsapp-bot-manager-real'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Generando QR fresco para testing...')
    
    // Crear instancia temporal para obtener QR
    const botInstance = await WhatsAppBotManager.createBotInstance(99999) // Usuario temporal
    
    // Esperar hasta 15 segundos por el QR
    const startTime = Date.now()
    while (!botInstance.qrCode && (Date.now() - startTime) < 15000) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    if (botInstance.qrCode) {
      console.log(`✅ QR generado exitosamente!`)
      console.log(`📱 QR Length: ${botInstance.qrCode.length}`)
      console.log(`📱 QR completo: ${botInstance.qrCode}`)
      
      return NextResponse.json({ 
        success: true, 
        qrCode: botInstance.qrCode,
        length: botInstance.qrCode.length,
        preview: botInstance.qrCode.substring(0, 100) + '...'
      })
    } else {
      console.log('⏰ Timeout esperando QR')
      return NextResponse.json({ 
        success: false, 
        error: 'Timeout esperando QR' 
      })
    }
  } catch (error) {
    console.error('❌ Error generando QR:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    })
  }
}
