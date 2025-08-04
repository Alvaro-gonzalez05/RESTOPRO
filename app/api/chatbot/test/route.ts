
import { NextRequest, NextResponse } from 'next/server'
import { processIncomingMessageEnhanced } from '@/app/actions/enhanced-chatbot-ai'
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userId = user.id

  try {
    const body = await req.json()
    const { message, from } = body

    if (!message || !from) {
      return NextResponse.json({ error: 'Message and from are required' }, { status: 400 })
    }

    console.log('Test chatbot received:', { userId, from, message })

    // Use the enhanced chatbot system
    const result = await processIncomingMessageEnhanced(userId, from, message)

    console.log('Test chatbot result:', result)

    if (result.success) {
      return NextResponse.json({ 
        response: result.response,
        actions: result.actions,
        conversationState: result.conversationState
      })
    } else {
      return NextResponse.json({ 
        error: result.error || 'Failed to process message',
        response: result.response || 'Lo siento, hubo un problema procesando tu mensaje.'
      }, { status: 200 }) // Return 200 to show the error message in chat
    }
  } catch (error) {
    console.error('Error in test chat API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      response: 'Lo siento, hubo un error interno. Por favor intenta de nuevo.'
    }, { status: 200 })
  }
}
