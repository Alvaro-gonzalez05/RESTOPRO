-- Agregar campo menu_link a la tabla business_info
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS menu_link TEXT DEFAULT '';

-- Comentar el campo
COMMENT ON COLUMN business_info.menu_link IS 'Enlace al menú virtual o carta digital del negocio';
