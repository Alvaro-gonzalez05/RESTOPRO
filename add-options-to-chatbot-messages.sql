-- Agregar campos para mensajes con opciones/botones
ALTER TABLE chatbot_messages ADD COLUMN IF NOT EXISTS has_options BOOLEAN DEFAULT FALSE;
ALTER TABLE chatbot_messages ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]';

-- Comentarios
COMMENT ON COLUMN chatbot_messages.has_options IS 'Indica si el mensaje incluye botones/opciones interactivas';
COMMENT ON COLUMN chatbot_messages.options IS 'Array JSON con las opciones/botones del mensaje';

-- Ejemplo de estructura para options:
-- [
--   {"id": "1", "text": "Ver menú", "response_text": "Aquí tienes nuestro menú..."},
--   {"id": "2", "text": "Consultar horarios", "response_text": "Nuestros horarios son..."}
-- ]
