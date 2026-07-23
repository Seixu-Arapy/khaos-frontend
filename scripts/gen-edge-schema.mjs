// Regenerates supabase/functions/_shared/schema.sql.ts from schema.sql.
//
// The Telegram bot Edge Function runs under Deno and can't use Vite's
// `schema.sql?raw` import the way the browser app does, so it embeds the
// schema as a plain string module instead. Run this after `npm run db:dump`
// (or any manual edit to schema.sql) to keep the two in sync.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sql = readFileSync(join(root, 'schema.sql'), 'utf8');
const target = join(root, 'supabase/functions/_shared/schema.sql.ts');

const out = `// AUTO-GENERATED — do not edit by hand.
// Embedded copy of the repo's schema.sql so the Telegram bot Edge Function
// can answer search_schema queries at runtime (Deno has no Vite ?raw import).
// Regenerate with:  npm run gen:edge-schema
// (kept in sync with schema.sql, which is itself refreshed by npm run db:dump).

export const SCHEMA_SQL = ${JSON.stringify(sql)};
`;

writeFileSync(target, out);
console.log(`schema.sql.ts regenerated (${sql.length} bytes of SQL).`);
