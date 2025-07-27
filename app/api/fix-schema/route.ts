import { sql } from '@/lib/db'

export async function GET() {
  try {
    // Agregar campos faltantes si no existen
    await sql(
      `DO $$ 
      BEGIN
          -- Verificar si la columna name existe, si no la agrega
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'user_bots' AND column_name = 'name') THEN
              ALTER TABLE user_bots ADD COLUMN name VARCHAR(255);
          END IF;

          -- Verificar si la columna is_active existe, si no la agrega
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'user_bots' AND column_name = 'is_active') THEN
              ALTER TABLE user_bots ADD COLUMN is_active BOOLEAN DEFAULT true;
          END IF;

          -- Verificar si la columna default_response existe, si no la agrega
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'user_bots' AND column_name = 'default_response') THEN
              ALTER TABLE user_bots ADD COLUMN default_response TEXT;
          END IF;
      END $$;`,
      []
    )

    // Actualizar registros existentes
    await sql(
      `UPDATE user_bots SET 
          name = COALESCE(name, bot_name, 'Mi Bot de WhatsApp'),
          is_active = COALESCE(is_active, true),
          default_response = COALESCE(default_response, 'Gracias por tu mensaje. En breve te responderemos.')
      WHERE name IS NULL OR is_active IS NULL OR default_response IS NULL`,
      []
    )

    return Response.json({ success: true, message: 'Schema actualizado correctamente' })
  } catch (error) {
    console.error('Error actualizando schema:', error)
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
