'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Save, Building, Clock, MapPin, Phone, Mail, Globe } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getBusinessInfo, saveBusinessInfo, type BusinessInfo } from '@/app/actions/chatbot-config'

interface Props {
  userId: number
}

export default function BusinessConfig({ userId }: Props) {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    user_id: userId,
    business_name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    menu_link: '',
    business_hours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '14:00', closed: false },
      sunday: { open: '09:00', close: '14:00', closed: true }
    },
    services: [],
    specialties: [],
    social_media: {
      facebook: '',
      instagram: '',
      twitter: '',
      whatsapp: ''
    },
    auto_responses: true
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [newService, setNewService] = useState('')
  const [newSpecialty, setNewSpecialty] = useState('')

  const daysOfWeek = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ]

  useEffect(() => {
    loadBusinessInfo()
  }, [userId])

  const loadBusinessInfo = async () => {
    setIsLoading(true)
    try {
      const data = await getBusinessInfo(userId)
      if (data) {
        setBusinessInfo(data)
      }
    } catch (error) {
      console.error('Error loading business info:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const result = await saveBusinessInfo(businessInfo)
      if (result.success) {
        toast({ title: "Éxito", description: result.message })
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al guardar información del negocio", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const updateBusinessHours = (day: string, field: string, value: string | boolean) => {
    setBusinessInfo(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day as keyof typeof prev.business_hours],
          [field]: value
        }
      }
    }))
  }

  const addService = () => {
    if (newService.trim()) {
      setBusinessInfo(prev => ({
        ...prev,
        services: [...prev.services, newService.trim()]
      }))
      setNewService('')
    }
  }

  const removeService = (index: number) => {
    setBusinessInfo(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }))
  }

  const addSpecialty = () => {
    if (newSpecialty.trim()) {
      setBusinessInfo(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }))
      setNewSpecialty('')
    }
  }

  const removeSpecialty = (index: number) => {
    setBusinessInfo(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="space-y-6">
      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Información Básica del Negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_name">Nombre del Negocio</Label>
              <Input
                id="business_name"
                value={businessInfo.business_name}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_name: e.target.value }))}
                placeholder="Mi Restaurante"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={businessInfo.phone}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={businessInfo.description}
              onChange={(e) => setBusinessInfo(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe tu negocio..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={businessInfo.email}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contacto@minegocio.com"
              />
            </div>
            
            <div>
              <Label htmlFor="website">Sitio Web</Label>
              <Input
                id="website"
                value={businessInfo.website}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://www.minegocio.com"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="menu_link">Enlace del Menú Digital</Label>
            <Input
              id="menu_link"
              value={businessInfo.menu_link}
              onChange={(e) => setBusinessInfo(prev => ({ ...prev, menu_link: e.target.value }))}
              placeholder="https://menu.minegocio.com o link de Google Drive/Dropbox"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enlace a tu carta digital, menú en PDF, o cualquier documento con tus productos
            </p>
          </div>
          
          <div>
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={businessInfo.address}
              onChange={(e) => setBusinessInfo(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Calle Principal 123, Ciudad"
            />
          </div>
        </CardContent>
      </Card>

      {/* Horarios de atención */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horarios de Atención
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {daysOfWeek.map((day) => (
              <div key={day.key} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="w-20">
                  <Label className="text-sm font-medium">{day.label}</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!businessInfo.business_hours[day.key as keyof typeof businessInfo.business_hours].closed}
                    onCheckedChange={(checked) => updateBusinessHours(day.key, 'closed', !checked)}
                  />
                  <Label className="text-sm">Abierto</Label>
                </div>
                
                {!businessInfo.business_hours[day.key as keyof typeof businessInfo.business_hours].closed && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">De:</Label>
                      <Input
                        type="time"
                        value={businessInfo.business_hours[day.key as keyof typeof businessInfo.business_hours].open}
                        onChange={(e) => updateBusinessHours(day.key, 'open', e.target.value)}
                        className="w-32"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">A:</Label>
                      <Input
                        type="time"
                        value={businessInfo.business_hours[day.key as keyof typeof businessInfo.business_hours].close}
                        onChange={(e) => updateBusinessHours(day.key, 'close', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Servicios */}
      <Card>
        <CardHeader>
          <CardTitle>Servicios Ofrecidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="Agregar nuevo servicio"
              onKeyPress={(e) => e.key === 'Enter' && addService()}
            />
            <Button onClick={addService}>Agregar</Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {businessInfo.services.map((service, index) => (
              <div key={index} className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded-full">
                <span className="text-sm">{service}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeService(index)}
                  className="h-4 w-4 p-0 text-blue-600 hover:text-red-600"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Especialidades */}
      <Card>
        <CardHeader>
          <CardTitle>Especialidades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              placeholder="Agregar nueva especialidad"
              onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
            />
            <Button onClick={addSpecialty}>Agregar</Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {businessInfo.specialties.map((specialty, index) => (
              <div key={index} className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full">
                <span className="text-sm">{specialty}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeSpecialty(index)}
                  className="h-4 w-4 p-0 text-green-600 hover:text-red-600"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Redes sociales */}
      <Card>
        <CardHeader>
          <CardTitle>Redes Sociales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={businessInfo.social_media.facebook}
                onChange={(e) => setBusinessInfo(prev => ({
                  ...prev,
                  social_media: { ...prev.social_media, facebook: e.target.value }
                }))}
                placeholder="https://facebook.com/minegocio"
              />
            </div>
            
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={businessInfo.social_media.instagram}
                onChange={(e) => setBusinessInfo(prev => ({
                  ...prev,
                  social_media: { ...prev.social_media, instagram: e.target.value }
                }))}
                placeholder="https://instagram.com/minegocio"
              />
            </div>
            
            <div>
              <Label htmlFor="twitter">Twitter</Label>
              <Input
                id="twitter"
                value={businessInfo.social_media.twitter}
                onChange={(e) => setBusinessInfo(prev => ({
                  ...prev,
                  social_media: { ...prev.social_media, twitter: e.target.value }
                }))}
                placeholder="https://twitter.com/minegocio"
              />
            </div>
            
            <div>
              <Label htmlFor="whatsapp">WhatsApp Business</Label>
              <Input
                id="whatsapp"
                value={businessInfo.social_media.whatsapp}
                onChange={(e) => setBusinessInfo(prev => ({
                  ...prev,
                  social_media: { ...prev.social_media, whatsapp: e.target.value }
                }))}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de respuestas automáticas */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración Avanzada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              checked={businessInfo.auto_responses}
              onCheckedChange={(checked) => setBusinessInfo(prev => ({ ...prev, auto_responses: checked }))}
            />
            <Label>Habilitar respuestas automáticas con IA</Label>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Cuando esté habilitado, el chatbot responderá automáticamente usando la información de tu negocio
          </p>
        </CardContent>
      </Card>

      {/* Botón guardar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  )
}
