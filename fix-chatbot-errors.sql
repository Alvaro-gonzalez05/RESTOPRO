-- Script para corregir errores del chatbot

-- 1. Ampliar campo customer_phone en chatbot_interactions
ALTER TABLE chatbot_interactions ALTER COLUMN customer_phone TYPE VARCHAR(50);

-- 2. Verificar que las tablas existen
SELECT 'customers table' as table_name, count(*) as records FROM customers
UNION ALL
SELECT 'chatbot_interactions table' as table_name, count(*) as records FROM chatbot_interactions;
