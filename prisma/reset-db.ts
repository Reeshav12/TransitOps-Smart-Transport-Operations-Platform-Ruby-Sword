import { createClient } from '@libsql/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set in environment or .env');
  process.exit(1);
}

async function main() {
  console.log('Connecting to Turso database to drop existing tables...');
  const client = createClient({ url: url as string });

  const tables = [
    'Notification',
    'AuditLog',
    'Expense',
    'FuelLog',
    'MaintenanceLog',
    'Trip',
    'Driver',
    'Vehicle',
    'User',
    'Role',
  ];

  for (const table of tables) {
    try {
      console.log(`Dropping table ${table}...`);
      await client.execute(`DROP TABLE IF EXISTS "${table}";`);
    } catch (err: any) {
      console.error(`Failed to drop table ${table}:`, err.message);
    }
  }

  console.log('Pushing updated schema with CASCADE constraints...');
  execSync('npx tsx prisma/push-to-turso.ts', { stdio: 'inherit' });

  console.log('Running seeder to repopulate mock data...');
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });

  console.log('✅ Database reset, schema updated, and mock data seeded successfully!');
}

main().catch((err) => {
  console.error('❌ Error resetting database:', err);
  process.exit(1);
});
