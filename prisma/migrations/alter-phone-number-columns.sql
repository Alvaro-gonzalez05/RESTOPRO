-- Migration to alter phone number columns to TEXT

ALTER TABLE whatsapp_connections
ALTER COLUMN phone_number TYPE TEXT;

ALTER TABLE whatsapp_conversations
ALTER COLUMN customer_phone TYPE TEXT;
