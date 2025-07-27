import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { WhatsAppBotManager } from '@/lib/whatsapp-bot-manager-real'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 TESTING: Generando QR sin autenticación...')
    
    // Para testing, usar user_id = 2 (el que vimos en la base de datos)
    const userId = 2
    console.log(`👤 Usando usuario: ${userId}`)
    
    // Crear instancia temporal para obtener QR real
    console.log('🤖 Creando instancia de bot...')
    const botInstance = await WhatsAppBotManager.createBotInstance(userId)
    
    // Esperar hasta 15 segundos por el QR
    console.log('⏳ Esperando QR real...')
    const startTime = Date.now()
    let attempts = 0
    while (!botInstance.qrCode && (Date.now() - startTime) < 15000) {
      await new Promise(resolve => setTimeout(resolve, 500))
      attempts++
      if (attempts % 10 === 0) {
        console.log(`⏳ Esperando QR... intento ${attempts}`)
      }
    }
    
    if (botInstance.qrCode) {
      console.log(`✅ QR real obtenido: ${botInstance.qrCode.length} caracteres`)
      console.log(`📄 QR preview: ${botInstance.qrCode.substring(0, 50)}...`)
      
      // Verificar si existe el bot del usuario
      const existingBot = await sql(
        'SELECT id FROM user_bots WHERE user_id = $1',
        [userId]
      )
      
      if (existingBot.length === 0) {
        console.log('➕ Creando nuevo bot en base de datos...')
        await sql(
          'INSERT INTO user_bots (user_id, qr_code, status, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
          [userId, botInstance.qrCode, 'connecting']
        )
      } else {
        console.log('🔄 Actualizando bot existente...')
        await sql(
          'UPDATE user_bots SET qr_code = $1, status = $2, updated_at = NOW() WHERE user_id = $3',
          [botInstance.qrCode, 'connecting', userId]
        )
      }
      
      // Verificar que se guardó correctamente
      const updatedBot = await sql(
        'SELECT qr_code, status, updated_at FROM user_bots WHERE user_id = $1',
        [userId]
      )
      
      console.log('✅ Verificación de guardado:', {
        qrLength: updatedBot[0]?.qr_code?.length,
        status: updatedBot[0]?.status,
        updatedAt: updatedBot[0]?.updated_at
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Nuevo QR generado y guardado correctamente (TESTING)',
        qrLength: botInstance.qrCode.length,
        qrPreview: botInstance.qrCode.substring(0, 50) + '...',
        savedCorrectly: updatedBot[0]?.qr_code === botInstance.qrCode,
        userId: userId
      })
    } else {
      console.log('❌ No se pudo obtener QR después de 15 segundos')
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo generar QR nuevo después de 15 segundos. Inténtalo de nuevo.',
        attempts: attempts
      })
    }
  } catch (error) {
    console.error('❌ Error generando nuevo QR:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
