-- Tabla para configuración de puntos por usuario
CREATE TABLE IF NOT EXISTS points_config (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  welcome_points INTEGER DEFAULT 0,
  big_purchase_threshold NUMERIC DEFAULT 0,
  big_purchase_points INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  redeem_points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_points_config_user ON points_config(user_id);
CREATE INDEX IF NOT EXISTS idx_points_config_product ON points_config(product_id);
CREATE INDEX IF NOT EXISTS idx_points_config_category ON points_config(category_id);
