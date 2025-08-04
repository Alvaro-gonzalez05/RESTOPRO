-- Promotions System Tables
-- This script creates all the necessary tables for the promotions and marketing system

-- Create promotion_campaigns table
CREATE TABLE IF NOT EXISTS promotion_campaigns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    promotion_id INTEGER NOT NULL,
    message_template TEXT NOT NULL,
    target_segment VARCHAR(50) NOT NULL DEFAULT 'all',
    send_immediately BOOLEAN DEFAULT true,
    scheduled_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'paused')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE
);

-- Create promotion_campaign_recipients table
CREATE TABLE IF NOT EXISTS promotion_campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL,
    customer_id INTEGER,
    customer_phone VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'responded')),
    sent_at TIMESTAMP,
    responded_at TIMESTAMP,
    order_generated BOOLEAN DEFAULT false,
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (campaign_id) REFERENCES promotion_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Create promotion_usage table to track when promotions are used
CREATE TABLE IF NOT EXISTS promotion_usage (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER NOT NULL,
    customer_id INTEGER,
    campaign_id INTEGER,
    order_id INTEGER,
    discount_applied DECIMAL(10,2),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (campaign_id) REFERENCES promotion_campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Create points_transactions table to track points earning and redemption
CREATE TABLE IF NOT EXISTS points_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    points_change INTEGER NOT NULL, -- Positive for earning, negative for redemption
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'bonus', 'adjustment')),
    description TEXT,
    order_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Create message_history table to track all messages sent
CREATE TABLE IF NOT EXISTS message_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    message_type VARCHAR(50) NOT NULL DEFAULT 'manual', -- manual, promotion, automation, reminder, etc.
    message_content TEXT NOT NULL,
    campaign_id INTEGER,
    automation_rule_id INTEGER,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered', 'read')),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    response_received BOOLEAN DEFAULT false,
    response_content TEXT,
    responded_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES promotion_campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (automation_rule_id) REFERENCES automation_rules(id) ON DELETE SET NULL
);

-- Create redeemable_products table for points redemption
CREATE TABLE IF NOT EXISTS redeemable_products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    product_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    discount_type VARCHAR(20) DEFAULT 'free' CHECK (discount_type IN ('free', 'discount', 'percentage')),
    discount_value DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    usage_limit INTEGER, -- NULL means unlimited
    current_usage INTEGER DEFAULT 0,
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Create customer_segments table for advanced segmentation
CREATE TABLE IF NOT EXISTS customer_segments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL, -- Store complex filtering conditions
    is_dynamic BOOLEAN DEFAULT true, -- true if segment updates automatically
    customer_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create customer_segment_members table for static segments
CREATE TABLE IF NOT EXISTS customer_segment_members (
    id SERIAL PRIMARY KEY,
    segment_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (segment_id) REFERENCES customer_segments(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE(segment_id, customer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promotion_campaigns_user_id ON promotion_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_campaigns_status ON promotion_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_promotion_campaigns_scheduled ON promotion_campaigns(scheduled_date) WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON promotion_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_customer_phone ON promotion_campaign_recipients(customer_phone);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON promotion_campaign_recipients(status);

CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion_id ON promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_customer_id ON promotion_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_used_at ON promotion_usage(used_at);

CREATE INDEX IF NOT EXISTS idx_points_transactions_customer_id ON points_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON points_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_message_history_user_id ON message_history(user_id);
CREATE INDEX IF NOT EXISTS idx_message_history_customer_phone ON message_history(customer_phone);
CREATE INDEX IF NOT EXISTS idx_message_history_sent_at ON message_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_message_history_message_type ON message_history(message_type);

CREATE INDEX IF NOT EXISTS idx_redeemable_products_user_id ON redeemable_products(user_id);
CREATE INDEX IF NOT EXISTS idx_redeemable_products_active ON redeemable_products(is_active) WHERE is_active = true;

-- Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_promotion_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_redeemable_product_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamps
DROP TRIGGER IF EXISTS update_redeemable_products_timestamp ON redeemable_products;
CREATE TRIGGER update_redeemable_products_timestamp
    BEFORE UPDATE ON redeemable_products
    FOR EACH ROW
    EXECUTE PROCEDURE update_redeemable_product_timestamp();

-- Insert some sample redeemable products for existing users
INSERT INTO redeemable_products (user_id, name, description, points_required, discount_type, discount_value)
SELECT 
    id as user_id,
    'Café Gratis' as name,
    'Canjea tus puntos por un café gratis' as description,
    50 as points_required,
    'free' as discount_type,
    0 as discount_value
FROM users
WHERE id NOT IN (SELECT DISTINCT user_id FROM redeemable_products WHERE name = 'Café Gratis');

INSERT INTO redeemable_products (user_id, name, description, points_required, discount_type, discount_value)
SELECT 
    id as user_id,
    '10% de Descuento' as name,
    '10% de descuento en tu próximo pedido' as description,
    100 as points_required,
    'percentage' as discount_type,
    10 as discount_value
FROM users
WHERE id NOT IN (SELECT DISTINCT user_id FROM redeemable_products WHERE name = '10% de Descuento');

INSERT INTO redeemable_products (user_id, name, description, points_required, discount_type, discount_value)
SELECT 
    id as user_id,
    '$5 de Descuento' as name,
    '$5 de descuento en pedidos mayores a $25' as description,
    150 as points_required,
    'discount' as discount_type,
    5 as discount_value
FROM users
WHERE id NOT IN (SELECT DISTINCT user_id FROM redeemable_products WHERE name = '$5 de Descuento');

COMMENT ON TABLE promotion_campaigns IS 'Store marketing campaigns for sending promotions to customers';
COMMENT ON TABLE promotion_campaign_recipients IS 'Track individual recipients of promotion campaigns';
COMMENT ON TABLE promotion_usage IS 'Track when and how promotions are used by customers';
COMMENT ON TABLE points_transactions IS 'Track all points earning and redemption activities';
COMMENT ON TABLE message_history IS 'Complete history of all messages sent to customers';
COMMENT ON TABLE redeemable_products IS 'Products and rewards that can be redeemed with points';
COMMENT ON TABLE customer_segments IS 'Customer segmentation for targeted marketing';
COMMENT ON TABLE customer_segment_members IS 'Members of customer segments';