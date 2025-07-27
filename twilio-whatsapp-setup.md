# Configuración de WhatsApp con Twilio

## Opción 1: Usar Twilio WhatsApp Sandbox (Para pruebas)

### Pasos:

1. **Ve a tu consola de Twilio:**
   - Accede a: https://console.twilio.com/
   - Ve a: Messaging → Try it out → Send a WhatsApp message

2. **Configura el Sandbox:**
   - Encontrarás un número como: `+1 415 523 8886`
   - Y un código como: `join <palabra-clave>`

3. **Activa el Sandbox:**
   - Desde tu WhatsApp personal, envía un mensaje al número del sandbox
   - Mensaje: `join <palabra-clave>` (ej: `join capital-early`)

4. **Actualiza la configuración en tu dashboard:**
   - Cambia el número de WhatsApp de `+5402616977056` 
   - Por el número del sandbox: `+14155238886`

## Opción 2: Aprobar tu número WhatsApp Business

### Requisitos:
- Tener una cuenta de WhatsApp Business verificada
- Proceso de aprobación de Meta (puede tomar días/semanas)
- Cumplir con las políticas de WhatsApp Business

### Limitaciones del Sandbox:
- Solo usuarios que se unieron al sandbox pueden recibir mensajes
- Ideal para desarrollo y pruebas
- Mensajes tienen prefijo "[Sandbox]"

## Error actual:
- Número configurado: `+5402616977056`
- Error: Canal no encontrado en Twilio
- Solución: Usar número del sandbox o aprobar el número actual
