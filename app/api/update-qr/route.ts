import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { WhatsAppBotManager } from '@/lib/whatsapp-bot-manager-real'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando generación de nuevo QR...')
    
    // Obtener usuario autenticado
    const user = await requireAuth()
    console.log(`👤 Usuario autenticado: ${user.id}`)
    
    // Crear instancia temporal para obtener QR real
    console.log('🤖 Creando instancia de bot...')
    const botInstance = await WhatsAppBotManager.createBotInstance(user.id)
    
    // Esperar hasta 15 segundos por el QR
    console.log('⏳ Esperando QR real...')
    const startTime = Date.now()
    while (!botInstance.qrCode && (Date.now() - startTime) < 15000) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    if (botInstance.qrCode) {
      console.log(`✅ QR real obtenido: ${botInstance.qrCode.length} caracteres`)
      console.log(`📄 QR preview: ${botInstance.qrCode.substring(0, 50)}...`)
      
      // Verificar si existe el bot del usuario
      const existingBot = await sql(
        'SELECT id FROM user_bots WHERE user_id = $1',
        [user.id]
      )
      
      if (existingBot.length === 0) {
        console.log('➕ Creando nuevo bot en base de datos...')
        await sql(
          'INSERT INTO user_bots (user_id, qr_code, status, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
          [user.id, botInstance.qrCode, 'connecting']
        )
      } else {
        console.log('🔄 Actualizando bot existente...')
        await sql(
          'UPDATE user_bots SET qr_code = $1, status = $2, updated_at = NOW() WHERE user_id = $3',
          [botInstance.qrCode, 'connecting', user.id]
        )
      }
      
      // Verificar que se guardó correctamente
      const updatedBot = await sql(
        'SELECT qr_code, status, updated_at FROM user_bots WHERE user_id = $1',
        [user.id]
      )
      
      console.log('✅ Verificación de guardado:', {
        qrLength: updatedBot[0]?.qr_code?.length,
        status: updatedBot[0]?.status,
        updatedAt: updatedBot[0]?.updated_at
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Nuevo QR generado y guardado correctamente',
        qrLength: botInstance.qrCode.length,
        qrPreview: botInstance.qrCode.substring(0, 50) + '...',
        savedCorrectly: updatedBot[0]?.qr_code === botInstance.qrCode
      })
    } else {
      console.log('❌ No se pudo obtener QR después de 15 segundos')
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo generar QR nuevo. Inténtalo de nuevo.' 
      })
    }
  } catch (error) {
    console.error('❌ Error generando nuevo QR:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    })
  }
}
