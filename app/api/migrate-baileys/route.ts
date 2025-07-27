import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    console.log('🚀 Iniciando migración a Baileys...')
    
    // Leer el archivo de migración
    const migrationPath = path.join(process.cwd(), 'migrate-to-baileys-multitenant.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Ejecutar la migración
    await sql(migrationSQL)
    
    return NextResponse.json({
      success: true,
      message: '✅ Migración completada exitosamente! Tu sistema ahora usa Baileys con IA integrada.'
    })
    
  } catch (error) {
    console.error('❌ Error en migración:', error)
    return NextResponse.json({
      success: false,
      message: `Error en migración: ${(error as Error).message}`
    }, { status: 500 })
  }
}
