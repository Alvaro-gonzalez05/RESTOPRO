"use server"

import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

// Obtener configuración de puntos del usuario
export async function getPointsConfig() {
  const user = await requireAuth();
  const userId = user.id;
  const result = await sql(`SELECT * FROM points_config WHERE user_id = $1`, [userId]);
  return result;
}

// Guardar o actualizar configuración de puntos (por producto, categoría, bienvenida, compra grande)
export async function upsertPointsConfig({
  product_id,
  category_id,
  welcome_points,
  big_purchase_threshold,
  big_purchase_points,
  points,
  redeem_points
}: {
  product_id?: number;
  category_id?: number;
  welcome_points?: number;
  big_purchase_threshold?: number;
  big_purchase_points?: number;
  points?: number;
  redeem_points?: number;
}) {
  const user = await requireAuth();
  const userId = user.id;
  
  let existing;
  
  // Buscar registro existente según el caso
  if (product_id) {
    // Buscar por producto específico
    [existing] = await sql(`SELECT * FROM points_config WHERE user_id = $1 AND product_id = $2`, [userId, product_id]);
  } else if (category_id) {
    // Buscar por categoría específica
    [existing] = await sql(`SELECT * FROM points_config WHERE user_id = $1 AND category_id = $2`, [userId, category_id]);
  } else {
    // Buscar configuración global (puntos de bienvenida, compra grande)
    [existing] = await sql(`SELECT * FROM points_config WHERE user_id = $1 AND product_id IS NULL AND category_id IS NULL`, [userId]);
  }
  
  if (existing) {
    console.log(`Actualizando registro existente ID: ${existing.id}`)
    // Actualizar registro existente
    await sql(`UPDATE points_config SET welcome_points = $1, big_purchase_threshold = $2, big_purchase_points = $3, points = $4, redeem_points = $5, updated_at = NOW() WHERE id = $6`, [welcome_points !== undefined ? welcome_points : existing.welcome_points, big_purchase_threshold !== undefined ? big_purchase_threshold : existing.big_purchase_threshold, big_purchase_points !== undefined ? big_purchase_points : existing.big_purchase_points, points !== undefined ? points : existing.points, redeem_points !== undefined ? redeem_points : existing.redeem_points, existing.id]);
    console.log(`Registro actualizado para ${product_id ? `producto ${product_id}` : category_id ? `categoría ${category_id}` : 'configuración global'}`)
    return { updated: true, id: existing.id };
  } else {
    console.log(`Creando nuevo registro para ${product_id ? `producto ${product_id}` : category_id ? `categoría ${category_id}` : 'configuración global'}`)
    // Crear nuevo registro
    const [newRecord] = await sql(`INSERT INTO points_config ( user_id, product_id, category_id, welcome_points, big_purchase_threshold, big_purchase_points, points, redeem_points, created_at, updated_at ) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW() ) RETURNING id`, [userId, product_id || null, category_id || null, welcome_points ?? null, big_purchase_threshold ?? null, big_purchase_points ?? null, points ?? null, redeem_points ?? null]);
    console.log(`Nuevo registro creado con ID: ${newRecord.id}`)
    return { created: true, id: newRecord.id };
  }
}
