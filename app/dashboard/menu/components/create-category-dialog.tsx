"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Loader2 } from "lucide-react"
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
import { createCategory } from "@/app/actions/products"

interface CreateCategoryDialogProps {
  children: React.ReactNode
}

export function CreateCategoryDialog({ children }: CreateCategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await createCategory(formData)

      if (result.success) {
        setOpen(false)
        // Reset form
        const form = document.getElementById("create-category-form") as HTMLFormElement
        if (form) {
          form.reset()
        }
      } else {
        setError(result.error || "Error al crear la categoría")
      }
    } catch (error) {
      setError("Error al crear la categoría")
    } finally {
      setIsLoading(false)
    }
  }

  // Reset error when dialog closes
  useEffect(() => {
    if (!open) {
      setError(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nueva Categoría</DialogTitle>
          <DialogDescription>Crea una nueva categoría para organizar tus productos.</DialogDescription>
        </DialogHeader>

        <form id="create-category-form" action={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="category-name">Nombre de la Categoría *</Label>
            <Input
              id="category-name"
              name="name"
              placeholder="Ej: Pizzas, Bebidas, Postres..."
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Categoría
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
