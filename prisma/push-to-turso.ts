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
  console.log('Fetching schema SQL from Prisma schema...');
  const sql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script').toString();
  console.log('SQL raw output:', JSON.stringify(sql.substring(0, 100)));

  console.log(`Connecting to Turso database...`);
  const client = createClient({
    url: url as string,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  console.log('Pushing schema to Turso...');
  
  // Strip all comments from the SQL script
  const cleanSql = sql.replace(/^--.*$/gm, '').trim();

  // Split statements by semicolon and filter out empty statements
  const statements = cleanSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Parsed ${statements.length} SQL statements.`);
  console.log('Sample statement:', statements[0]);

  let createdCount = 0;
  for (const statement of statements) {
    try {
      await client.execute(statement);
      createdCount++;
    } catch (err: any) {
      if (err.message && err.message.includes('already exists')) {
        // Ignore table/index already exists errors
        continue;
      }
      console.error(`Statement failed: ${statement.substring(0, 100)}...`);
      console.error(`Error:`, err.message);
      throw err;
    }
  }

  console.log(`✅ Schema pushed successfully to Turso! Executed ${createdCount} new statements.`);
}

main().catch((err) => {
  console.error('❌ Error pushing schema to Turso:', err);
  process.exit(1);
});
