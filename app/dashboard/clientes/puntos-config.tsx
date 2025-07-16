"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { getProducts, getCategories } from "@/app/actions/products"
import { getPointsConfig, upsertPointsConfig } from "@/app/actions/points-config"


  const [productos, setProductos] = useState<{id:number, name:string, puntos:number}[]>([])
  const [categorias, setCategorias] = useState<{id:number, name:string, puntos:number}[]>([])
  const [welcomePoints, setWelcomePoints] = useState(0)
  const [bigPurchaseThreshold, setBigPurchaseThreshold] = useState(0)
  const [bigPurchasePoints, setBigPurchasePoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [prods, cats, config] = await Promise.all([
        getProducts(),
        getCategories(),
        getPointsConfig()
      ])
      setProductos(prods.map((p: any) => ({
        id: p.id,
        name: p.name,
        puntos: config.find((c: any) => c.product_id === p.id) ? (config.find((c: any) => c.product_id === p.id)?.points || 0) : 0
      })))
      setCategorias(cats.map((c: any) => ({
        id: c.id,
        name: c.name,
        puntos: config.find((pc: any) => pc.category_id === c.id) ? (config.find((pc: any) => pc.category_id === c.id)?.points || 0) : 0
      })))
      setWelcomePoints(config.find((c: any) => c.welcome_points && !c.product_id && !c.category_id)?.welcome_points || 0)
      setBigPurchaseThreshold(config.find((c: any) => c.big_purchase_threshold && !c.product_id && !c.category_id)?.big_purchase_threshold || 0)
      setBigPurchasePoints(config.find((c: any) => c.big_purchase_points && !c.product_id && !c.category_id)?.big_purchase_points || 0)
      setLoading(false)
    }
    fetchAll()
  }, [])

  const handlePuntosProducto = (id: number, puntos: number) => {
    setProductos(productos.map(p => p.id === id ? { ...p, puntos } : p))
  }
  const handlePuntosCategoria = (id: number, puntos: number) => {
    setCategorias(categorias.map(c => c.id === id ? { ...c, puntos } : c))
  }

  const handleGuardar = async () => {
    setSaving(true)
    // Guardar puntos por producto
    await Promise.all(productos.map(p => upsertPointsConfig({ product_id: p.id, points: p.puntos })))
    // Guardar puntos por categoría
    await Promise.all(categorias.map(c => upsertPointsConfig({ category_id: c.id, points: c.puntos })))
    // Guardar puntos de bienvenida
    await upsertPointsConfig({ welcome_points: welcomePoints })
    // Guardar puntos por compra grande
    await upsertPointsConfig({ big_purchase_threshold: bigPurchaseThreshold, big_purchase_points: bigPurchasePoints })
    setSaving(false)
    alert("Configuración guardada")
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Configuración de Puntos de Fidelización</CardTitle>
        <CardDescription>
          Asigna puntos a productos, categorías, bienvenida o por compra grande. Los clientes acumularán puntos según estas reglas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <h3 className="font-semibold mb-2">Puntos por producto</h3>
          {loading ? (
            <div className="text-center text-gray-400 py-8">Cargando productos...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
  return (
                  <TableHead>Puntos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map(producto => (
                  <TableRow key={producto.id}>
                    <TableCell>{producto.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={producto.puntos}
                        onChange={e => handlePuntosProducto(producto.id, Number(e.target.value))}
                        className="w-24 rounded-[30px]"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div>
          <h3 className="font-semibold mb-2">Puntos por categoría</h3>
          {loading ? (
            <div className="text-center text-gray-400 py-8">Cargando categorías...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Puntos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={cat.puntos}
                        onChange={e => handlePuntosCategoria(cat.id, Number(e.target.value))}
                        className="w-24 rounded-[30px]"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div>
          <h3 className="font-semibold mb-2">Puntos de bienvenida</h3>
          <Input
            type="number"
            min={0}
            value={welcomePoints}
            onChange={e => setWelcomePoints(Number(e.target.value))}
            className="w-32 rounded-[30px]"
          />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Puntos por compra grande</h3>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm mb-1">Monto mínimo ($)</label>
              <Input
                type="number"
                min={0}
                value={bigPurchaseThreshold}
                onChange={e => setBigPurchaseThreshold(Number(e.target.value))}
                className="rounded-[30px] w-32"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Puntos por compra grande</label>
              <Input
                type="number"
                min={0}
                value={bigPurchasePoints}
                onChange={e => setBigPurchasePoints(Number(e.target.value))}
                className="rounded-[30px] w-32"
              />
            </div>
          </div>
        </div>
        <Button className="rounded-[30px] w-full mt-4" onClick={handleGuardar} disabled={saving}>
          {saving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </CardContent>
    </Card>
  )
}
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Configuración de Puntos de Fidelización</CardTitle>
        <CardDescription>
          Asigna puntos a productos, categorías, bienvenida o por compra grande. Los clientes acumularán puntos según estas reglas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <h3 className="font-semibold mb-2">Puntos por producto</h3>
          {loading ? (
            <div className="text-center text-gray-400 py-8">Cargando productos...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Puntos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map(producto => (
                  <TableRow key={producto.id}>
                    <TableCell>{producto.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={producto.puntos}
                        onChange={e => handlePuntosProducto(producto.id, Number(e.target.value))}
                        className="w-24 rounded-[30px]"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div>
          <h3 className="font-semibold mb-2">Puntos por categoría</h3>
          {loading ? (
            <div className="text-center text-gray-400 py-8">Cargando categorías...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Puntos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={cat.puntos}
                        onChange={e => handlePuntosCategoria(cat.id, Number(e.target.value))}
                        className="w-24 rounded-[30px]"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div>
          <h3 className="font-semibold mb-2">Puntos de bienvenida</h3>
          <Input
            type="number"
            min={0}
            value={welcomePoints}
            onChange={e => setWelcomePoints(Number(e.target.value))}
            className="w-32 rounded-[30px]"
          />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Puntos por compra grande</h3>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm mb-1">Monto mínimo ($)</label>
              <Input
                type="number"
                min={0}
                value={bigPurchaseThreshold}
                onChange={e => setBigPurchaseThreshold(Number(e.target.value))}
                className="rounded-[30px] w-32"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Puntos por compra grande</label>
              <Input
                type="number"
                min={0}
                value={bigPurchasePoints}
                onChange={e => setBigPurchasePoints(Number(e.target.value))}
                className="rounded-[30px] w-32"
              />
            </div>
          </div>
        </div>
        <Button className="rounded-[30px] w-full mt-4" onClick={handleGuardar} disabled={saving}>
          {saving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </CardContent>
    </Card>
  )
// ...existing code...
