import { WhatsAppBotManager } from './lib/whatsapp-bot-manager-real.js'

async function testBot() {
  console.log('🧪 Iniciando test del bot manager...')
  
  try {
    // Probar crear instancia para usuario test
    const instance = await WhatsAppBotManager.createBotInstance(999, undefined)
    
    console.log('✅ Bot creado:', instance.id)
    console.log('📱 Estado:', instance.status)
    
    // Esperar 10 segundos para ver si aparece QR
    setTimeout(() => {
      console.log('📱 QR después de 10s:', instance.qrCode ? 'Generado' : 'No generado')
      
      // Detener bot
      WhatsAppBotManager.stopBotInstance(999)
      process.exit(0)
    }, 10000)
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

testBot()
