-- Crear tablas faltantes para el chatbot
-- Ejecutar este script para completar la base de datos

-- Tabla para reglas de automatización
CREATE TABLE IF NOT EXISTS automation_rules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(100) NOT NULL, -- 'keyword', 'time', 'event'
  trigger_value TEXT NOT NULL,
  action_type VARCHAR(100) NOT NULL, -- 'send_message', 'assign_agent', 'add_tag'
  action_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_user_id ON automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(user_id, is_active);
