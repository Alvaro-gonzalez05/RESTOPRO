import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { WhatsAppBotManager } from '@/lib/whatsapp-bot-manager-real'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Detener el bot del usuario
    await WhatsAppBotManager.stopBotInstance(user.id)

    return Response.json({ 
      success: true, 
      message: 'Bot detenido correctamente' 
    })
  } catch (error) {
    console.error('Error deteniendo bot:', error)
    return Response.json({ 
      success: false, 
      error: 'Error al detener el bot' 
    }, { status: 500 })
  }
}
