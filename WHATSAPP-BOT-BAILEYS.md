# 🤖 Bot de WhatsApp con IA - Nueva Arquitectura

## 🎉 ¿Qué cambió?

Hemos migrado completamente de **Twilio** a **Baileys** para una experiencia mucho mejor:

### ✅ Ventajas de la nueva arquitectura:
- **100% Gratuito** - No más costos de Twilio
- **Conexión directa** - Solo escanear un código QR
- **Multi-tenant** - Cada usuario tiene su propio bot
- **IA integrada** - ChatGPT incorporado en cada bot
- **Conversaciones ilimitadas** - Sin restricciones de sandbox

## 🚀 Nuevas características

### 1. **Sistema Multi-Tenant**
- Cada usuario puede crear su propio bot de WhatsApp
- Configuración independiente por usuario
- Historial de conversaciones separado

### 2. **IA Personalizable**
- Configurar el rol de la IA (ej: "Eres un chef experto")
- Instrucciones personalizadas para cada negocio
- API Key de OpenAI por usuario
- Respuestas inteligentes cuando no hay mensajes predefinidos

### 3. **Conexión Simplificada**
- Solo escanear QR con WhatsApp Web
- No más configuración compleja de webhooks
- Estado en tiempo real (Conectado/Desconectado)

## 📊 Nuevas tablas de base de datos

### `user_bots`
```sql
- id: Identificador único del bot
- user_id: Usuario propietario
- bot_name: Nombre personalizado
- status: Estado (disconnected, connecting, connected, error)
- ai_enabled: Si la IA está habilitada
- ai_role: Rol de la IA
- ai_instructions: Instrucciones para la IA
- openai_api_key: API Key de OpenAI (encriptada)
- qr_code: Código QR para conexión
- phone_number: Número de WhatsApp conectado
```

### `bot_conversations`
```sql
- id: Identificador de conversación
- user_bot_id: Bot propietario
- contact_number: Número del contacto
- contact_name: Nombre del contacto
- last_message: Último mensaje
- last_message_at: Fecha último mensaje
```

### `bot_messages`
```sql
- id: Identificador del mensaje
- conversation_id: Conversación padre
- message_type: incoming/outgoing
- content: Contenido del mensaje
- created_at: Fecha del mensaje
```

## 🗑️ Tablas eliminadas

Las siguientes tablas ya no son necesarias:
- `twilio_credentials` ❌
- `whatsapp_api_credentials` ❌

## 🛠️ Cómo usar

### 1. **Crear tu bot**
1. Ve a Dashboard → Chatbot
2. Configura el nombre de tu bot
3. Añade tu API Key de OpenAI
4. Personaliza el rol e instrucciones de la IA
5. Clic en "Crear Bot"

### 2. **Conectar WhatsApp**
1. Clic en "Iniciar Bot"
2. Escanea el código QR con WhatsApp Web
3. ¡Tu bot está listo!

### 3. **Gestionar conversaciones**
- Ve a la pestaña "Conversaciones"
- Revisa el historial de mensajes
- Monitorea la actividad de tu bot

## 🧠 Configuración de IA

### Ejemplo de configuración:

**Rol:**
```
Eres un asistente virtual experto en gastronomía y servicio al cliente para un restaurante de comida italiana.
```

**Instrucciones:**
```
- Responde de manera amigable y profesional
- Conoces bien los platos italianos tradicionales
- Cuando no sepas algo específico del menú, dirige al cliente a contactar directamente
- Sugiere platos populares cuando te pregunten por recomendaciones
- Mantén un tono cálido y acogedor
```

## 🔧 Funciones principales

### Para desarrolladores:

```typescript
// Crear bot de usuario
await createUserBot({
  botName: "Mi Restaurante Bot",
  aiEnabled: true,
  aiRole: "Eres un asistente...",
  aiInstructions: "Responde de manera...",
  openaiApiKey: "sk-..."
})

// Iniciar bot
await startUserBot()

// Obtener estado
await getUserBotStatus()

// Obtener conversaciones
await getUserBotConversations()
```

## 📱 API de WhatsApp

El bot utiliza **@bot-whatsapp** con **Baileys** que es:
- Conexión directa a WhatsApp Web
- Sin límites de mensajes
- Soporte completo para multimedia
- Gestión automática de sesiones

## 🚨 Importante

1. **API Key de OpenAI**: Cada usuario necesita su propia API Key
2. **Un bot por usuario**: El sistema permite un bot por cuenta
3. **Conexión activa**: El bot debe mantenerse ejecutándose
4. **Respaldo automático**: Las sesiones se guardan automáticamente

## 🔄 Migración completa

La migración incluye:
- ✅ Eliminación de dependencias de Twilio
- ✅ Nuevas tablas para sistema multi-tenant
- ✅ Nueva interfaz de usuario
- ✅ Integración con ChatGPT
- ✅ Sistema de QR code
- ✅ Gestión de conversaciones

¡Tu sistema ahora es completamente independiente y mucho más potente! 🎉
