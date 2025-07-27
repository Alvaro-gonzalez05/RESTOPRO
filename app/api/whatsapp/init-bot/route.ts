import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sql } from '@/lib/db'
import { WhatsAppBotManager } from '@/lib/whatsapp-bot-manager-real'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    console.log(`🔧 Inicializando bot para usuario ${user.id}`)

    // Verificar si ya existe un bot
    const existingBot = await sql(
      'SELECT id FROM user_bots WHERE user_id = $1',
      [user.id]
    )

    if (existingBot.length > 0) {
      console.log('⚠️ Bot ya existe, iniciando instancia...')
      
      // Crear instancia del bot
      const botInstance = await WhatsAppBotManager.createBotInstance(user.id)
      
      // Actualizar estado en la base de datos
      await sql(
        'UPDATE user_bots SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        ['connecting', user.id]
      )

      return NextResponse.json({ 
        success: true, 
        message: 'Bot iniciado con sesión existente',
        botId: botInstance.id,
        status: botInstance.status
      })
    }

    // Si no existe, crear bot básico
    const result = await sql(
      `INSERT INTO user_bots (
        user_id, name, bot_name, ai_enabled, ai_role, ai_prompt, ai_instructions, 
        default_response, is_active, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'connecting', NOW(), NOW()) 
      RETURNING *`,
      [
        user.id,
        'Mi Bot de WhatsApp',
        'RestoPro Bot',
        true,
        'asistente',
        'Eres un asistente útil para un restaurante.',
        'Ayuda a los clientes con sus consultas de manera amable y profesional.',
        'Gracias por tu mensaje. En breve te responderemos.'
      ]
    )

    console.log('✅ Bot creado en base de datos')

    // Crear instancia del bot
    const botInstance = await WhatsAppBotManager.createBotInstance(user.id)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Bot creado e iniciado exitosamente',
      data: result[0],
      botId: botInstance.id,
      status: botInstance.status
    })

  } catch (error) {
    console.error('❌ Error inicializando bot:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
