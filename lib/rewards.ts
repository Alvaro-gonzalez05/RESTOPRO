import { sql } from "./db"

export interface RewardOption {
  id: number
  user_id: number
  name: string
  points_cost: number
  description?: string
  created_at: string
}

export async function getRewardOptions(userId: number): Promise<RewardOption[]> {
  const rows = await sql`SELECT * FROM rewards WHERE user_id = ${userId} ORDER BY points_cost ASC`
  return rows as RewardOption[]
}

export async function createRewardOption({ user_id, name, points_cost, description }: { user_id: number, name: string, points_cost: number, description?: string }): Promise<RewardOption> {
  const rows = await sql`
    INSERT INTO rewards (user_id, name, points_cost, description)
    VALUES (${user_id}, ${name}, ${points_cost}, ${description})
    RETURNING *
  `
  return (rows as RewardOption[])[0]
}

export async function deleteRewardOption(id: number, userId: number): Promise<void> {
  await sql`DELETE FROM rewards WHERE id = ${id} AND user_id = ${userId}`
}

export async function redeemReward({ customer_id, reward_id }: { customer_id: number, reward_id: number }): Promise<{ success: boolean; message: string }> {
  // Get reward and customer points
  const rewardsRows = await sql`SELECT * FROM rewards WHERE id = ${reward_id}`
  const reward = (rewardsRows as RewardOption[])[0]
  if (!reward) return { success: false, message: "Opción de canje no encontrada" }
  const customerRows = await sql`SELECT * FROM customers WHERE id = ${customer_id}`
  const customer = customerRows[0] as any
  if (!customer) return { success: false, message: "Cliente no encontrado" }
  if ((customer.points ?? 0) < reward.points_cost) return { success: false, message: "Puntos insuficientes" }
  // Descontar puntos
  await sql`UPDATE customers SET points = points - ${reward.points_cost} WHERE id = ${customer_id}`
  return { success: true, message: `Canje exitoso: ${reward.name}` }
}
