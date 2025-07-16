"use client"

import type React from "react"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { updateProduct } from "@/app/actions/products"
import type { Product, Category } from "@/lib/types"

interface EditProductDialogProps {
  product: Product
  categories: Category[]
  children: React.ReactNode
}

export function EditProductDialog({ product, categories, children }: EditProductDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>(
    product.category_id ? product.category_id.toString() : "none",
  )
  const [isAvailable, setIsAvailable] = useState(product.is_available)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    try {
      formData.set("isAvailable", isAvailable ? "on" : "off")
      formData.set("categoryId", selectedCategory)

      const result = await updateProduct(product.id, formData)

      if (result.success) {
        setOpen(false)
      } else {
        alert(result.error || "Error al actualizar el producto")
      }
    } catch (error) {
      alert("Error al actualizar el producto")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
          <DialogDescription>
            Modifica la información del producto. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Nombre del Producto *</Label>
            <Input
              id="edit-name"
              name="name"
              defaultValue={product.name}
              placeholder="Ej: Pizza Margherita"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-price">Precio *</Label>
            <Input
              id="edit-price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product.price}
              placeholder="0.00"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-2">
            <Label>Categoría</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-description">Descripción</Label>
            <Textarea
              id="edit-description"
              name="description"
              defaultValue={product.description || ""}
              placeholder="Descripción del producto..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-imageUrl">URL de Imagen</Label>
            <Input
              id="edit-imageUrl"
              name="imageUrl"
              type="url"
              defaultValue={product.image_url || ""}
              placeholder="https://ejemplo.com/imagen.jpg"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-isAvailable"
              checked={isAvailable}
              onCheckedChange={(checked) => setIsAvailable(checked as boolean)}
              disabled={isLoading}
            />
            <Label htmlFor="edit-isAvailable">Producto disponible</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar Producto"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
