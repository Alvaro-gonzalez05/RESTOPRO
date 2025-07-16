-- Agrega la columna 'redeemed' para marcar productos canjeados por puntos
-- Permite canje parcial: cuántas unidades de este item fueron canjeadas por puntos
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS redeemed_quantity INTEGER DEFAULT 0;
