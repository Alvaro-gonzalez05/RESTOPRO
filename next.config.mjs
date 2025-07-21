/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configuración para deployment
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'vercel.app', '*.vercel.app'],
    },
  },
  // Prevenir static generation para rutas con autenticación
  async rewrites() {
    return []
  },
  async headers() {
    return [
      {
        source: '/dashboard/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  }
}

export default nextConfig
