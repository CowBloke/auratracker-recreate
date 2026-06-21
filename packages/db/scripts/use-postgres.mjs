// Switches the Prisma datasource provider from sqlite to postgresql in place.
// Usage: pnpm --filter @aura/db use-postgres
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '..', 'prisma', 'schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

if (schema.includes('provider = "postgresql"')) {
  console.log('Already configured for postgresql. Nothing to do.');
  process.exit(0);
}

const updated = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
writeFileSync(schemaPath, updated);
console.log('✓ Prisma provider switched to postgresql.');
console.log('  Next: set DATABASE_URL to your Postgres URL, then run:');
console.log('    pnpm --filter @aura/db generate && pnpm --filter @aura/db migrate');
