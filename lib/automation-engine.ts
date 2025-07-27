import { sql } from '@/lib/db';
import { WhatsAppBotManager } from './whatsapp-bot-manager';

export async function triggerAutomation(userId: number, eventType: string, data: any) {
  try {
    const rules = await sql(`
      SELECT * FROM automation_rules 
      WHERE user_id = $1 AND trigger_type = $2 AND is_active = true
    `, [userId, eventType]);

    for (const rule of rules) {
      let conditionsMet = true;

      // Evaluar condiciones (ej. para cliente inactivo, etc.)
      // Por ahora, solo se considera el tipo de evento. Las condiciones más complejas se añadirán después.
      if (rule.trigger_conditions) {
        // Aquí se podría añadir lógica para evaluar condiciones JSONB
        // Por ejemplo, si data.total > rule.trigger_conditions.min_total
      }

      if (conditionsMet) {
        if (rule.action_type === 'send_whatsapp_message') {
          let messageText = rule.action_data.messageText || '';

          // Reemplazar variables en el mensaje
          messageText = await WhatsAppBotManager.replaceVariables(messageText, userId);
          
          // Reemplazar variables específicas del evento (ej. nombre del cliente, total de la orden)
          if (eventType === 'new_order' && data.customer_name) {
            messageText = messageText.replace(/{nombreCliente}/g, data.customer_name);
          }
          if (eventType === 'new_order' && data.total) {
            messageText = messageText.replace(/{totalOrden}/g, data.total.toFixed(2));
          }
          if (eventType === 'new_order' && data.orderId) {
            messageText = messageText.replace(/{idOrden}/g, data.orderId);
          }

          // Asumiendo que el número de teléfono del cliente está en data.customer_phone
          if (data.customer_phone) {
            await WhatsAppBotManager.sendMessage(userId, data.customer_phone, messageText);
            console.log(`Automatización ejecutada: Mensaje enviado a ${data.customer_phone} para el usuario ${userId}`);
          } else {
            console.warn(`No se pudo enviar el mensaje de automatización: número de teléfono del cliente no encontrado para el usuario ${userId}`);
          }
        }
        // Aquí se pueden añadir otras acciones (ej. enviar email, etc.)
      }
    }
  } catch (error) {
    console.error('Error triggering automation:', error);
  }
}
