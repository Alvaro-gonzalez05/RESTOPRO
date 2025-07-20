"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
    notes: ""
  })

  const categories = [
    { value: "ingredientes", label: "Ingredientes" },
    { value: "servicios", label: "Servicios" },
    { value: "equipos", label: "Equipos" },
    { value: "mantenimiento", label: "Mantenimiento" },
    { value: "marketing", label: "Marketing" },
    { value: "otros", label: "Otros" }
  ]

  const paymentMethods = [
    { value: "efectivo", label: "Efectivo" },
    { value: "tarjeta", label: "Tarjeta" },
    { value: "transferencia", label: "Transferencia" },
    { value: "credito", label: "Crédito" }
  ]

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const suppliersData = await getSuppliers()
        setSuppliers(suppliersData)
      } catch (error) {
        console.error("Error loading suppliers:", error)
      }
    }
    
    if (open) {
      loadSuppliers()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description.trim() || !formData.amount || !formData.category) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    setIsLoading(true)
    try {
      await createExpense({
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        supplier_name: formData.supplier_name || null,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
        notes: formData.notes || null
      })
      
      toast.success("Gasto creado exitosamente")
      onExpenseCreated()
      resetForm()
    } catch (error) {
      toast.error("Error al crear el gasto")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      supplier_name: "",
      description: "",
      amount: "",
      category: "",
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: "efectivo",
      notes: ""
    })
  }

  const handleSupplierChange = (value: string) => {
    if (value === "otros") {
      setFormData(prev => ({
        ...prev,
        supplier_id: "",
        supplier_name: ""
      }))
    } else {
      const selectedSupplier = suppliers.find(s => s.id.toString() === value)
      setFormData(prev => ({
        ...prev,
        supplier_id: value,
        supplier_name: selectedSupplier?.name || ""
      }))
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      resetForm()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Gasto</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense_date">Fecha del Gasto *</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Monto *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              placeholder="Describe el gasto..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
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

            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pago</Label>
              <Select value={formData.payment_method} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}>
                <SelectTrigger>
                  <SelectValue />
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

          <div className="space-y-2">
            <Label htmlFor="supplier">Proveedor</Label>
            <Select value={formData.supplier_id} onValueChange={handleSupplierChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor o 'Otros'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="otros">Otros</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.supplier_id === "" && (
            <div className="space-y-2">
              <Label htmlFor="supplier_name">Nombre del Proveedor</Label>
              <Input
                id="supplier_name"
                placeholder="Ingresa el nombre del proveedor"
                value={formData.supplier_name}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Creando..." : "Crear Gasto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
