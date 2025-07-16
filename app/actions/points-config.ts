"use server"

import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

// Obtener configuración de puntos del usuario
export async function getPointsConfig() {
  const user = await requireAuth();
  const userId = user.id;
  const result = await sql`
    SELECT * FROM points_config WHERE user_id = ${userId}
  `;
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
  // Si existe config para este producto/categoría, actualiza, si no, inserta
  const [existing] = await sql`
    SELECT id FROM points_config WHERE user_id = ${userId}
      AND (product_id = ${product_id || null})
      AND (category_id = ${category_id || null})
  `;
  if (existing) {
    await sql`
      UPDATE points_config SET
        welcome_points = ${welcome_points ?? null},
        big_purchase_threshold = ${big_purchase_threshold ?? null},
        big_purchase_points = ${big_purchase_points ?? null},
        points = ${points ?? null},
        redeem_points = ${redeem_points ?? null},
        updated_at = NOW()
      WHERE id = ${existing.id}
    `;
    return { updated: true };
  } else {
    await sql`
      INSERT INTO points_config (
        user_id, product_id, category_id, welcome_points, big_purchase_threshold, big_purchase_points, points, redeem_points, created_at, updated_at
      ) VALUES (
        ${userId}, ${product_id || null}, ${category_id || null}, ${welcome_points ?? null}, ${big_purchase_threshold ?? null}, ${big_purchase_points ?? null}, ${points ?? null}, ${redeem_points ?? null}, NOW(), NOW()
      )
    `;
    return { created: true };
  }
}
