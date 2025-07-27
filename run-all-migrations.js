const fs = require('fs');
const path = require('path');
const pg = require('pg');

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envConfig = envFile.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.trim();
  }
  return acc;
}, {});

const { Pool } = pg;

const DATABASE_URL = envConfig.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false, ca: undefined },
});

async function migrate() {
  const client = await pool.connect();
  try {
    const migrationsDir = './prisma/migrations';
    const files = fs.readdirSync(migrationsDir);

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`🚀 Running migration: ${file}`);
        const migrationSQL = fs.readFileSync(
          path.join(migrationsDir, file),
          'utf8'
        );
        await client.query(migrationSQL);
        console.log(`✅ Migration completed: ${file}`);
      }
    }

    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();