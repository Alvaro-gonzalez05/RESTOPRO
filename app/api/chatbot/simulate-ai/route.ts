import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppBotManager } from '@/lib/whatsapp-bot-manager'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { userId, messageText, history } = await req.json()

    if (!userId || !messageText) {
      return NextResponse.json({ error: 'User ID and message text are required' }, { status: 400 })
    }

    // Obtener la configuración del bot del usuario para la API Key de Gemini
    const botConfig = await sql(
      'SELECT openai_api_key, ai_role, ai_instructions FROM user_bots WHERE user_id = $1',
      [userId]
    )

    if (!botConfig.length || !botConfig[0].openai_api_key) {
      return NextResponse.json({ error: 'AI configuration not found or API key is missing' }, { status: 404 })
    }

    const { openai_api_key, ai_role, ai_instructions } = botConfig[0]
    console.log(`[Simulate AI] Using API Key: ${openai_api_key ? openai_api_key.substring(0, 5) + '...' : 'N/A'}`);
    console.log(`[Simulate AI] AI Role: ${ai_role}`);
    console.log(`[Simulate AI] AI Instructions length: ${ai_instructions ? ai_instructions.length : 0}`);
    console.log(`[Simulate AI] User Message length: ${messageText.length}`);
    console.log(`[Simulate AI] History length: ${history ? history.length : 0}`);

    const generativeAI = new GoogleGenerativeAI(openai_api_key)

    const startTime = Date.now();
    // Usar la misma lógica de AI que el bot de WhatsApp
    const aiResponse = await WhatsAppBotManager.getAIResponse(
      messageText,
      ai_role || 'Eres un asistente virtual.',
      ai_instructions || 'Responde de manera útil y concisa.',
      generativeAI,
      history // Pass history to getAIResponse
    )
    const endTime = Date.now();
    console.log(`[Simulate AI] Gemini API call took ${endTime - startTime}ms`);

    return NextResponse.json({ response: aiResponse })
  } catch (error) {
    console.error('Error simulating AI response:', error)
    return NextResponse.json({ error: 'Failed to simulate AI response' }, { status: 500 })
  }
}
