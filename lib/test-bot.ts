import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  MessageUpsertType,
  WAMessage,
  proto
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import fs from 'fs'
import path from 'path'

const logger = pino({ level: 'warn' })

export async function createTestBot(sessionName = 'session-test') {
  console.log('🤖 Creando bot de prueba...')
  
  return new Promise<{ socket: any, qr: string | null }>((resolve, reject) => {
    let currentQR: string | null = null
    
    const initBot = async () => {
      try {
        // Configurar directorio de autenticación
        const authDir = path.join(process.cwd(), 'auth-sessions')
        if (!fs.existsSync(authDir)) {
          fs.mkdirSync(authDir, { recursive: true })
        }
        
        const authPath = path.join(authDir, sessionName)
        const { state, saveCreds } = await useMultiFileAuthState(authPath)

        // Crear socket de WhatsApp (sin printQRInTerminal)
        const socket = makeWASocket({
          auth: state,
          logger: logger,
          browser: ['RestoPro Bot Test', 'Chrome', '1.0.0'],
          defaultQueryTimeoutMs: undefined,
        })

        console.log('✅ Socket creado, configurando eventos...')

        // Manejar eventos del socket
        socket.ev.on('creds.update', saveCreds)

        socket.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update

          if (qr) {
            currentQR = qr
            console.log('📱 QR Code generado!')
            console.log('📱 QR completo:', qr)
            console.log('📱 QR Length:', qr.length)
            console.log('📱 QR Preview:', qr.substring(0, 100) + '...')
            
            // Resolver la promesa con el socket y QR
            resolve({ socket, qr })
          }

          if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('❌ Conexión cerrada, reconectar:', shouldReconnect)
            
            if (!shouldReconnect) {
              reject(new Error('Conexión cerrada permanentemente'))
            }
          } else if (connection === 'open') {
            console.log('✅ Bot conectado correctamente!')
            // Si ya está conectado, resolver sin QR
            if (!currentQR) {
              resolve({ socket, qr: null })
            }
          }
        })

        // Timeout para casos donde no se genere QR
        setTimeout(() => {
          if (!currentQR) {
            console.log('⏰ Timeout esperando QR, resolviendo con QR nulo')
            resolve({ socket, qr: null })
          }
        }, 10000)

      } catch (error) {
        console.error('❌ Error creando bot de prueba:', error)
        reject(error)
      }
    }

    initBot()
  })
}
