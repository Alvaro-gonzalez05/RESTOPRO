# RestoPro - Sistema de Gestión de Restaurante

Un sistema completo de gestión para restaurantes construido con Next.js 14, TypeScript y Neon PostgreSQL.

## 🚀 Características

- **Dashboard Completo**: Vista general con estadísticas en tiempo real
- **Gestión de Órdenes**: Crear, editar y seguir órdenes de clientes
- **Menú Digital**: Organizar productos por categorías
- **Inventario de Productos**: Control completo del inventario
- **Reportes**: Análisis de ventas y rendimiento
- **Autenticación Segura**: Sistema de login con encriptación
- **Responsive Design**: Funciona en desktop y móvil

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Base de Datos**: Neon PostgreSQL
- **Autenticación**: bcryptjs
- **Iconos**: Lucide React

## 📦 Instalación

1. **Clonar el repositorio**
\`\`\`bash
git clone <repository-url>
cd restopro
\`\`\`

2. **Instalar dependencias**
\`\`\`bash
npm install
\`\`\`

3. **Configurar variables de entorno**
\`\`\`bash
# Crear archivo .env.local
DATABASE_URL=postgres://neondb_owner:npg_iDefZaSH83dB@ep-green-tree-adyy0bos-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
\`\`\`

4. **Configurar la base de datos**
\`\`\`bash
# Probar conexión
npm run test-db

# Ejecutar el script SQL en tu consola de Neon
# Archivo: scripts/setup-production-database.sql
\`\`\`

5. **Ejecutar en desarrollo**
\`\`\`bash
npm run dev
\`\`\`

## 🗄️ Configuración de Base de Datos

### Opción 1: Consola de Neon (Recomendado)
1. Ve a tu [consola de Neon](https://console.neon.tech)
2. Selecciona tu proyecto
3. Ve a "SQL Editor"
4. Copia y pega el contenido de `scripts/setup-production-database.sql`
5. Ejecuta el script

### Opción 2: Cliente PostgreSQL
\`\`\`bash
psql "postgres://neondb_owner:npg_iDefZaSH83dB@ep-green-tree-adyy0bos-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" -f scripts/setup-production-database.sql
\`\`\`

## 🔐 Credenciales Demo

Después de ejecutar el script de configuración:
- **Email**: demo@restopro.com
- **Contraseña**: demo123

## 📁 Estructura del Proyecto

\`\`\`
restopro/
├── app/
│   ├── actions/          # Server Actions
│   ├── dashboard/        # Panel de administración
│   ├── login/           # Página de login
│   └── register/        # Página de registro
├── components/
│   └── ui/              # Componentes de UI (shadcn)
├── lib/
│   ├── auth.ts          # Autenticación
│   ├── db.ts            # Conexión a base de datos
│   └── types.ts         # Tipos TypeScript
└── scripts/
    └── setup-production-database.sql
\`\`\`

## 🚀 Despliegue

### Vercel (Recomendado)
1. Conecta tu repositorio a Vercel
2. Agrega la variable de entorno `DATABASE_URL`
3. Despliega

### Otras plataformas
Asegúrate de:
1. Configurar `DATABASE_URL` como variable de entorno
2. Ejecutar `npm run build`
3. Configurar el comando de inicio: `npm start`

## 📊 Funcionalidades

### Dashboard
- Estadísticas diarias (órdenes, ingresos, clientes)
- Órdenes recientes
- Métricas de rendimiento

### Gestión de Órdenes
- Crear nuevas órdenes
- Cambiar estados (pendiente, en proceso, completado, cancelado)
- Ver detalles completos
- Historial de órdenes

### Productos y Menú
- Crear/editar productos
- Organizar por categorías
- Control de disponibilidad
- Imágenes de productos

### Reportes
- Ventas por período
- Productos más vendidos
- Análisis de clientes

## 🔧 Scripts Disponibles

\`\`\`bash
npm run dev          # Desarrollo
npm run build        # Construir para producción
npm run start        # Iniciar en producción
npm run test-db      # Probar conexión a BD
npm run lint         # Linter
\`\`\`

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas:

1. **Conexión a BD**: Ejecuta `npm run test-db`
2. **Tablas faltantes**: Ejecuta el script SQL de configuración
3. **Errores de autenticación**: Verifica las credenciales demo
4. **Problemas de build**: Verifica las dependencias con `npm install`

## 📞 Contacto

Para soporte técnico o consultas, abre un issue en el repositorio.
