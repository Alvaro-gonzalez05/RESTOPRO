// Twilio WhatsApp API - Más fácil de configurar
// Requiere: Cuenta Twilio + Número sandbox o verificado

import twilio from 'twilio'

export class TwilioWhatsAppService {
  private client: any
  private twilioNumber: string

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!
    const authToken = process.env.TWILIO_AUTH_TOKEN!
    this.twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER! // formato: whatsapp:+14155238886
    
    this.client = twilio(accountSid, authToken)
  }

  // Enviar mensaje vía Twilio
  async sendMessage(to: string, message: string) {
    try {
      const twilioMessage = await this.client.messages.create({
        body: message,
        from: this.twilioNumber, // whatsapp:+14155238886
        to: `whatsapp:${to}` // whatsapp:+573001234567
      })

      console.log(`Mensaje enviado: ${twilioMessage.sid}`)
      return { success: true, messageId: twilioMessage.sid }
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      return { success: false, error }
    }
  }

  // Webhook para recibir mensajes de Twilio
  async handleIncomingMessage(req: any) {
    const { Body, From, MessageSid } = req.body
    
    // Extraer número sin prefijo whatsapp:
    const customerPhone = From.replace('whatsapp:', '')
    const messageText = Body

    console.log(`Mensaje recibido de ${customerPhone}: ${messageText}`)

    // Generar respuesta
    const response = await this.generateAutoResponse(messageText)
    
    if (response) {
      await this.sendMessage(customerPhone, response)
    }

    return { success: true }
  }

  private async generateAutoResponse(message: string): Promise<string | null> {
    const lowerMessage = message.toLowerCase()
    
    // Respuestas automáticas sin IA
    const responses = {
      greeting: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'hi'],
      menu: ['menu', 'carta', 'comida', 'platos', 'especialidades'],
      hours: ['horario', 'abierto', 'cerrado', 'hora'],
      location: ['direccion', 'ubicacion', 'donde estan', 'como llegar'],
      prices: ['precio', 'costo', 'cuanto cuesta', 'valor'],
      delivery: ['delivery', 'domicilio', 'envio', 'llevar']
    }

    for (const [category, keywords] of Object.entries(responses)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return this.getResponseByCategory(category)
      }
    }

    return '¡Gracias por escribirnos! 😊 Un miembro de nuestro equipo te atenderá en breve.'
  }

  private getResponseByCategory(category: string): string {
    const responseTemplates = {
      greeting: '¡Hola! 👋 Bienvenido a nuestro restaurante. ¿En qué puedo ayudarte hoy?',
      menu: `🍽️ *Nuestro Menú Principal:*

🍕 *Pizzas Artesanales* - $15-25
🍝 *Pastas Frescas* - $12-18  
🥗 *Ensaladas Gourmet* - $10-15
🍰 *Postres Caseros* - $6-8

¿Te gustaría conocer alguna especialidad en particular?`,
      hours: `📅 *Horarios de Atención:*

• Lunes a Viernes: 12:00 PM - 10:00 PM
• Sábados: 12:00 PM - 11:00 PM  
• Domingos: 1:00 PM - 9:00 PM

¡Te esperamos! 🍽️`,
      location: `📍 *Nuestra Ubicación:*

Calle Principal 123, Centro
Ciudad, País

🚗 Estacionamiento disponible
🚇 A 2 cuadras del metro

¿Necesitas direcciones específicas?`,
      prices: `💰 *Nuestros Precios:*

🍕 Pizzas: $15 - $25
🍝 Pastas: $12 - $18
🥗 Ensaladas: $10 - $15
🍰 Postres: $6 - $8

📦 Combos especiales disponibles
💳 Aceptamos todos los métodos de pago`,
      delivery: `🛵 *Servicio de Delivery:*

• Tiempo estimado: 30-45 min
• Área de cobertura: 5km
• Pedido mínimo: $15
• Envío GRATIS en pedidos +$25

📱 Haz tu pedido por WhatsApp
💳 Pago contra entrega o online`
    }

    return responseTemplates[category as keyof typeof responseTemplates] || 
           '¡Gracias por escribirnos! Te atenderemos pronto. 😊'
  }
}

/* 
PASOS PARA CONFIGURAR TWILIO:

1. Crear cuenta en https://www.twilio.com/
2. Ir a Console > Messaging > Try it out > Send a WhatsApp message
3. Para sandbox: usar número +1 415 523 8886
4. Para producción: verificar tu número empresarial
5. Configurar webhook en tu servidor

VARIABLES DE ENTORNO:
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token  
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

COSTO APROXIMADO:
- Sandbox: GRATIS para testing
- Producción: ~$0.005 USD por mensaje
*/
