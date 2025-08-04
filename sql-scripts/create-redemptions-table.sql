-- Create customer redemptions table to track points usage
CREATE TABLE IF NOT EXISTS customer_redemptions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    reward_id INTEGER NOT NULL,
    points_used INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'redeemed',
    notes TEXT
);

-- Create redeemable products table if it doesn't exist
CREATE TABLE IF NOT EXISTS redeemable_products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add some sample redeemable products for testing
INSERT INTO redeemable_products (user_id, name, description, points_required, is_active) VALUES
(1, 'Descuento 10%', 'Descuento del 10% en tu próxima compra', 100, true),
(1, 'Bebida Gratis', 'Una bebida gratis de tu elección', 150, true),
(1, 'Postre Gratis', 'Un postre gratis de la casa', 200, true),
(1, 'Descuento 20%', 'Descuento del 20% en tu próxima compra', 300, true),
(1, 'Plato Principal Gratis', 'Un plato principal gratis', 500, true)
ON CONFLICT DO NOTHING;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_redemptions_customer_id ON customer_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_redemptions_created_at ON customer_redemptions(created_at);
CREATE INDEX IF NOT EXISTS idx_redeemable_products_user_id ON redeemable_products(user_id);
CREATE INDEX IF NOT EXISTS idx_redeemable_products_active ON redeemable_products(user_id, is_active) WHERE is_active = true;