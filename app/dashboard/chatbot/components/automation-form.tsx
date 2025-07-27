
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAutomationRule, updateAutomationRule } from '@/app/actions/chatbot';
import { toast } from '@/hooks/use-toast';

const automationSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  triggerType: z.string().min(1, 'El disparador es requerido'),
  triggerConditions: z.any().optional(),
  actionType: z.string().min(1, 'La acción es requerida'),
  actionData: z.any().optional(),
})

type AutomationFormValues = z.infer<typeof automationSchema>

export function AutomationForm({ isOpen, onClose, rule }: { isOpen: boolean, onClose: () => void, rule: any }) {
  const { register, handleSubmit, formState: { errors }, control } = useForm<AutomationFormValues>({
    resolver: zodResolver(automationSchema),
    defaultValues: rule || {},
  })

  const onSubmit = async (data: AutomationFormValues) => {
    try {
      if (rule) {
        await updateAutomationRule(rule.id, data)
        toast({
          title: 'Regla actualizada',
          description: 'La regla de automatización ha sido actualizada.',
        })
      } else {
        await createAutomationRule(data)
        toast({
          title: 'Regla creada',
          description: 'La regla de automatización ha sido creada.',
        })
      }
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la regla de automatización.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? 'Editar' : 'Crear'} Regla de Automatización</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre de la Regla</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>

          <div>
            <Label>Disparador</Label>
            <Select name="triggerType" onValueChange={(value) => control.setValue('triggerType', value)} defaultValue={rule?.triggerType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un disparador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_order">Nueva Orden</SelectItem>
                <SelectItem value="inactive_customer">Cliente Inactivo</SelectItem>
              </SelectContent>
            </Select>
            {errors.triggerType && <p className="text-red-500 text-sm">{errors.triggerType.message}</p>}
          </div>

          <div>
            <Label>Acción</Label>
            <Select name="actionType" onValueChange={(value) => control.setValue('actionType', value)} defaultValue={rule?.actionType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="send_whatsapp_message">Enviar Mensaje de WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            {errors.actionType && <p className="text-red-500 text-sm">{errors.actionType.message}</p>}
          </div>

          <div>
            <Label htmlFor="actionData.messageText">Texto del Mensaje</Label>
            <Textarea id="actionData.messageText" {...register('actionData.messageText')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
