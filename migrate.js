const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Desactivar verificación SSL para conexiones Node.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function migrateDatabase() {
  console.log('🚀 Iniciando migración de Neon a Supabase...');
  
  // URLs desde las variables de entorno
  const neonUrl = process.env.DATABASE_URL;  // Neon
  const supabaseUrl = process.env.POSTGRES_URL;  // Supabase
  
  if (!neonUrl || !supabaseUrl) {
    console.error('❌ Error: No se encontraron las URLs de conexión en .env.local');
    console.log('DATABASE_URL (Neon):', neonUrl ? '✅ Encontrada' : '❌ No encontrada');
    console.log('POSTGRES_URL (Supabase):', supabaseUrl ? '✅ Encontrada' : '❌ No encontrada');
    return;
  }
  
  // Configurar SSL para ambos clientes
  const sslConfig = {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  };
  
  const neonClient = new Client({ 
    connectionString: neonUrl,
    ssl: sslConfig
  });
  const supabaseClient = new Client({ 
    connectionString: supabaseUrl,
    ssl: sslConfig
  });
  
  try {
    console.log('🔌 Conectando a Neon...');
    await neonClient.connect();
    console.log('✅ Conectado a Neon');
    
    console.log('🔌 Conectando a Supabase...');
    await supabaseClient.connect();
    console.log('✅ Conectado a Supabase');
    
    // Obtener lista de tablas de Neon
    console.log('📋 Obteniendo lista de tablas...');
    const tablesResult = await neonClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(r => r.table_name);
    console.log('📊 Tablas encontradas:', tables);
    
    if (tables.length === 0) {
      console.log('⚠️ No se encontraron tablas en Neon');
      return;
    }
    
    let totalRows = 0;
    
    for (const tableName of tables) {
      console.log(`\n📤 Migrando tabla: ${tableName}`);
      
      try {
        // Obtener datos de la tabla
        const dataResult = await neonClient.query(`SELECT * FROM "${tableName}"`);
        console.log(`   📊 Filas encontradas: ${dataResult.rows.length}`);
        
        if (dataResult.rows.length === 0) {
          console.log(`   ℹ️ ${tableName} está vacía, omitiendo...`);
          continue;
        }
        
        // Obtener estructura de columnas
        const columns = Object.keys(dataResult.rows[0]);
        console.log(`   📝 Columnas: ${columns.join(', ')}`);
        
        // Limpiar tabla en Supabase antes de insertar (opcional)
        console.log(`   🧹 Limpiando tabla ${tableName} en Supabase...`);
        try {
          await supabaseClient.query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`);
        } catch (truncateError) {
          console.log(`   ⚠️ No se pudo limpiar ${tableName}:`, truncateError.message);
        }
        
        // Insertar datos fila por fila con manejo de errores
        let successfulInserts = 0;
        let failedInserts = 0;
        
        for (let i = 0; i < dataResult.rows.length; i++) {
          const row = dataResult.rows[i];
          const values = columns.map(col => row[col]);
          const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
          const columnsList = columns.map(col => `"${col}"`).join(', ');
          
          try {
            await supabaseClient.query(
              `INSERT INTO "${tableName}" (${columnsList}) VALUES (${placeholders})`,
              values
            );
            successfulInserts++;
          } catch (insertError) {
            failedInserts++;
            console.log(`   ⚠️ Error en fila ${i + 1}:`, insertError.message);
            
            // Mostrar los valores que causaron el error (solo los primeros 3 errores)
            if (failedInserts <= 3) {
              console.log(`   📄 Datos de la fila:`, JSON.stringify(row, null, 2));
            }
          }
        }
        
        console.log(`   ✅ ${tableName}: ${successfulInserts} filas migradas, ${failedInserts} errores`);
        totalRows += successfulInserts;
        
      } catch (tableError) {
        console.error(`   ❌ Error migrando tabla ${tableName}:`, tableError.message);
      }
    }
    
    console.log(`\n🎉 ¡Migración completada!`);
    console.log(`📈 Total de filas migradas: ${totalRows}`);
    console.log(`📝 Próximo paso: Actualiza tu .env.local para usar POSTGRES_URL como DATABASE_URL`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('📄 Detalles:', error);
  } finally {
    try {
      await neonClient.end();
      console.log('🔌 Desconectado de Neon');
    } catch (e) {}
    
    try {
      await supabaseClient.end();
      console.log('🔌 Desconectado de Supabase');
    } catch (e) {}
  }
}

// Ejecutar migración
console.log('🔄 Iniciando script de migración...');
migrateDatabase().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
