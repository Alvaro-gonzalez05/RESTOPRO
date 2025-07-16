"use client"

import { useState } from "react"
import { Plus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductsTable } from "./components/products-table"
import { CreateProductForm } from "./components/create-product-form"
import { EditProductForm } from "./components/edit-product-form"
import type { Product, Category } from "@/lib/types"

interface ProductsPageContentProps {
  initialProducts: Product[];
  initialCategories: Category[];
  getProducts: () => Promise<Product[]>;
  getCategories: () => Promise<Category[]>;
}

export default function ProductsPageContent({ initialProducts, initialCategories, getProducts, getCategories }: ProductsPageContentProps) {
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit">("list")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState(initialProducts)
  const [categories, setCategories] = useState(initialCategories)

  const handleCreateProduct = () => setViewMode("create")
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setViewMode("edit")
  }
  const handleBackToList = () => {
    setViewMode("list")
    setEditingProduct(null)
  }
  // Optimizado: fetch solo cuando sea necesario
  const handleProductCreated = async () => {
    const [newProducts, newCategories] = await Promise.all([
      getProducts(),
      getCategories()
    ])
    setProducts(newProducts)
    setCategories(newCategories)
    setViewMode("list")
  }
  const handleProductUpdated = async () => {
    const [newProducts, newCategories] = await Promise.all([
      getProducts(),
      getCategories()
    ])
    setProducts(newProducts)
    setCategories(newCategories)
    setViewMode("list")
    setEditingProduct(null)
  }

  if (viewMode === "create") {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackToList} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver a productos
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Producto</h1>
          <p className="text-muted-foreground">Completa la información del producto</p>
        </div>
        <CreateProductForm categories={categories} onSuccess={handleProductCreated} onCancel={handleBackToList} />
      </div>
    )
  }
  if (viewMode === "edit" && editingProduct) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackToList} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver a productos
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Producto</h1>
          <p className="text-muted-foreground">Modifica la información de "{editingProduct.name}"</p>
        </div>
        <EditProductForm
          product={editingProduct}
          categories={categories}
          onSuccess={handleProductUpdated}
          onCancel={handleBackToList}
        />
      </div>
    )
  }
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">Gestiona el inventario de productos de tu restaurante</p>
        </div>
        <Button size="lg" onClick={handleCreateProduct}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>
      <ProductsTable products={products} categories={categories} onEditProduct={handleEditProduct} />
    </div>
  )
}
