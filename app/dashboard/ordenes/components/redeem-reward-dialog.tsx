"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
// Usar fetch a /api/rewards en vez de importar server actions
import { toast } from "sonner"

interface RedeemRewardDialogProps {
  customerId: number;
  orderId: number;
  onRedeem?: () => void;
  redeemedProducts: { product_id: number, quantity: number }[];
  setRedeemedProducts: (products: { product_id: number, quantity: number }[]) => void;
  orderItems: any[];
}

export default function RedeemRewardDialog({ customerId, orderId, onRedeem, redeemedProducts, setRedeemedProducts, orderItems }: RedeemRewardDialogProps) {
  // Estado para controlar la apertura/cierre del Dialog
  const [open, setOpen] = useState(false);
  // Estado de carga para el fetch de productos canjeables
  const [loading, setLoading] = useState(false);
  // Estado para los productos canjeables
  const [products, setProducts] = useState<any[]>([]);
  // Estado para los puntos actuales del cliente
  const [customerPoints, setCustomerPoints] = useState(0);
  // Estado para el producto seleccionado y la cantidad a canjear
  const [selected, setSelected] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Cargar productos canjeables y puntos del cliente al abrir el diálogo
  useEffect(() => {
    if (!open || !customerId) return;
    setLoading(true);
    fetch(`/api/redeemable-products?customer_id=${customerId}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setCustomerPoints(data.points || 0);
      })
      .catch(() => {
        setProducts([]);
        setCustomerPoints(0);
        toast.error('No se pudieron cargar los productos canjeables');
      })
      .finally(() => setLoading(false));
  }, [open, customerId]);
  // Handler para el botón de canjear
  const handleRedeem = async () => {
    if (!selected || !quantity || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/redeem-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          product_id: selected,
          order_id: orderId,
          quantity
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al canjear");
      // Actualizar productos canjeados en el estado padre
      const prev = redeemedProducts.find(rp => rp.product_id === selected);
      const nuevaCantidad = (prev?.quantity || 0) + quantity;
      setRedeemedProducts([
        ...redeemedProducts.filter(rp => rp.product_id !== selected),
        { product_id: selected, quantity: nuevaCantidad }
      ]);
      setOpen(false);
      toast.success(data.message || "Canje exitoso");
      if (onRedeem) onRedeem();
    } catch (e: any) {
      toast.error(e.message || "Error al canjear");
    } finally {
      setLoading(false);
    }
  };
  // Filtrar productos canjeables: solo redeem_points > 0 y sin duplicados
  const canjeables = products
    .filter(p => p.redeem_points > 0)
    .filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-[30px] bg-black text-white hover:bg-neutral-800" disabled={!customerId}>
          Canjear Puntos
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Canjear Puntos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="font-medium">Productos canjeables:</div>
          <ul className="space-y-2 min-h-[40px]">
            {loading ? (
              <li className="flex justify-center items-center py-4">
                <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
              </li>
            ) : (
              <>
                {canjeables.map(p => {
                  // Calcular máximo canjeable según puntos y cantidad en la orden
                  const orderItem = orderItems.find(oi => oi.product_id === p.id);
                  const prev = redeemedProducts.find(rp => rp.product_id === p.id);
                  const yaCanjeados = prev ? prev.quantity : 0;
                  const cantidadDisponible = orderItem ? orderItem.quantity - yaCanjeados : 0;
                  const maxPorPuntos = p.redeem_points > 0 ? Math.floor(customerPoints / p.redeem_points) : 0;
                  const max = Math.max(1, Math.min(cantidadDisponible, maxPorPuntos));
                  return (
                    <li
                      key={p.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-colors ${selected === p.id ? 'bg-neutral-200 border-black' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                      onClick={() => { setSelected(p.id); setQuantity(1); }}
                    >
                      <input type="radio" checked={selected === p.id} onChange={() => { setSelected(p.id); setQuantity(1); }} />
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-gray-500">({p.redeem_points} pts)</span>
                      {selected === p.id && cantidadDisponible > 1 && max > 1 && (
                        <input
                          type="number"
                          min={1}
                          max={max}
                          value={quantity}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setQuantity(Math.max(1, Math.min(Number(e.target.value), max)))}
                          className="ml-2 w-16 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          style={{ background: 'white', borderColor: '#e5e7eb' }}
                        />
                      )}
                    </li>
                  );
                })}
                {canjeables.length === 0 && <li className="text-xs text-gray-400">No hay productos canjeables.</li>}
              </>
            )}
          </ul>
          <div className="text-xs text-gray-500 text-right mb-2">Puntos actuales del cliente: <b>{customerPoints}</b></div>
          <div className="flex gap-2">
            <Button className="rounded-[30px] flex-1 bg-black text-white hover:bg-neutral-800" onClick={handleRedeem} disabled={!selected || loading}>{loading ? "Canjeando..." : "Canjear"}</Button>
            {selected && redeemedProducts.find(rp => rp.product_id === selected) && (
              <Button
                type="button"
                variant="outline"
                className="rounded-[30px] flex-1 border border-red-400 text-red-600 hover:bg-red-50"
                onClick={async () => {
                  const prev = redeemedProducts.find(rp => rp.product_id === selected);
                  if (prev && prev.quantity > 0) {
                    setLoading(true);
                    try {
                      await fetch("/api/revert-redeem-product", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          order_id: orderId,
                          product_id: selected,
                          quantity: prev.quantity
                        })
                      });
                    } catch {}
                    setLoading(false);
                  }
                  setRedeemedProducts(redeemedProducts.filter(rp => rp.product_id !== selected));
                  setSelected(null);
                  setQuantity(1);
                  // Refrescar productos canjeables para recalcular maxCanjeable
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/redeemable-products?customer_id=${customerId}`);
                    const data = await res.json();
                    setProducts(data.products || []);
                    setCustomerPoints(data.points || 0);
                  } catch {
                    setProducts([]);
                  } finally {
                    setLoading(false);
                  }
                  toast.success('Opción de canje descartada');
                }}
                disabled={loading}
              >
                Descartar opción de canje
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
