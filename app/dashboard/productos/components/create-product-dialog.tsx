"use client"

import type React from "react"
import { useState, useActionState, useEffect } from "react"
import { Plus, Check, X, Loader2 } from "lucide-react"
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
import { createProduct, createCategory } from "@/app/actions/products"
import type { Category } from "@/lib/types"

interface CreateProductDialogProps {
  categories: Category[]
  children: React.ReactNode
}

export function CreateProductDialog({ categories, children }: CreateProductDialogProps) {
  const [open, setOpen] = useState(false)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("none")
  const [availableCategories, setAvailableCategories] = useState<Category[]>(categories)
  const [isAvailable, setIsAvailable] = useState(true)
  const [state, formAction, isPending] = useActionState(createProduct, null)

  useEffect(() => {
    setAvailableCategories(categories)
  }, [categories])

  useEffect(() => {
    if (state?.success) {
      setOpen(false)
      setSelectedCategory("none")
      setIsCreatingCategory(false)
      setNewCategoryName("")
      setIsAvailable(true)
      // Reset form
      const form = document.getElementById("create-product-form") as HTMLFormElement
      if (form) {
        form.reset()
      }
    }
  }, [state])

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    const formData = new FormData()
    formData.append("name", newCategoryName.trim())

    const result = await createCategory(formData)
    if (result.success && result.category) {
      const newCategories = [...availableCategories, result.category]
      setAvailableCategories(newCategories)
      setSelectedCategory(result.category.id.toString())
      setIsCreatingCategory(false)
      setNewCategoryName("")
    } else {
      alert(result.error || "Error al crear categoría")
    }
  }

  const handleCancelCreateCategory = () => {
    setIsCreatingCategory(false)
    setNewCategoryName("")
    setSelectedCategory("none")
  }

  const handleSubmit = (formData: FormData) => {
    // Agregar el estado de disponibilidad al FormData
    formData.set("isAvailable", isAvailable ? "on" : "off")
    formData.set("categoryId", selectedCategory)
    formAction(formData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Producto</DialogTitle>
          <DialogDescription>
            Agrega un nuevo producto a tu menú. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form id="create-product-form" action={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del Producto *</Label>
            <Input id="name" name="name" placeholder="Ej: Pizza Margherita" required disabled={isPending} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="price">Precio *</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label>Categoría</Label>
            {!isCreatingCategory ? (
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  if (value === "new") {
                    setIsCreatingCategory(true)
                  } else {
                    setSelectedCategory(value)
                  }
                }}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">
                    <div className="flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Categoría
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre de la nueva categoría"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleCreateCategory()
                    }
                    if (e.key === "Escape") {
                      handleCancelCreateCategory()
                    }
                  }}
                  autoFocus
                  disabled={isPending}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || isPending}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCancelCreateCategory}
                  disabled={isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descripción del producto..."
              rows={3}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="imageUrl">URL de Imagen</Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              placeholder="https://ejemplo.com/imagen.jpg"
              disabled={isPending}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAvailable"
              checked={isAvailable}
              onCheckedChange={(checked) => setIsAvailable(checked as boolean)}
              disabled={isPending}
            />
            <Label htmlFor="isAvailable">Producto disponible</Label>
          </div>

          {state?.error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">{state.error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Producto"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
