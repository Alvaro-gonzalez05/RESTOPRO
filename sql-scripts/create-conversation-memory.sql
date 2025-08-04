-- Create table for conversation memory
CREATE TABLE IF NOT EXISTS conversation_memory (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    conversation_data JSONB NOT NULL DEFAULT '{}',
    last_message TEXT,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_memory_user_phone_unique ON conversation_memory(user_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_last_interaction ON conversation_memory(last_interaction);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_conversation_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_conversation_memory_updated_at
    BEFORE UPDATE ON conversation_memory
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_memory_updated_at();