"use client"

// Forzar renderizado dinámico para evitar errores de build
// export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

import { getProducts, getCategories } from "@/app/actions/products"
import { getPointsConfig, upsertPointsConfig } from "@/app/actions/points-config"

interface Product {
  id: number
  name: string
  points: number
  redeem_points: number
}

interface Category {
  id: number
  name: string
  points: number
  redeem_points: number
}

export default function PuntosConfigPage() {
  const [productos, setProductos] = useState<Product[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [welcomePoints, setWelcomePoints] = useState(0)
  const [bigPurchaseThreshold, setBigPurchaseThreshold] = useState(0)
  const [bigPurchasePoints, setBigPurchasePoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Estado para rastrear solo los cambios que hace el usuario
  const [changedItems, setChangedItems] = useState({
    products: new Set<number>(),
    categories: new Set<number>(),
    welcomeChanged: false,
    purchaseChanged: false
  })

  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    setLoading(true)
    try {
      console.log("Cargando configuración...")
      const [products, categories, config] = await Promise.all([
        getProducts(),
        getCategories(),
        getPointsConfig()
      ])

      // Configurar productos con sus puntos
      const productosConfig = products.map((p: any) => {
        const productConfig = config.find((c: any) => c.product_id === p.id)
        return {
          id: p.id,
          name: p.name,
          points: productConfig?.points || 0,
          redeem_points: productConfig?.redeem_points || 0
        }
      })

      // Configurar categorías con sus puntos
      const categoriasConfig = categories.map((c: any) => {
        const categoryConfig = config.find((pc: any) => pc.category_id === c.id)
        return {
          id: c.id,
          name: c.name,
          points: categoryConfig?.points || 0,
          redeem_points: categoryConfig?.redeem_points || 0
        }
      })

      // Configurar puntos globales
      const globalConfig = config.find((c: any) => !c.product_id && !c.category_id)
      
      setProductos(productosConfig)
      setCategorias(categoriasConfig)
      setWelcomePoints(globalConfig?.welcome_points || 0)
      setBigPurchaseThreshold(globalConfig?.big_purchase_threshold || 0)
      setBigPurchasePoints(globalConfig?.big_purchase_points || 0)

      console.log("Configuración cargada:", {
        productos: productosConfig.length,
        categorias: categoriasConfig.length,
        welcome: globalConfig?.welcome_points || 0
      })
    } catch (error) {
      console.error("Error loading configuration:", error)
      toast.error("Error al cargar la configuración")
    } finally {
      setLoading(false)
    }
  }

  // Handlers para cambios en productos
  const handleProductPointsChange = (productId: number, points: number) => {
    console.log(`Cambiando puntos del producto ${productId} a ${points}`)
    setProductos(prev => prev.map(p => 
      p.id === productId ? { ...p, points } : p
    ))
    setChangedItems(prev => ({
      ...prev,
      products: new Set(prev.products).add(productId)
    }))
  }

  const handleProductRedeemChange = (productId: number, redeem_points: number) => {
    console.log(`Cambiando puntos de canje del producto ${productId} a ${redeem_points}`)
    setProductos(prev => prev.map(p => 
      p.id === productId ? { ...p, redeem_points } : p
    ))
    setChangedItems(prev => ({
      ...prev,
      products: new Set(prev.products).add(productId)
    }))
  }

  // Handlers para cambios en categorías
  const handleCategoryPointsChange = (categoryId: number, points: number) => {
    console.log(`Cambiando puntos de la categoría ${categoryId} a ${points}`)
    setCategorias(prev => prev.map(c => 
      c.id === categoryId ? { ...c, points } : c
    ))
    setChangedItems(prev => ({
      ...prev,
      categories: new Set(prev.categories).add(categoryId)
    }))
  }

  const handleCategoryRedeemChange = (categoryId: number, redeem_points: number) => {
    console.log(`Cambiando puntos de canje de la categoría ${categoryId} a ${redeem_points}`)
    setCategorias(prev => prev.map(c => 
      c.id === categoryId ? { ...c, redeem_points } : c
    ))
    setChangedItems(prev => ({
      ...prev,
      categories: new Set(prev.categories).add(categoryId)
    }))
  }

  // Handlers para configuración global
  const handleWelcomePointsChange = (value: number) => {
    console.log(`Cambiando puntos de bienvenida a ${value}`)
    setWelcomePoints(value)
    setChangedItems(prev => ({ ...prev, welcomeChanged: true }))
  }

  const handlePurchaseThresholdChange = (value: number) => {
    console.log(`Cambiando umbral de compra grande a ${value}`)
    setBigPurchaseThreshold(value)
    setChangedItems(prev => ({ ...prev, purchaseChanged: true }))
  }

  const handlePurchasePointsChange = (value: number) => {
    console.log(`Cambiando puntos por compra grande a ${value}`)
    setBigPurchasePoints(value)
    setChangedItems(prev => ({ ...prev, purchaseChanged: true }))
  }

  // Función para guardar solo los cambios
  const saveConfiguration = async () => {
    setSaving(true)
    try {
      console.log("=== INICIANDO GUARDADO ===")
      console.log("Elementos cambiados:", {
        products: Array.from(changedItems.products),
        categories: Array.from(changedItems.categories),
        welcomeChanged: changedItems.welcomeChanged,
        purchaseChanged: changedItems.purchaseChanged
      })

      // Guardar solo productos que fueron modificados
      for (const productId of changedItems.products) {
        const producto = productos.find(p => p.id === productId)
        if (producto) {
          console.log(`Guardando producto ${productId}:`, { 
            points: producto.points, 
            redeem_points: producto.redeem_points 
          })
          await upsertPointsConfig({
            product_id: producto.id,
            points: producto.points,
            redeem_points: producto.redeem_points
          })
        }
      }

      // Guardar solo categorías que fueron modificadas
      for (const categoryId of changedItems.categories) {
        const categoria = categorias.find(c => c.id === categoryId)
        if (categoria) {
          console.log(`Guardando categoría ${categoryId}:`, { 
            points: categoria.points, 
            redeem_points: categoria.redeem_points 
          })
          await upsertPointsConfig({
            category_id: categoria.id,
            points: categoria.points,
            redeem_points: categoria.redeem_points
          })
        }
      }

      // Guardar puntos de bienvenida solo si cambió
      if (changedItems.welcomeChanged) {
        console.log("Guardando puntos de bienvenida:", welcomePoints)
        await upsertPointsConfig({ welcome_points: welcomePoints })
      }

      // Guardar configuración de compra grande solo si cambió
      if (changedItems.purchaseChanged) {
        console.log("Guardando configuración de compra grande:", {
          threshold: bigPurchaseThreshold,
          points: bigPurchasePoints
        })
        await upsertPointsConfig({
          big_purchase_threshold: bigPurchaseThreshold,
          big_purchase_points: bigPurchasePoints
        })
      }

      // Limpiar cambios después de guardar
      setChangedItems({
        products: new Set(),
        categories: new Set(),
        welcomeChanged: false,
        purchaseChanged: false
      })

      console.log("=== GUARDADO COMPLETADO ===")
      toast.success("Configuración guardada exitosamente")
    } catch (error) {
      console.error("Error al guardar:", error)
      toast.error("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  // Verificar si hay cambios pendientes
  const hasChanges = () => {
    return changedItems.products.size > 0 || 
           changedItems.categories.size > 0 || 
           changedItems.welcomeChanged || 
           changedItems.purchaseChanged
  }

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center">Cargando configuración...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Configuración de Puntos de Fidelización</CardTitle>
        <CardDescription>
          Configura los puntos que los clientes ganarán y podrán canjear por productos, categorías y acciones especiales.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Puntos por Producto */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Puntos por Producto</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Puntos Ganados</TableHead>
                <TableHead>Puntos para Canjear</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((producto) => (
                <TableRow key={producto.id}>
                  <TableCell className="font-medium">{producto.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={producto.points}
                      onChange={(e) => handleProductPointsChange(producto.id, Number(e.target.value))}
                      className="w-24"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={producto.redeem_points}
                      onChange={(e) => handleProductRedeemChange(producto.id, Number(e.target.value))}
                      className="w-24"
                      placeholder="0"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Separator />

        {/* Puntos por Categoría */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Puntos por Categoría</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead>Puntos Ganados</TableHead>
                <TableHead>Puntos para Canjear</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell className="font-medium">{categoria.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={categoria.points}
                      onChange={(e) => handleCategoryPointsChange(categoria.id, Number(e.target.value))}
                      className="w-24"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={categoria.redeem_points}
                      onChange={(e) => handleCategoryRedeemChange(categoria.id, Number(e.target.value))}
                      className="w-24"
                      placeholder="0"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Separator />

        {/* Puntos de Bienvenida */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="welcome-points" className="text-base font-semibold">
              Puntos de Bienvenida
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Puntos otorgados al registrar un nuevo cliente
            </p>
            <Input
              id="welcome-points"
              type="number"
              min="0"
              value={welcomePoints}
              onChange={(e) => handleWelcomePointsChange(Number(e.target.value))}
              placeholder="0"
            />
          </div>

          {/* Puntos por Compra Grande */}
          <div>
            <Label className="text-base font-semibold">Puntos por Compra Grande</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Puntos bonus por superar un monto mínimo
            </p>
            <div className="space-y-2">
              <Input
                type="number"
                min="0"
                value={bigPurchaseThreshold}
                onChange={(e) => handlePurchaseThresholdChange(Number(e.target.value))}
                placeholder="Monto mínimo"
              />
              <Input
                type="number"
                min="0"
                value={bigPurchasePoints}
                onChange={(e) => handlePurchasePointsChange(Number(e.target.value))}
                placeholder="Puntos bonus"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Botón de Guardar */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {hasChanges() ? "Hay cambios sin guardar" : "Sin cambios pendientes"}
          </div>
          <Button 
            onClick={saveConfiguration} 
            disabled={saving || !hasChanges()}
            className="min-w-[200px]"
          >
            {saving ? "Guardando..." : hasChanges() ? "Guardar Cambios" : "Sin Cambios"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}