-- Migration to create chatbot related tables

CREATE TABLE IF NOT EXISTS whatsapp_connections (
    user_id INTEGER PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected',
    qr_code TEXT,
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_bots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    bot_name VARCHAR(255) NOT NULL DEFAULT 'Mi Bot de WhatsApp',
    phone_number VARCHAR(20),
    qr_code TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected',
    session_data JSONB,
    ai_enabled BOOLEAN DEFAULT TRUE,
    ai_role TEXT DEFAULT 'Eres un asistente virtual amigable y profesional de restaurante.',
    ai_instructions TEXT DEFAULT 'Responde de manera cordial y útil. Cuando no tengas información específica, ofrece ayuda general y dirige al cliente a contactar directamente al restaurante. Mantén un tono cálido y profesional.',
    openai_api_key TEXT, -- Ahora se usará para la API Key de Gemini
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    last_message TEXT,
    last_message_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, customer_phone)
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    message_type VARCHAR(10) NOT NULL, -- 'incoming' or 'outgoing'
    message_text TEXT NOT NULL,
    is_from_bot BOOLEAN DEFAULT FALSE,
    ai_response_used BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Opcional: Añadir la columna menu_link a business_info si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'business_info' AND column_name = 'menu_link'
    ) THEN
        ALTER TABLE business_info ADD COLUMN menu_link TEXT;
    END IF;
END
$$;
