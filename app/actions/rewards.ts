import { getRewardOptions, createRewardOption, deleteRewardOption, redeemReward } from "@/lib/rewards"
import { requireAuth } from "@/lib/auth"

export async function fetchRewardOptions() {
  const user = await requireAuth()
  if (!user) return []
  return getRewardOptions(user.id)
}

export async function addRewardOption(form: { name: string; points_cost: number; description?: string }) {
  const user = await requireAuth()
  if (!user) throw new Error("No autenticado")
  return createRewardOption({ user_id: user.id, ...form })
}

export async function removeRewardOption(id: number) {
  const user = await requireAuth()
  if (!user) throw new Error("No autenticado")
  return deleteRewardOption(id, user.id)
}

export async function redeemRewardAction({ customer_id, reward_id }: { customer_id: number, reward_id: number }) {
  return redeemReward({ customer_id, reward_id })
}
