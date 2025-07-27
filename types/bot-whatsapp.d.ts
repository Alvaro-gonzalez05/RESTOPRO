// Declaraciones de tipos para las librerías de bot-whatsapp
declare module '@bot-whatsapp/bot' {
  export function createBot(config: any): Promise<any>
  export function createProvider(provider: any, config?: any): any
  export function createFlow(flows: any[]): any
  export function addKeyword(keyword: any): any
  export const EVENTS: {
    WELCOME: string
    MEDIA: string
    LOCATION: string
    DOCUMENT: string
    VOICE_NOTE: string
    BUTTON: string
    ACTION: string
  }
}

declare module '@bot-whatsapp/provider-baileys' {
  export class BaileysProvider {
    constructor(config?: any)
  }
}

declare module '@bot-whatsapp/database-json' {
  export class JsonDB {
    constructor(config?: any)
  }
}
