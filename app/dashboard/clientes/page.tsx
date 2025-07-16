"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import dynamic from "next/dynamic"
const RewardsManager = dynamic(() => import("./components/rewards-manager"), { ssr: false })
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/app/actions/customers"
import { Pencil, Trash2, RotateCcw } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/sweetalert"
import { Search, Info } from "lucide-react"
import { getOrders } from "@/app/actions/orders"

interface Cliente {
  id: number
  nombre: string
  telefono: string
  email?: string
  direccion?: string
  puntos: number
}

const clientesMock: Cliente[] = [
  { id: 1, nombre: "Juan Pérez", telefono: "123456789", puntos: 120 },
  { id: 2, nombre: "Ana López", telefono: "987654321", puntos: 80 },
]

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  const [direccion, setDireccion] = useState("")
  const [open, setOpen] = useState(false)
  const [editCliente, setEditCliente] = useState<Cliente | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [detalleCliente, setDetalleCliente] = useState<Cliente | null>(null)
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [detalleData, setDetalleData] = useState<any>(null)

  // Cargar clientes desde la base de datos
  useEffect(() => {
    async function fetchClientes() {
      const data = await getCustomers("")
      setClientes(data.map((c: any) => ({
        id: c.id,
        nombre: c.name,
        telefono: c.phone,
        email: c.email,
        direccion: c.address,
        puntos: c.points ?? 0,
      })))
    }
    fetchClientes()
  }, [])

  const handleAddCliente = async () => {
    if (!nombre.trim() || !telefono.trim()) return
    setIsLoading(true)
    try {
      const nuevo = await createCustomer({
        name: nombre.trim(),
        phone: telefono.trim(),
        email: email.trim() || undefined,
        address: direccion.trim() || undefined,
      })
      setClientes(prev => [
        ...prev,
        {
          id: nuevo.id,
          nombre: nuevo.name,
          telefono: nuevo.phone,
          email: nuevo.email,
          direccion: nuevo.address,
          puntos: nuevo.points ?? 0,
        },
      ])
      setNombre("")
      setTelefono("")
      setEmail("")
      setDireccion("")
      setOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Editar cliente
  const handleEdit = (cliente: Cliente) => {
    setEditCliente(cliente)
    setEditOpen(true)
  }
  const handleUpdateCliente = async () => {
    if (!editCliente?.nombre.trim() || !editCliente?.telefono.trim()) return
    setIsLoading(true)
    try {
      const actualizado = await updateCustomer({
        id: editCliente.id,
        name: editCliente.nombre.trim(),
        phone: editCliente.telefono.trim(),
        email: editCliente.email?.trim() || undefined,
        address: editCliente.direccion?.trim() || undefined,
      })
      setClientes(prev => prev.map(c => c.id === actualizado.id ? {
        ...c,
        nombre: actualizado.name,
        telefono: actualizado.phone,
        email: actualizado.email,
        direccion: actualizado.address,
      } : c))
      setEditOpen(false)
      showSuccessAlert("Cliente actualizado", "Los datos se guardaron correctamente.")
    } catch {
      showErrorAlert("Error", "No se pudo actualizar el cliente.")
    } finally {
      setIsLoading(false)
    }
  }
  // Eliminar cliente
  const handleDelete = async (id: number) => {
    const result = await showConfirmAlert(
      "¿Eliminar cliente?",
      "Esta acción no se puede deshacer."
    )
    if (result && result.isConfirmed) {
      setIsLoading(true)
      try {
        await deleteCustomer(id)
        setClientes(prev => prev.filter(c => c.id !== id))
        showSuccessAlert("Cliente eliminado", "El cliente fue eliminado correctamente.")
      } catch {
        showErrorAlert("Error", "No se pudo eliminar el cliente.")
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Buscar clientes solo al presionar Enter
  const handleBuscar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsLoading(true)
    try {
      const data = await getCustomers(busqueda.trim() || "")
      setClientes(data.map((c: any) => ({
        id: c.id,
        nombre: c.name,
        telefono: c.phone,
        email: c.email,
        direccion: c.address,
        puntos: c.points ?? 0,
      })))
    } finally {
      setIsLoading(false)
    }
  }

  // Refrescar/resetear la tabla
  const handleRefresh = async () => {
    setBusqueda("")
    setIsLoading(true)
    try {
      const data = await getCustomers("")
      setClientes(data.map((c: any) => ({
        id: c.id,
        nombre: c.name,
        telefono: c.phone,
        email: c.email,
        direccion: c.address,
        puntos: c.points ?? 0,
      })))
    } finally {
      setIsLoading(false)
    }
  }

  // Mostrar detalle de cliente
  const handleDetalle = async (cliente: Cliente) => {
    setDetalleCliente(cliente)
    setDetalleOpen(true)
    // Buscar órdenes del cliente
    const allOrders = await getOrders()
    const orders = allOrders.filter((o: any) => o.customer_id === cliente.id)
    const ultima = orders.length > 0 ? orders[0] : null
    setDetalleData({
      totalOrdenes: orders.length,
      ultimaOrden: ultima,
      historial: orders.slice(0, 5),
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Miembros del Club</CardTitle>
        <div className="flex gap-2 items-center">
          <form onSubmit={handleBuscar} className="relative">
            <Input
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="rounded-[30px] pl-10 w-48"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
              aria-label="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            className="rounded-full"
            disabled={isLoading}
            title="Refrescar tabla"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <RewardsManager />
          <Link href="/dashboard/clientes/puntos-config">
            <Button className="rounded-[30px]" variant="outline">Configurar Puntos</Button>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-[30px] bg-blue-600 text-white hover:bg-blue-700">Nuevo Cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nombre del cliente"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="rounded-[30px]"
                  disabled={isLoading}
                />
                <Input
                  placeholder="Teléfono"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className="rounded-[30px]"
                  disabled={isLoading}
                />
                <Input
                  placeholder="Email (opcional)"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="rounded-[30px]"
                  disabled={isLoading}
                />
                <Input
                  placeholder="Dirección (opcional)"
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  className="rounded-[30px]"
                  disabled={isLoading}
                />
                <Button className="rounded-[30px] w-full" onClick={handleAddCliente} disabled={isLoading}>
                  {isLoading ? "Agregando..." : "Agregar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Puntos</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.nombre}</TableCell>
                <TableCell>{c.telefono}</TableCell>
                <TableCell>{c.email || "-"}</TableCell>
                <TableCell>{c.direccion || "-"}</TableCell>
                <TableCell>{c.puntos}</TableCell>
                <TableCell>
                  <div className="flex gap-2 items-center">
                    <a
                      href={`https://wa.me/${c.telefono.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp"
                      className="text-green-500 hover:text-green-600 text-xl"
                    >
                      <FaWhatsapp />
                    </a>
                    <button
                      title="Editar"
                      className="text-blue-500 hover:text-blue-700"
                      onClick={() => handleEdit(c)}
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      title="Eliminar"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      title="Detalle"
                      className="text-cyan-500 hover:text-cyan-700"
                      onClick={() => handleDetalle(c)}
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {/* Diálogo de edición */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nombre del cliente"
              value={editCliente?.nombre || ""}
              onChange={e => setEditCliente(ec => ec ? { ...ec, nombre: e.target.value } : ec)}
              className="rounded-[30px]"
              disabled={isLoading}
            />
            <Input
              placeholder="Teléfono"
              value={editCliente?.telefono || ""}
              onChange={e => setEditCliente(ec => ec ? { ...ec, telefono: e.target.value } : ec)}
              className="rounded-[30px]"
              disabled={isLoading}
            />
            <Input
              placeholder="Email (opcional)"
              value={editCliente?.email || ""}
              onChange={e => setEditCliente(ec => ec ? { ...ec, email: e.target.value } : ec)}
              className="rounded-[30px]"
              disabled={isLoading}
            />
            <Input
              placeholder="Dirección (opcional)"
              value={editCliente?.direccion || ""}
              onChange={e => setEditCliente(ec => ec ? { ...ec, direccion: e.target.value } : ec)}
              className="rounded-[30px]"
              disabled={isLoading}
            />
            <Button className="rounded-[30px] w-full" onClick={handleUpdateCliente} disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Diálogo de detalle */}
      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del Cliente</DialogTitle>
          </DialogHeader>
          {detalleCliente && (
            <div className="space-y-3">
              <div className="font-semibold text-lg">{detalleCliente.nombre}</div>
              <div className="text-sm text-gray-500">Tel: {detalleCliente.telefono}</div>
              <div className="text-sm text-gray-500">Email: {detalleCliente.email || "-"}</div>
              <div className="text-sm text-gray-500">Dirección: {detalleCliente.direccion || "-"}</div>
              <div className="font-medium">Puntos acumulados: <span className="text-green-600">{detalleCliente.puntos}</span></div>
              {detalleData && (
                <>
                  <div className="font-medium">Órdenes totales: {detalleData.totalOrdenes}</div>
                  {detalleData.ultimaOrden && (
                    <div>
                      <div className="font-medium">Última orden: #{detalleData.ultimaOrden.id} ({new Date(detalleData.ultimaOrden.created_at).toLocaleString()})</div>
                      <div className="text-sm text-gray-600">Productos:</div>
                      <ul className="list-disc ml-6">
                        {detalleData.ultimaOrden.items?.map((item: any, idx: number) => (
                          <li key={idx}>{item.product_name} x{item.quantity}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Historial reciente:</div>
                    <ul className="list-disc ml-6">
                      {detalleData.historial.map((o: any) => (
                        <li key={o.id}>
                          #{o.id} - {new Date(o.created_at).toLocaleDateString()} - {o.items?.map((i: any) => i.product_name).join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
