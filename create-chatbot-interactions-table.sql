-- Tabla para registrar interacciones del chatbot
CREATE TABLE IF NOT EXISTS chatbot_interactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  incoming_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_user_id ON chatbot_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_customer_phone ON chatbot_interactions(customer_phone);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_created_at ON chatbot_interactions(created_at);
