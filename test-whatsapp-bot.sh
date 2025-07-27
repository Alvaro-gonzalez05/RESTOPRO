#!/bin/bash

echo "🚀 Iniciando prueba de integración WhatsApp Bot con Baileys..."

# Verificar que el servidor esté corriendo
echo "📡 Verificando servidor..."
curl -f http://localhost:3000/api/check-schema > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Servidor Next.js está corriendo"
else
    echo "❌ Error: El servidor Next.js no está corriendo en localhost:3000"
    echo "Por favor, ejecuta: npm run dev"
    exit 1
fi

echo ""
echo "🎯 Instrucciones para probar el bot:"
echo "1. Ve a http://localhost:3000/dashboard/chatbot"
echo "2. Haz clic en 'Conectar WhatsApp' si no tienes un bot"
echo "3. Llena el formulario con:"
echo "   - Nombre del Bot: 'Mi Bot Test'"
echo "   - Habilita IA: ON"
echo "   - Rol: 'Asistente de restaurante'"
echo "   - Instrucciones: 'Eres un asistente amigable...'"
echo "4. Una vez creado, haz clic en 'Conectar WhatsApp'"
echo "5. El QR debería aparecer automáticamente"
echo "6. Escanea el QR con WhatsApp Business"
echo ""
echo "🔍 Para monitorear logs del bot:"
echo "tail -f /tmp/whatsapp-bot.log"
echo ""
echo "📱 El QR se actualiza automáticamente cada 3 segundos"
echo "🤖 Una vez conectado, el bot responderá a mensajes automáticamente"
