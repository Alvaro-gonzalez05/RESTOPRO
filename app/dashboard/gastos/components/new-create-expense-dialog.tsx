"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createExpense } from "@/app/actions/expenses"
import { getSuppliers } from "@/app/actions/suppliers"

interface CreateExpenseDialogProps {
  open: boolean
  onClose: () => void
  onExpenseCreated: () => void
}

export function CreateExpenseDialog({ open, onClose, onExpenseCreated }: CreateExpenseDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [formData, setFormData] = useState({
    supplier_id: "",
    supplier_name: "",
    description: "",
    amount: "",
    category: "",
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: "efectivo",
    receipt_number: "",
    notes: ""
  })

  const categories = [
    { value: "ingredientes", label: "Ingredientes" },
    { value: "equipos", label: "Equipos" },
    { value: "servicios", label: "Servicios" },
    { value: "mantenimiento", label: "Mantenimiento" },
    { value: "marketing", label: "Marketing" },
    { value: "otros", label: "Otros" }
  ]

  const paymentMethods = [
    { value: "efectivo", label: "Efectivo" },
    { value: "tarjeta", label: "Tarjeta" },
    { value: "transferencia", label: "Transferencia" },
    { value: "cheque", label: "Cheque" }
  ]

  useEffect(() => {
    if (open) {
      loadSuppliers()
      // Reset form cuando se abre el diálogo
      setFormData({
        supplier_id: "",
        supplier_name: "",
        description: "",
        amount: "",
        category: "",
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: "efectivo",
        receipt_number: "",
        notes: ""
      })
    }
  }, [open])

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
    
    // Validaciones
    if (!formData.description.trim()) {
      toast.error("La descripción es requerida")
      return
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("El monto debe ser mayor a 0")
      return
    }
    
    if (!formData.supplier_name.trim()) {
      toast.error("El nombre del proveedor es requerido")
      return
    }
    
    if (!formData.expense_date) {
      toast.error("La fecha del gasto es requerida")
      return
    }

    setIsLoading(true)
    try {
      const result = await createExpense({
        ...formData,
        amount: parseFloat(formData.amount),
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null
      })
      
      if (result.success) {
        toast.success("Gasto creado exitosamente")
        onExpenseCreated()
        onClose()
      } else {
        toast.error(result.error || "Error al crear gasto")
      }
    } catch (error) {
      console.error("Error creating expense:", error)
      toast.error("Error al crear gasto")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Gasto</DialogTitle>
          <DialogDescription>
            Registra un nuevo gasto para tu restaurante. Los campos marcados con * son obligatorios.
          </DialogDescription>
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
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descripción *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe el gasto (ej: Compra de ingredientes)"
              required
              disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, category: value })} value={formData.category}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
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
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="payment_method">Método de Pago</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, payment_method: value })} value={formData.payment_method}>
                <SelectTrigger>
                  <SelectValue placeholder="Método de pago" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="receipt_number">Número de Recibo/Factura</Label>
            <Input
              id="receipt_number"
              value={formData.receipt_number}
              onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
              placeholder="Número de recibo, factura o comprobante"
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Información adicional sobre el gasto"
              rows={3}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear Gasto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
