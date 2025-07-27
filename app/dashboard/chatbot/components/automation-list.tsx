
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AutomationForm } from './automation-form';
import { deleteAutomationRule } from '@/app/actions/chatbot';
import { toast } from '@/hooks/use-toast';

export function AutomationList({ rules: initialRules }: { rules: any[] }) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [rules, setRules] = useState(initialRules)
  const [selectedRule, setSelectedRule] = useState(null)

  const handleAdd = () => {
    setSelectedRule(null)
    setIsFormOpen(true)
  }

  const handleEdit = (rule: any) => {
    setSelectedRule(rule)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteAutomationRule(id)
      setRules(rules.filter(rule => rule.id !== id))
      toast({
        title: 'Regla eliminada',
        description: 'La regla de automatización ha sido eliminada.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la regla de automatización.',
        variant: 'destructive',
      })
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setSelectedRule(null)
    // Refresh rules list
    // This could be done more efficiently by updating the state directly
    // but for simplicity we'll just refetch for now.
    // In a real app, you'd likely update the state from the form's onSubmit
    // to avoid a full refetch.
    // For now, we'll just list the files again.
    glob("automations/*.json").then(files => {
      Promise.all(files.map(file => readFile(file, 'utf-8')))
        .then(contents => {
          const rules = contents.map(content => JSON.parse(content))
          setRules(rules)
        })
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Automatizaciones</CardTitle>
            <CardDescription>Crea y gestiona reglas para automatizar mensajes.</CardDescription>
          </div>
          <Button onClick={handleAdd}>Añadir Regla</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Disparador</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell>{rule.trigger_type}</TableCell>
                <TableCell>{rule.action_type}</TableCell>
                <TableCell>
                  <Badge variant={rule.is_active ? 'default' : 'outline'}>
                    {rule.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(rule)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(rule.id)}>Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rules.length === 0 && (
          <div className="text-center p-8 text-gray-500">
            No has creado ninguna automatización aún.
          </div>
        )}
      </CardContent>

      {isFormOpen && (
        <AutomationForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          rule={selectedRule}
        />
      )}
    </Card>
  )
}
