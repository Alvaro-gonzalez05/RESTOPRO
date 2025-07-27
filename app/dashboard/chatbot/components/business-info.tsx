'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { updateBusinessInfo } from '@/app/actions/chatbot'

const businessInfoSchema = z.object({
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  openingHours: z.object({
    lunes: z.object({ from: z.string().optional(), to: z.string().optional(), closed: z.boolean().optional() }).optional(),
    martes: z.object({ from: z.string().optional(), to: z.string().optional(), closed: z.boolean().optional() }).optional(),
    miercoles: z.object({ from: z.string().optional(), to: z.string().optional(), closed: z.boolean().optional() }).optional(),
    jueves: z.object({ from: z.string().optional(), to: z.string().optional(), closed: z.boolean().optional() }).optional(),
    viernes: z.object({ from: z.string().optional(), to: z.string().optional(), closed: z.boolean().optional() }).optional(),
    sabado: z.object({ from: z.string().optional(), to: z.string().optional(), closed: z.boolean().optional() }).optional(),
    domingo: z.object({ from: z.string().optional(), to: z.string().optional(), closed: z.boolean().optional() }).optional(),
  }).optional(),
  deliveryInfo: z.string().optional(),
  menuLink: z.string().optional(),
  locationLink: z.string().optional(),
  socialMedia: z.object({
    twitter: z.string().optional(),
    facebook: z.string().optional(),
    whatsapp: z.string().optional(),
    instagram: z.string().optional(),
  }).optional(),
  autoResponses: z.boolean().optional(),
})

type BusinessInfoFormValues = z.infer<typeof businessInfoSchema>

export function BusinessInfo({ businessInfo: initialBusinessInfo }: { businessInfo: any }) {
  const [loading, setLoading] = useState(false)
  // Days of the week
  const days = [
    'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'
  ];

  // Parse business_hours and social_media if they are strings
  const daysMap = {
    lunes: 'lunes',
    martes: 'martes',
    miercoles: 'miércoles',
    miércoles: 'miércoles',
    jueves: 'jueves',
    viernes: 'viernes',
    sabado: 'sábado',
    sábado: 'sábado',
    domingo: 'domingo',
  };
  let rawHours = {};
  let parsedHours = {};
  let parsedSocial = {};
  try {
    rawHours = typeof initialBusinessInfo?.business_hours === 'string'
      ? JSON.parse(initialBusinessInfo.business_hours)
      : initialBusinessInfo?.business_hours || {};
  } catch { rawHours = {}; }
  // Normaliza los días y rellena los faltantes
  parsedHours = {};
  Object.keys(daysMap).forEach(key => {
    const dbKey = Object.keys(rawHours).find(k => k === key || k === daysMap[key]);
    parsedHours[daysMap[key]] = dbKey ? rawHours[dbKey] : { from: '', to: '', closed: false };
  });
  try {
    parsedSocial = typeof initialBusinessInfo?.social_media === 'string'
      ? JSON.parse(initialBusinessInfo.social_media)
      : initialBusinessInfo?.social_media || {};
  } catch { parsedSocial = {}; }

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<BusinessInfoFormValues>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      ...initialBusinessInfo,
      businessName: initialBusinessInfo?.business_name ?? '',
      businessType: initialBusinessInfo?.business_type ?? '',
      deliveryInfo: initialBusinessInfo?.delivery_info ?? '',
      menuLink: initialBusinessInfo?.menu_link ?? '',
      locationLink: initialBusinessInfo?.location_link ?? '',
      openingHours: parsedHours,
      socialMedia: {
        twitter: parsedSocial?.twitter ?? '',
        facebook: parsedSocial?.facebook ?? '',
        whatsapp: parsedSocial?.whatsapp ?? '',
        instagram: parsedSocial?.instagram ?? '',
      },
      autoResponses: initialBusinessInfo?.auto_responses || false,
    },
  });

  const onSubmit = async (data: BusinessInfoFormValues) => {
    setLoading(true);
    try {
      const submitData = {
        ...data,
        openingHours: data.openingHours ? JSON.stringify(data.openingHours) : null,
        socialMedia: data.socialMedia ? JSON.stringify(data.socialMedia) : null,
      };
      const result = await updateBusinessInfo(initialBusinessInfo.user_id, submitData);
      if (result.success) {
        toast.success('Información actualizada correctamente');
      } else {
        toast.error(result.error || 'Error al actualizar la información');
      }
    } catch (error) {
      toast.error('Error al actualizar la información');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Negocio</CardTitle>
        <CardDescription>
          Esta información será utilizada por el chatbot para responder a las preguntas de tus clientes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessName">Nombre del Negocio</Label>
              <Input id="businessName" {...register('businessName')} />
              {errors.businessName && <p className="text-red-500 text-sm">{errors.businessName.message}</p>}
            </div>
            <div>
              <Label htmlFor="businessType">Tipo de Negocio</Label>
              <Input id="businessType" {...register('businessType')} />
              {errors.businessType && <p className="text-red-500 text-sm">{errors.businessType.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" {...register('description')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...register('address')} />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register('email')} />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="website">Sitio Web</Label>
              <Input id="website" {...register('website')} />
              {errors.website && <p className="text-red-500 text-sm">{errors.website.message}</p>}
            </div>
          </div>
          <div>
            <Label>Horarios de Apertura</Label>
            <div className="grid grid-cols-1 gap-2">
              {days.map(day => (
                <div key={day} className="flex items-center gap-4 py-2">
                  <Label className="w-24 capitalize">{day}</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      {...register(`openingHours.${day}.closed`)}
                      checked={watch(`openingHours.${day}.closed`)}
                      onCheckedChange={value => setValue(`openingHours.${day}.closed`, value)}
                      className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-green-500"
                    />
                    <span className="text-xs ml-2">{watch(`openingHours.${day}.closed`) ? 'Cerrado' : 'Abierto'}</span>
                  </div>
                  {!watch(`openingHours.${day}.closed`) && (
                    <div className="flex gap-2 items-center">
                      <Label className="text-xs">De</Label>
                      <Input
                        type="time"
                        {...register(`openingHours.${day}.from`)}
                        className="w-24"
                      />
                      <Label className="text-xs">Hasta</Label>
                      <Input
                        type="time"
                        {...register(`openingHours.${day}.to`)}
                        className="w-24"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="deliveryInfo">Información de Delivery</Label>
            <Textarea id="deliveryInfo" {...register('deliveryInfo')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="menuLink">Enlace del Menú</Label>
              <Input id="menuLink" {...register('menuLink')} />
              {errors.menuLink && <p className="text-red-500 text-sm">{errors.menuLink.message}</p>}
            </div>
            <div>
              <Label htmlFor="locationLink">Enlace de Ubicación</Label>
              <Input id="locationLink" {...register('locationLink')} />
              {errors.locationLink && <p className="text-red-500 text-sm">{errors.locationLink.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="socialMedia.twitter">Twitter</Label>
            <Input id="socialMedia.twitter" {...register('socialMedia.twitter')} />
            {errors.socialMedia?.twitter && <p className="text-red-500 text-sm">{errors.socialMedia.twitter.message}</p>}
          </div>
          <div>
            <Label htmlFor="socialMedia.facebook">Facebook</Label>
            <Input id="socialMedia.facebook" {...register('socialMedia.facebook')} />
            {errors.socialMedia?.facebook && <p className="text-red-500 text-sm">{errors.socialMedia.facebook.message}</p>}
          </div>
          <div>
            <Label htmlFor="socialMedia.whatsapp">WhatsApp</Label>
            <Input id="socialMedia.whatsapp" {...register('socialMedia.whatsapp')} />
            {errors.socialMedia?.whatsapp && <p className="text-red-500 text-sm">{errors.socialMedia.whatsapp.message}</p>}
          </div>
          <div>
            <Label htmlFor="socialMedia.instagram">Instagram</Label>
            <Input id="socialMedia.instagram" {...register('socialMedia.instagram')} />
            {errors.socialMedia?.instagram && <p className="text-red-500 text-sm">{errors.socialMedia.instagram.message}</p>}
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="autoResponses" {...register('autoResponses')} checked={initialBusinessInfo?.auto_responses} />
            <Label htmlFor="autoResponses">Respuestas Automáticas</Label>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
