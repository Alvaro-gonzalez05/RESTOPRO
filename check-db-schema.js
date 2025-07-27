const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkDbSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos.');

    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'business_info'
      ORDER BY ordinal_position;
    `);

    console.log(`\nTabla: business_info`);
    for (const row of res.rows) {
      console.log(`  - ${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
    }

  } catch (err) {
    console.error('Error al conectar o consultar la base de datos', err);
  } finally {
    await client.end();
    console.log('Conexión a la base de datos cerrada.');
  }
}

checkDbSchema();