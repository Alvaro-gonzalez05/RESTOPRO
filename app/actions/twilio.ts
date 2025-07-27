// app/actions/twilio.ts
'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface TwilioCredentials {
  id?: number
  user_id: number
  account_sid: string
  auth_token: string
  whatsapp_number: string
  created_at?: string
  updated_at?: string
}

// Guardar credenciales de Twilio
export async function saveTwilioCredentials(credentials: Omit<TwilioCredentials, 'id' | 'created_at' | 'updated_at'>) {
  try {
    await sql(
      `INSERT INTO twilio_credentials (user_id, account_sid, auth_token, whatsapp_number)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         account_sid = EXCLUDED.account_sid,
         auth_token = EXCLUDED.auth_token,
         whatsapp_number = EXCLUDED.whatsapp_number,
         updated_at = CURRENT_TIMESTAMP`,
      [
        credentials.user_id,
        credentials.account_sid,
        credentials.auth_token,
        credentials.whatsapp_number
      ]
    )
    revalidatePath('/dashboard/chatbot')
    return { success: true, message: 'Credenciales guardadas correctamente' }
  } catch (error) {
    console.error('Error saving Twilio credentials:', error)
    return { success: false, message: 'Error al guardar las credenciales' }
  }
}

// Obtener credenciales de Twilio
export async function getTwilioCredentials(userId: number): Promise<TwilioCredentials | null> {
  try {
    const result = await sql(`
      SELECT * FROM twilio_credentials 
      WHERE user_id = ${userId}
    `)
    
    return result.length > 0 ? result[0] as TwilioCredentials : null
  } catch (error) {
    console.error('Error getting Twilio credentials:', error)
    return null
  }
}

// Verificar credenciales con Twilio API
export async function verifyTwilioCredentials(userId: number) {
  try {
    const credentials = await getTwilioCredentials(userId)
    if (!credentials) {
      return { success: false, message: 'No se encontraron credenciales' }
    }

    // Verificar credenciales con Twilio API
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${credentials.account_sid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${credentials.account_sid}:${credentials.auth_token}`).toString('base64')
      }
    })

    if (response.ok) {
      revalidatePath('/dashboard/chatbot')
      return { success: true, message: 'Credenciales verificadas correctamente' }
    } else {
      return { success: false, message: 'Credenciales inválidas' }
    }
  } catch (error) {
    console.error('Error verifying Twilio credentials:', error)
    return { success: false, message: 'Error al verificar las credenciales' }
  }
}

// Enviar mensaje con botones interactivos
export async function sendInteractiveMessage(userId: number, to: string, body: string, options: Array<{id: string, text: string}>) {
  try {
    console.log('sendInteractiveMessage function called with:', { userId, to, body, options })

    const credentials = await getTwilioCredentials(userId)
    console.log('Retrieved credentials:', credentials)
    
    if (!credentials) {
      console.log('No credentials found')
      return { success: false, message: 'Credenciales no configuradas' }
    }

    // Detectar si es número de sandbox de Twilio
    const isSandbox = credentials.whatsapp_number.includes('14155238886') || 
                     credentials.whatsapp_number.includes('+14155238886')

    const fromNumber = `whatsapp:${credentials.whatsapp_number}`
    const toNumber = `whatsapp:${to}`
    
    console.log('Sending interactive message from:', fromNumber, 'to:', toNumber)

    // Crear estructura de mensaje interactivo para WhatsApp Business API
    const messageData: any = {
      'From': fromNumber,
      'To': toNumber,
    }

    if (isSandbox) {
      // En sandbox, usar texto simple con opciones numeradas
      let messageBody = `[Sandbox] ${body}\n\nElige una opción escribiendo el número:`
      options.forEach((option, index) => {
        messageBody += `\n${index + 1}. ${option.text}`
      })
      messageData['Body'] = messageBody
    } else {
      // En producción, usar botones interactivos reales
      messageData['Body'] = body
      messageData['ContentSid'] = 'interactive'
      
      // Crear estructura de botones para WhatsApp Business API
      const interactive = {
        type: 'button',
        body: {
          text: body
        },
        action: {
          buttons: options.slice(0, 3).map((option, index) => ({ // WhatsApp permite máximo 3 botones
            type: 'reply',
            reply: {
              id: option.id,
              title: option.text.substring(0, 20) // Límite de 20 caracteres por botón
            }
          }))
        }
      }
      
      messageData['ContentVariables'] = JSON.stringify({
        1: JSON.stringify(interactive)
      })
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${credentials.account_sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${credentials.account_sid}:${credentials.auth_token}`).toString('base64')
      },
      body: new URLSearchParams(messageData)
    })

    const result = await response.json()
    console.log('Twilio API response:', { status: response.status, data: result })

    if (response.ok) {
      return { 
        success: true, 
        message: 'Mensaje interactivo enviado correctamente',
        messageSid: result.sid
      }
    } else {
      return { 
        success: false, 
        message: `Error de Twilio: ${result.message || 'Error desconocido'}`,
        error: result
      }
    }
  } catch (error) {
    console.error('Error sending interactive message:', error)
    return { success: false, message: 'Error al enviar el mensaje interactivo' }
  }
}

// Enviar mensaje de prueba
export async function sendMessage(userId: number, to: string, body: string) {
  try {
    console.log('sendMessage function called with:', { userId, to, body })

    const credentials = await getTwilioCredentials(userId)
    console.log('Retrieved credentials:', credentials)
    
    if (!credentials) {
      console.log('No credentials found')
      return { success: false, message: 'Credenciales no configuradas' }
    }

    // Detectar si es número de sandbox de Twilio
    const isSandbox = credentials.whatsapp_number.includes('14155238886') || 
                     credentials.whatsapp_number.includes('+14155238886')

    const fromNumber = `whatsapp:${credentials.whatsapp_number}`
    const toNumber = `whatsapp:${to}`
    
    console.log('Sending message from:', fromNumber, 'to:', toNumber)
    console.log('Account SID:', credentials.account_sid)
    console.log('WhatsApp number configured:', credentials.whatsapp_number)
    console.log('Is sandbox:', isSandbox)

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${credentials.account_sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${credentials.account_sid}:${credentials.auth_token}`).toString('base64')
      },
      body: new URLSearchParams({
        'From': fromNumber,
        'To': toNumber,
        'Body': isSandbox ? `[Sandbox] ${body}` : body
      })
    })

    const data = await response.json()
    console.log('Twilio API response:', { status: response.status, data })

    if (response.ok) {
      revalidatePath('/dashboard/chatbot')
      return { success: true, message: 'Mensaje enviado correctamente', data }
    } else {
      console.log('Twilio API error:', data)
      
      // Mensaje de error más específico para WhatsApp
      let errorMessage = data.message || 'Error al enviar mensaje'
      if (data.code === 63007) {
        errorMessage = 'El número de WhatsApp no está configurado en Twilio. ' +
                      'Usa el número del Sandbox de WhatsApp o configura un número aprobado.'
      }
      
      return { success: false, message: errorMessage }
    }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, message: 'Error al enviar el mensaje' }
  }
}

// Obtener números de teléfono disponibles
export async function getTwilioPhoneNumbers(userId: number) {
  try {
    const credentials = await getTwilioCredentials(userId)
    if (!credentials) {
      return { success: false, message: 'No se encontraron credenciales' }
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${credentials.account_sid}/IncomingPhoneNumbers.json`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${credentials.account_sid}:${credentials.auth_token}`).toString('base64')
      }
    })

    if (response.ok) {
      const data = await response.json()
      return { success: true, phoneNumbers: data.incoming_phone_numbers }
    } else {
      return { success: false, message: 'Error al obtener números de teléfono' }
    }
  } catch (error) {
    console.error('Error getting phone numbers:', error)
    return { success: false, message: 'Error al obtener números de teléfono' }
  }
}
