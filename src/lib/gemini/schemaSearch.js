// PostgREST serves a full OpenAPI (Swagger) description of the schema at the
// REST root (GET /rest/v1/). We fetch it once, cache it, and let the agent
// search it by keyword instead of stuffing the whole (large) spec into every
// prompt. This also means newly added tables/columns/RPCs show up
// automatically without touching this app's code.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let cachedSpec = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;

export async function getOpenApiSpec({ forceRefresh = false } = {}) {
  const fresh = Date.now() - cachedAt < CACHE_MS;
  if (cachedSpec && fresh && !forceRefresh) return cachedSpec;

  const res = await fetch(supabaseUrl, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: 'application/openapi+json',
    },
  });
  if (!res.ok)
    throw new Error(
      `Could not load schema spec from Supabase (status ${res.status})`
    );
  cachedSpec = await res.json();
  cachedAt = Date.now();
  return cachedSpec;
}

function describeProperty(name, prop) {
  const parts = [name];
  if (prop.format && prop.format !== prop.type) parts.push(`(${prop.format})`);
  if (prop.enum) parts.push(`enum[${prop.enum.join('|')}]`);
  if (prop.description) parts.push(`— ${prop.description}`);
  return parts.join(' ');
}

/**
 * Keyword search across table definitions and RPC paths. Returns a compact,
 * model-friendly summary rather than the raw (huge) spec.
 */
export async function searchSchema(query) {
  const spec = await getOpenApiSpec();
  const q = (query || '').toLowerCase().trim();
  const defs = spec.definitions || {};
  const paths = spec.paths || {};

  const matchedTables = Object.entries(defs)
    .filter(([tableName, def]) => {
      if (!q) return true;
      if (tableName.toLowerCase().includes(q)) return true;
      if (def.description?.toLowerCase().includes(q)) return true;
      return Object.entries(def.properties || {}).some(
        ([col, prop]) =>
          col.toLowerCase().includes(q) ||
          prop.description?.toLowerCase().includes(q) ||
          prop.enum?.some((v) => v.toLowerCase().includes(q))
      );
    })
    .map(([tableName, def]) => ({
      table: tableName,
      description: def.description || null,
      required: def.required || [],
      columns: Object.entries(def.properties || {}).map(([col, prop]) =>
        describeProperty(col, prop)
      ),
    }));

  const matchedRpcs = Object.keys(paths)
    .filter((p) => p.startsWith('/rpc/'))
    .map((p) => p.replace('/rpc/', ''))
    .filter((name) => !q || name.toLowerCase().includes(q));

  return { tables: matchedTables, rpcFunctions: matchedRpcs };
}

export function listAllTableNames(spec) {
  return Object.keys(spec?.definitions || {});
}
