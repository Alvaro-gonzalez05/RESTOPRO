"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, CreditCard } from "lucide-react"
import { getPaymentMethods, createPaymentMethod, deletePaymentMethod } from "@/app/actions/payment-methods"
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/sweetalert"
import type { PaymentMethod } from "@/lib/types"

export function PaymentMethodsConfig() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newMethodName, setNewMethodName] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    try {
      const methods = await getPaymentMethods()
      setPaymentMethods(methods)
    } catch (error) {
      showErrorAlert("Error al cargar métodos de pago")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newMethodName.trim()) return
    
    setCreating(true)
    try {
      const newMethod = await createPaymentMethod(newMethodName.trim())
      setPaymentMethods(prev => [...prev, newMethod])
      setNewMethodName("")
      setDialogOpen(false)
      showSuccessAlert("Método de pago agregado exitosamente")
    } catch (error) {
      showErrorAlert("Error al crear método de pago")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (method: PaymentMethod) => {
    const confirmed = await showConfirmAlert(
      "¿Eliminar método de pago?",
      `¿Estás seguro de que quieres eliminar "${method.name}"?`
    )
    
    if (confirmed) {
      try {
        await deletePaymentMethod(method.id)
        setPaymentMethods(prev => prev.filter(m => m.id !== method.id))
        showSuccessAlert("Método de pago eliminado")
      } catch (error) {
        showErrorAlert("Error al eliminar método de pago")
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle>Métodos de Pago</CardTitle>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-[30px]">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Método
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Método de Pago</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nombre del método de pago"
                value={newMethodName}
                onChange={(e) => setNewMethodName(e.target.value)}
                className="rounded-[30px]"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="rounded-[30px]"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={creating || !newMethodName.trim()}
                  className="rounded-[30px]"
                >
                  {creating ? "Creando..." : "Crear"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay métodos de pago configurados
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentMethods.map((method) => (
                <TableRow key={method.id}>
                  <TableCell className="font-medium">{method.name}</TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800">
                      Activo
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(method.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(method)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
