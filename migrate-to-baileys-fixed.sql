-- Primero, verificar y corregir la tabla users si es necesario
-- Agregar clave primaria a users si no existe
DO $$
BEGIN
    -- Verificar si ya existe una clave primaria
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' 
        AND constraint_type = 'PRIMARY KEY'
        AND table_schema = 'public'
    ) THEN
        -- Si no existe, agregar clave primaria
        ALTER TABLE users ADD PRIMARY KEY (id);
        RAISE NOTICE 'Clave primaria agregada a la tabla users';
    ELSE
        RAISE NOTICE 'La tabla users ya tiene clave primaria';
    END IF;
END $$;

-- Eliminar tablas relacionadas con Twilio (ya no las necesitamos)
DROP TABLE IF EXISTS twilio_credentials CASCADE;
DROP TABLE IF EXISTS whatsapp_api_credentials CASCADE;

-- Crear nueva tabla para instancias de bots de usuarios
CREATE TABLE IF NOT EXISTS user_bots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    bot_name TEXT NOT NULL DEFAULT 'Mi Bot de WhatsApp',
    phone_number TEXT,
    qr_code TEXT,
    status TEXT DEFAULT 'disconnected', -- disconnected, connecting, connected, error
    session_data JSONB DEFAULT '{}',
    ai_enabled BOOLEAN DEFAULT TRUE,
    ai_role TEXT DEFAULT 'Eres un asistente virtual amigable y profesional de restaurante.',
    ai_instructions TEXT DEFAULT 'Responde de manera cordial y útil. Cuando no tengas información específica, ofrece ayuda general y dirige al cliente a contactar directamente al restaurante. Mantén un tono cálido y profesional.',
    openai_api_key TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Agregar foreign key constraint después de crear la tabla
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users' AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_bots ADD CONSTRAINT fk_user_bots_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key constraint agregado a user_bots';
    ELSE
        RAISE NOTICE 'Tabla users no existe, foreign key no agregado';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Foreign key constraint ya existe en user_bots';
END $$;

-- Modificar tabla de mensajes del chatbot para ser por usuario (si existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'chatbot_messages' AND table_schema = 'public'
    ) THEN
        -- Agregar columna user_id si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'chatbot_messages' 
            AND column_name = 'user_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE chatbot_messages ADD COLUMN user_id INTEGER;
            RAISE NOTICE 'Columna user_id agregada a chatbot_messages';
        END IF;
        
        -- Agregar foreign key constraint
        BEGIN
            ALTER TABLE chatbot_messages ADD CONSTRAINT fk_chatbot_messages_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Foreign key constraint agregado a chatbot_messages';
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Foreign key constraint ya existe en chatbot_messages';
        END;
    ELSE
        RAISE NOTICE 'Tabla chatbot_messages no existe';
    END IF;
END $$;

-- Crear tabla para conversaciones del bot
CREATE TABLE IF NOT EXISTS bot_conversations (
    id SERIAL PRIMARY KEY,
    user_bot_id INTEGER NOT NULL,
    contact_number TEXT NOT NULL,
    contact_name TEXT,
    last_message TEXT,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    conversation_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar foreign key para bot_conversations
DO $$
BEGIN
    BEGIN
        ALTER TABLE bot_conversations ADD CONSTRAINT fk_bot_conversations_user_bot_id 
        FOREIGN KEY (user_bot_id) REFERENCES user_bots(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key constraint agregado a bot_conversations';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Foreign key constraint ya existe en bot_conversations';
    END;
END $$;

-- Crear tabla para mensajes de las conversaciones
CREATE TABLE IF NOT EXISTS bot_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    message_type TEXT NOT NULL, -- incoming, outgoing
    content TEXT NOT NULL,
    message_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar foreign key para bot_messages
DO $$
BEGIN
    BEGIN
        ALTER TABLE bot_messages ADD CONSTRAINT fk_bot_messages_conversation_id 
        FOREIGN KEY (conversation_id) REFERENCES bot_conversations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key constraint agregado a bot_messages';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Foreign key constraint ya existe en bot_messages';
    END;
END $$;

-- Comentarios
COMMENT ON TABLE user_bots IS 'Instancias de bots de WhatsApp por usuario';
COMMENT ON TABLE bot_conversations IS 'Conversaciones activas de cada bot';
COMMENT ON TABLE bot_messages IS 'Mensajes individuales de las conversaciones';

COMMENT ON COLUMN user_bots.status IS 'Estado de conexión del bot: disconnected, connecting, connected, error';
COMMENT ON COLUMN user_bots.session_data IS 'Datos de sesión de Baileys';
COMMENT ON COLUMN user_bots.ai_role IS 'Rol que debe asumir la IA del bot';
COMMENT ON COLUMN user_bots.ai_instructions IS 'Instrucciones específicas para la IA';

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_bots_user_id ON user_bots(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bots_status ON user_bots(status);
CREATE INDEX IF NOT EXISTS idx_bot_conversations_user_bot_id ON bot_conversations(user_bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_conversations_contact_number ON bot_conversations(contact_number);
CREATE INDEX IF NOT EXISTS idx_bot_messages_conversation_id ON bot_messages(conversation_id);

-- Crear índice para chatbot_messages si la tabla existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'chatbot_messages' AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_chatbot_messages_user_id ON chatbot_messages(user_id);
        RAISE NOTICE 'Índice creado para chatbot_messages.user_id';
    END IF;
END $$;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '✅ Migración a Baileys multi-tenant completada exitosamente!';
END $$;
