-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size > 0),
    status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    special_requests TEXT,
    notes TEXT,
    created_via VARCHAR(50) DEFAULT 'manual' CHECK (created_via IN ('manual', 'chatbot', 'website', 'phone')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no double booking for same time slot
    UNIQUE(user_id, reservation_date, reservation_time)
);

-- Create index for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_reservations_user_date ON reservations(user_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_phone ON reservations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- Create restaurant configuration table for reservation settings
CREATE TABLE IF NOT EXISTS reservation_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    max_party_size INTEGER DEFAULT 8,
    min_advance_hours INTEGER DEFAULT 2, -- minimum hours in advance for booking
    max_advance_days INTEGER DEFAULT 30, -- maximum days in advance for booking
    default_duration_minutes INTEGER DEFAULT 120, -- default reservation duration
    opening_time TIME DEFAULT '09:00:00',
    closing_time TIME DEFAULT '22:00:00',
    time_slot_interval INTEGER DEFAULT 30, -- minutes between time slots
    allow_same_day_bookings BOOLEAN DEFAULT true,
    require_phone BOOLEAN DEFAULT true,
    require_email BOOLEAN DEFAULT false,
    auto_confirm BOOLEAN DEFAULT true,
    send_confirmations BOOLEAN DEFAULT true,
    send_reminders BOOLEAN DEFAULT true,
    reminder_hours_before INTEGER DEFAULT 2,
    blocked_dates JSONB DEFAULT '[]'::jsonb, -- array of blocked dates
    special_hours JSONB DEFAULT '{}'::jsonb, -- special hours for specific dates
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for available time slots (optional, for complex scheduling)
CREATE TABLE IF NOT EXISTS reservation_time_slots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    available_spots INTEGER DEFAULT 1,
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, date, time)
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reservation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for reservations table
DROP TRIGGER IF EXISTS update_reservations_timestamp ON reservations;
CREATE TRIGGER update_reservations_timestamp
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE PROCEDURE update_reservation_timestamp();

-- Create trigger for reservation_settings table
DROP TRIGGER IF EXISTS update_reservation_settings_timestamp ON reservation_settings;
CREATE TRIGGER update_reservation_settings_timestamp
    BEFORE UPDATE ON reservation_settings
    FOR EACH ROW
    EXECUTE PROCEDURE update_reservation_timestamp();

-- Insert default reservation settings for existing users
INSERT INTO reservation_settings (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM reservation_settings);

COMMENT ON TABLE reservations IS 'Store restaurant reservations made through various channels';
COMMENT ON TABLE reservation_settings IS 'Store reservation configuration per restaurant';
COMMENT ON TABLE reservation_time_slots IS 'Optional table for complex scheduling and availability management';