-- Tabla para credenciales de Twilio multiusuario
CREATE TABLE IF NOT EXISTS twilio_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  account_sid VARCHAR(64) NOT NULL,
  auth_token VARCHAR(64) NOT NULL,
  whatsapp_number VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_twilio_credentials_user_id ON twilio_credentials(user_id);
