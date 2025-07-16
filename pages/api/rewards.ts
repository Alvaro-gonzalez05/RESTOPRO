import type { NextApiRequest, NextApiResponse } from "next"
import { getRewardOptions, createRewardOption, deleteRewardOption, redeemReward } from "@/lib/rewards"
import { getCurrentUser } from "@/lib/auth"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log cookies y método
  console.log("[API][rewards] method:", req.method)
  console.log("[API][rewards] cookies:", req.cookies)
  // Log el header cookie crudo
  console.log("[API][rewards] raw cookie header:", req.headers.cookie)
  const user = await getCurrentUser()
  console.log("[API][rewards] user:", user)
  if (!user) return res.status(401).json({ error: "No autenticado" })
  // ...existing code...
  if (req.method === "GET") {
    const rewards = await getRewardOptions(user.id)
    return res.status(200).json(rewards)
  }
  if (req.method === "POST") {
    const { name, points_cost, description } = req.body
    if (!name || !points_cost) return res.status(400).json({ error: "Faltan datos" })
    const reward = await createRewardOption({ user_id: user.id, name, points_cost, description })
    return res.status(201).json(reward)
  }
  if (req.method === "DELETE") {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: "Falta id" })
    await deleteRewardOption(id, user.id)
    return res.status(204).end()
  }
  if (req.method === "PUT") {
    const { customer_id, reward_id } = req.body
    if (!customer_id || !reward_id) return res.status(400).json({ error: "Faltan datos" })
    const result = await redeemReward({ customer_id, reward_id })
    return res.status(200).json(result)
  }
  return res.status(405).json({ error: "Método no permitido" })
}

