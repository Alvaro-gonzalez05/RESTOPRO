import { sql } from '@/lib/db';

export async function createWhatsAppCredentialsTable() {
  try {
    console.log('🔄 Creando tabla whatsapp_api_credentials...');
    
    // Crear tabla
    await sql(`
      CREATE TABLE IF NOT EXISTS whatsapp_api_credentials (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        access_token TEXT NOT NULL,
        phone_number_id TEXT NOT NULL,
        business_account_id TEXT NOT NULL,
        app_id TEXT,
        app_secret TEXT,
        webhook_verify_token TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(user_id)
      )
    `);
    
    console.log('✅ Tabla whatsapp_api_credentials creada');
    
    // Crear índices
    await sql(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_api_credentials_user_id 
      ON whatsapp_api_credentials(user_id)
    `);
    
    await sql(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_api_credentials_active 
      ON whatsapp_api_credentials(user_id, is_active)
    `);
    
    console.log('✅ Índices creados');
    
    // Crear función y trigger para updated_at
    await sql(`
      CREATE OR REPLACE FUNCTION update_whatsapp_api_credentials_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    await sql(`
      DROP TRIGGER IF EXISTS update_whatsapp_api_credentials_updated_at_trigger 
      ON whatsapp_api_credentials
    `);
    
    await sql(`
      CREATE TRIGGER update_whatsapp_api_credentials_updated_at_trigger
          BEFORE UPDATE ON whatsapp_api_credentials
          FOR EACH ROW
          EXECUTE FUNCTION update_whatsapp_api_credentials_updated_at()
    `);
    
    console.log('✅ Trigger creado');
    
    return { success: true, message: 'Tabla creada exitosamente' };
  } catch (error: any) {
    console.error('❌ Error creando tabla:', error);
    return { success: false, error: error?.message || 'Error desconocido' };
  }
}
