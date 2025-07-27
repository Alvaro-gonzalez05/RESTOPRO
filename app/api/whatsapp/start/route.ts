import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { WhatsAppBotManager } from '@/lib/whatsapp-bot-manager-real'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Iniciando endpoint /api/whatsapp/start')
    const user = await requireAuth()
    console.log('✅ Usuario autenticado:', user.id)
    
    // Obtener configuración del bot del usuario
    const botConfigResult = await sql(
      'SELECT * FROM user_bots WHERE user_id = $1',
      [user.id]
    )
    console.log('📊 Configuración bot encontrada:', botConfigResult.length > 0)

    if (botConfigResult.length === 0) {
      console.log('❌ No se encontró configuración del bot')
      return Response.json({ 
        success: false, 
        error: 'No se encontró configuración del bot' 
      }, { status: 404 })
    }

    const botConfig = botConfigResult[0]
    console.log('⚙️ Bot config:', { id: botConfig.id, name: botConfig.bot_name })
    
    // Iniciar el bot real con Baileys
    console.log(`🚀 Iniciando bot real para usuario ${user.id}`)
    
    await WhatsAppBotManager.createBotInstance(
      user.id,
      botConfig.openai_api_key || undefined
    )
    console.log('✅ Bot iniciado correctamente')

    return Response.json({ 
      success: true, 
      message: 'Bot iniciado correctamente. Escanea el QR para conectar.' 
    })
  } catch (error) {
    console.error('❌ Error iniciando bot:', error)
    return Response.json({ 
      success: false, 
      error: 'Error al iniciar el bot' 
    }, { status: 500 })
  }
}
