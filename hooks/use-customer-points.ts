import { useEffect, useState } from "react"

export function useCustomerPoints(order) {
  const [pointsToGain, setPointsToGain] = useState<number|null>(null)
  const [customerPoints, setCustomerPoints] = useState<number|null>(null)

  useEffect(() => {
    if (!order || !order.customer_id) {
      setPointsToGain(null)
      setCustomerPoints(null)
      return
    }
    // Calcular puntos a ganar
    fetch("/api/calc-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: order.customer_id,
        items: order.items?.map(i => ({ product_id: i.product_id, quantity: i.quantity, category_id: i.category_id })),
        total: order.total
      })
    })
      .then(res => res.json())
      .then(data => setPointsToGain(data.points))
    // Obtener puntos actuales
    fetch(`/api/customer-points?customer_id=${order.customer_id}`)
      .then(res => res.json())
      .then(data => setCustomerPoints(data.points))
  }, [order])

  return { pointsToGain, customerPoints }
}
