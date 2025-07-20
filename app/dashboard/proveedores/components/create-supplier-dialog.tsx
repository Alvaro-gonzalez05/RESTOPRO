"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createSupplier } from "@/app/actions/suppliers"
import { toast } from "sonner"

interface CreateSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSupplierDialog({ open, onOpenChange }: CreateSupplierDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const supplierData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string || null,
      phone: formData.get("phone") as string || null,
      address: formData.get("address") as string || null,
      contact_person: formData.get("contact_person") as string || null,
    }

    // Validation
    if (!supplierData.name.trim()) {
      toast.error("El nombre del proveedor es requerido")
      setIsLoading(false)
      return
    }

    if (supplierData.email && !/\S+@\S+\.\S+/.test(supplierData.email)) {
      toast.error("Por favor ingresa un email válido")
      setIsLoading(false)
      return
    }

    try {
      await createSupplier(supplierData)
      toast.success("Proveedor creado exitosamente")
      onOpenChange(false)
      // Reset form
      ;(e.target as HTMLFormElement).reset()
      // Refresh the page to update the list
      window.location.reload()
    } catch (error) {
      console.error("Error creating supplier:", error)
      toast.error("Error al crear el proveedor")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Proveedor</DialogTitle>
          <DialogDescription>
            Agrega un nuevo proveedor a tu sistema. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Proveedor *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ej: Distribuidora ABC"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_person">Persona de Contacto</Label>
              <Input
                id="contact_person"
                name="contact_person"
                placeholder="Ej: Juan Pérez"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@ejemplo.com"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="Ej: +1234567890"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                name="address"
                placeholder="Dirección completa del proveedor"
                className="min-h-[80px]"
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear Proveedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
