"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { updateExpense } from "@/app/actions/expenses"
import { getSuppliers } from "@/app/actions/suppliers"

interface EditExpenseDialogProps {
  open: boolean
  onClose: () => void
  expense: any
  onExpenseUpdated: () => void
}

export function EditExpenseDialog({ open, onClose, expense, onExpenseUpdated }: EditExpenseDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [formData, setFormData] = useState({
    supplier_id: "",
    supplier_name: "",
    description: "",
    amount: "",
    category: "",
    expense_date: "",
    payment_method: "efectivo",
    receipt_number: "",
    notes: ""
  })

  useEffect(() => {
    if (open && expense) {
      setFormData({
        supplier_id: expense.supplier_id?.toString() || "",
        supplier_name: expense.supplier_name || "",
        description: expense.description || "",
        amount: expense.amount?.toString() || "",
        category: expense.category || "",
        expense_date: expense.expense_date || "",
        payment_method: expense.payment_method || "efectivo",
        receipt_number: expense.receipt_number || "",
        notes: expense.notes || ""
      })
      loadSuppliers()
    }
  }, [open, expense])

  const loadSuppliers = async () => {
    try {
      const result = await getSuppliers()
      setSuppliers(result)
    } catch (error) {
      console.error("Error loading suppliers:", error)
    }
  }

  const handleSupplierChange = (value: string) => {
    if (value === "otros") {
      setFormData({ ...formData, supplier_id: "", supplier_name: "" })
    } else {
      const supplier = suppliers.find(s => s.id.toString() === value)
      setFormData({ 
        ...formData, 
        supplier_id: value,
        supplier_name: supplier?.name || ""
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description.trim() || !formData.amount || !formData.supplier_name.trim()) {
      toast.error("Complete los campos requeridos")
      return
    }

    setIsLoading(true)
    try {
      const result = await updateExpense(expense.id, {
        ...formData,
        amount: parseFloat(formData.amount),
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null
      })
      
      if (result.success) {
        toast.success("Gasto actualizado exitosamente")
        onExpenseUpdated()
      } else {
        toast.error(result.error || "Error al actualizar gasto")
      }
    } catch (error) {
      toast.error("Error al actualizar gasto")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Gasto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier">Proveedor *</Label>
              <Select onValueChange={handleSupplierChange} value={formData.supplier_id || "otros"}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="otros">Otros...</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="supplier_name">Nombre del Proveedor *</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                placeholder="Nombre del proveedor"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descripción *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del gasto"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Monto *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, category: value })} value={formData.category}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingredientes">Ingredientes</SelectItem>
                  <SelectItem value="equipos">Equipos</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expense_date">Fecha del Gasto *</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="payment_method">Método de Pago</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, payment_method: value })} value={formData.payment_method}>
                <SelectTrigger>
                  <SelectValue placeholder="Método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="receipt_number">Número de Recibo</Label>
            <Input
              id="receipt_number"
              value={formData.receipt_number}
              onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
              placeholder="Número de recibo o factura"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Actualizando..." : "Actualizar Gasto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
