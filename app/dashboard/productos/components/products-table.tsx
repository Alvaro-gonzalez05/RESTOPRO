"use client"

import { useState } from "react"
import { MoreHorizontal, Edit, Trash2, Eye, EyeOff, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { deleteProduct } from "@/app/actions/products"
import type { Product, Category } from "@/lib/types"

interface ProductsTableProps {
  products: Product[]
  categories: Category[]
  onEditProduct: (product: Product) => void
}

export function ProductsTable({ products, categories, onEditProduct }: ProductsTableProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return

    setDeletingId(id)
    try {
      const result = await deleteProduct(id)
      if (!result.success) {
        alert(result.error || "Error al eliminar el producto")
      }
      // La página padre se encargará de actualizar la lista
    } catch (error) {
      alert("Error al eliminar el producto")
    } finally {
      setDeletingId(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>No hay productos</CardTitle>
          <CardDescription>Comienza agregando tu primer producto usando el botón "Nuevo Producto".</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">Tu lista de productos está vacía</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todos los productos</CardTitle>
        <CardDescription>Lista completa de productos ({products.length} productos)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url || "/placeholder.svg"}
                          alt={product.name}
                          className="w-10 h-10 rounded-md object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                            const placeholder = target.nextElementSibling as HTMLElement
                            if (placeholder) {
                              placeholder.classList.remove("hidden")
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center ${product.image_url ? "hidden" : ""}`}
                      >
                        <span className="text-gray-500 text-xs font-medium">
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">{product.description}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.category_name ? (
                      <Badge variant="secondary">{product.category_name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin categoría</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{formatPrice(product.price)}</TableCell>
                  <TableCell>
                    <Badge variant={product.is_available ? "default" : "secondary"}>
                      {product.is_available ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Disponible
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          No disponible
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEditProduct(product)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(product.id)}
                          disabled={deletingId === product.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === product.id ? "Eliminando..." : "Eliminar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
