const pg = require('pg');
const fs = require('fs');
const path = require('path');
const { Pool } = pg;

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envConfig = envFile.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.trim();
  }
  return acc;
}, {});

const DATABASE_URL = envConfig.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false, ca: undefined },
});

async function executeSql() {
  const client = await pool.connect();
  try {
    const sqlStatement = "ALTER TABLE \"business_info\" DROP COLUMN \"social_media_link\";";
    console.log(`🚀 Executing SQL: ${sqlStatement}`);
    await client.query(sqlStatement);
    console.log('✅ Column social_media_link dropped successfully!');
  } catch (error) {
    console.error('❌ Error executing SQL:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

executeSql();
