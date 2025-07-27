-- Script actualizado para verificar y crear tablas faltantes del chatbot
-- Basado en el esquema existente del usuario

-- Verificar si existen las tablas principales
-- Si no existen, las creamos

-- Tabla para mensajes del chatbot
CREATE TABLE IF NOT EXISTS chatbot_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  category VARCHAR(100) NOT NULL,
  trigger_keywords TEXT[] NOT NULL,
  message_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para información del negocio
CREATE TABLE IF NOT EXISTS business_info (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  business_name VARCHAR(255),
  description TEXT,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  business_hours JSONB,
  services TEXT[],
  specialties TEXT[],
  social_media JSONB,
  auto_responses BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Las tablas automation_rules y automation_executions ya existen según el usuario
-- Solo verificamos los índices

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_user_id ON chatbot_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_active ON chatbot_messages(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_business_info_user_id ON business_info(user_id);

-- Verificar que las tablas de automatización tengan los campos correctos
-- (Las tablas ya existen, solo documentamos la estructura esperada)

/*
Estructura esperada de automation_rules:
- id (serial, primary key)
- user_id (integer, not null)
- name (varchar(255), not null)
- trigger_type (varchar(100))
- trigger_conditions (jsonb)
- action_type (varchar(100))
- action_data (jsonb)
- is_active (boolean, default true)
- last_executed (timestamp)
- created_at (timestamp, default current_timestamp)
- updated_at (timestamp, default current_timestamp)

Estructura esperada de automation_executions:
- id (serial, primary key)
- rule_id (integer, not null)
- customer_id (integer, nullable)
- customer_phone (varchar(20), nullable)
- execution_status (varchar(50), nullable)
- execution_details (jsonb, nullable)
- executed_at (timestamp, default current_timestamp)
*/
