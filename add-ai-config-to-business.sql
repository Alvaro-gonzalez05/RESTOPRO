-- Agregar configuración de IA personalizada al negocio
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS ai_role TEXT DEFAULT 'Eres un asistente virtual de restaurante amigable y profesional.';
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS ai_instructions TEXT DEFAULT 'Responde de manera cordial y útil. Cuando no tengas información específica, ofrece ayuda general y dirige al cliente a contactar directamente al restaurante. Mantén un tono cálido y profesional.';
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS ai_fallback_enabled BOOLEAN DEFAULT FALSE;

-- Comentarios
COMMENT ON COLUMN business_info.ai_enabled IS 'Habilitar respuestas de IA cuando no hay coincidencias exactas';
COMMENT ON COLUMN business_info.ai_role IS 'Rol o personalidad que debe asumir la IA';
COMMENT ON COLUMN business_info.ai_instructions IS 'Instrucciones específicas sobre cómo debe responder la IA';
COMMENT ON COLUMN business_info.ai_fallback_enabled IS 'Usar IA como respuesta por defecto cuando no hay coincidencias';

-- Datos iniciales
UPDATE business_info SET 
  ai_enabled = TRUE,
  ai_role = 'Eres un asistente virtual de restaurante amigable y profesional.',
  ai_instructions = 'Responde de manera cordial y útil. Cuando no tengas información específica, ofrece ayuda general y dirige al cliente a contactar directamente al restaurante. Mantén un tono cálido y profesional.',
  ai_fallback_enabled = FALSE
WHERE id = 1;
