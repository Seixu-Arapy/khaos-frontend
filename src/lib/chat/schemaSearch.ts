// Schema discovery for the chat agent's `search_schema` tool.
//
// This used to fetch PostgREST's live OpenAPI (Swagger) description at
// `/rest/v1/`. Supabase now gates that endpoint behind a "secret" API key —
// the publishable/anon key this app uses for everything else gets a 401.
// Rather than ship a secret key to the browser (which would bypass RLS
// entirely for anyone with devtools), we parse the repo's own `schema.sql`
// dump instead. It's committed alongside every migration, so it's never
// more stale than the code, and it already carries richer column/enum
// descriptions than the OpenAPI spec ever did.
import schemaSql from '../../../schema.sql?raw';

interface EnumDef {
  values: string[];
  description: string | null;
}

interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  hasDefault: boolean;
  description: string | null;
}

interface TableDef {
  name: string;
  description: string | null;
  columns: ColumnDef[];
}

interface FunctionDef {
  name: string;
  args: string;
  returns: string;
  description: string | null;
}

interface ParsedSchema {
  enums: Map<string, EnumDef>;
  tables: Map<string, TableDef>;
  functions: FunctionDef[];
}

function unescape(sqlString: string): string {
  return sqlString.replace(/''/g, "'");
}

function parseEnums(sql: string): Map<string, EnumDef> {
  const enums = new Map<string, EnumDef>();
  const enumRe = /CREATE TYPE "public"\."(\w+)" AS ENUM \(([\s\S]*?)\);/g;
  let m: RegExpExecArray | null;
  while ((m = enumRe.exec(sql))) {
    const [, name, body] = m;
    const values = [...body.matchAll(/'([^']*)'/g)].map((v) => v[1]);
    enums.set(name, { values, description: null });
  }
  const commentRe = /COMMENT ON TYPE "public"\."(\w+)" IS '([\s\S]*?)';/g;
  while ((m = commentRe.exec(sql))) {
    const [, name, desc] = m;
    const e = enums.get(name);
    if (e) e.description = unescape(desc);
  }
  return enums;
}

// Splits a CREATE TABLE body into its top-level comma-separated column/
// constraint lines, respecting parens so nested calls like
// gen_random_uuid() or CHECK((...)) don't get split mid-expression.
function splitTopLevel(body: string): string[] {
  const lines: string[] = [];
  let depth = 0;
  let cur = '';
  for (const c of body) {
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ',' && depth === 0) {
      lines.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

function parseColumns(body: string): ColumnDef[] {
  const columns: ColumnDef[] = [];
  for (const line of splitTopLevel(body)) {
    if (line.startsWith('CONSTRAINT')) continue;
    const colMatch = line.match(/^"(\w+)"\s+([\s\S]+)$/);
    if (!colMatch) continue;
    const [, colName, rest] = colMatch;
    const nullable = !/\bNOT NULL\b/.test(rest);
    const hasDefault = /\bDEFAULT\b/.test(rest);
    const stopMatch = rest.match(/\s+(DEFAULT|NOT NULL|CHECK|COLLATE)\b/);
    const rawType = stopMatch ? rest.slice(0, stopMatch.index) : rest;
    const type = rawType
      .trim()
      .replace(/"/g, '')
      .replace(/^public\./, '');
    columns.push({ name: colName, type, nullable, hasDefault, description: null });
  }
  return columns;
}

function parseTables(sql: string): Map<string, TableDef> {
  const tables = new Map<string, TableDef>();
  const tableRe = /CREATE TABLE IF NOT EXISTS "public"\."(\w+)" \(\n([\s\S]*?)\n\);/g;
  let m: RegExpExecArray | null;
  while ((m = tableRe.exec(sql))) {
    const [, name, body] = m;
    tables.set(name, { name, description: null, columns: parseColumns(body) });
  }
  const tableCommentRe = /COMMENT ON TABLE "public"\."(\w+)" IS '([\s\S]*?)';/g;
  while ((m = tableCommentRe.exec(sql))) {
    const [, name, desc] = m;
    const t = tables.get(name);
    if (t) t.description = unescape(desc);
  }
  const colCommentRe = /COMMENT ON COLUMN "public"\."(\w+)"\."(\w+)" IS '([\s\S]*?)';/g;
  while ((m = colCommentRe.exec(sql))) {
    const [, tableName, colName, desc] = m;
    const col = tables.get(tableName)?.columns.find((c) => c.name === colName);
    if (col) col.description = unescape(desc);
  }
  return tables;
}

// PostgREST never exposes trigger/event_trigger functions as callable RPCs
// (Postgres itself refuses to invoke them outside a trigger context), so
// they're filtered out here to match what the live API would have shown.
function parseFunctions(sql: string): FunctionDef[] {
  const fns: FunctionDef[] = [];
  const fnRe =
    /CREATE (?:OR REPLACE )?FUNCTION "public"\."(\w+)"\(([^;]*?)\)\s+RETURNS\s+(SETOF\s+)?"?(?:public"\.")?(\w+)"?/g;
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(sql))) {
    const [, name, args, setof, returns] = m;
    if (returns === 'trigger' || returns === 'event_trigger') continue;
    fns.push({
      name,
      args: args.trim(),
      returns: (setof || '') + returns,
      description: null,
    });
  }
  const descByName = new Map<string, string>();
  const commentRe = /COMMENT ON FUNCTION "public"\."(\w+)"\([^)]*\) IS '([\s\S]*?)';/g;
  while ((m = commentRe.exec(sql))) {
    descByName.set(m[1], unescape(m[2]));
  }
  for (const fn of fns) fn.description = descByName.get(fn.name) ?? null;
  return fns;
}

let cachedSchema: ParsedSchema | null = null;

function getParsedSchema(): ParsedSchema {
  if (!cachedSchema) {
    cachedSchema = {
      enums: parseEnums(schemaSql),
      tables: parseTables(schemaSql),
      functions: parseFunctions(schemaSql),
    };
  }
  return cachedSchema;
}

function describeColumn(col: ColumnDef, enums: Map<string, EnumDef>): string {
  const enumDef = enums.get(col.type);
  const parts = [col.name, col.type];
  if (enumDef) parts.push(`enum[${enumDef.values.join('|')}]`);
  if (!col.nullable && !col.hasDefault) parts.push('required');
  if (col.description) parts.push(`— ${col.description}`);
  if (enumDef?.description) parts.push(`(${enumDef.description})`);
  // There is no separate "start time" column on range-typed columns like
  // tstzrange — the model otherwise guesses at a nonexistent "start"/
  // "starts_at"/"created_at" column instead of filtering the range itself.
  if (/range$/i.test(col.type)) {
    parts.push(
      `[range column: to test overlap with a window, filter with operator "ov" and a Postgres range literal value, e.g. {"column":"${col.name}","operator":"ov","value":"[2026-07-09 00:00:00,2026-07-10 00:00:00)"}]`
    );
  }
  return parts.join(' ');
}

/**
 * Keyword search across table/column/enum definitions and callable RPC
 * functions, parsed from the repo's schema.sql. Returns a compact,
 * model-friendly summary rather than the full DDL.
 */
export function searchSchema(query: string): {
  tables: {
    table: string;
    description: string | null;
    required: string[];
    columns: string[];
  }[];
  rpcFunctions: { name: string; args: string; returns: string; description: string | null }[];
} {
  const { enums, tables, functions } = getParsedSchema();
  // Split on whitespace and match on ANY token — models often search with a
  // table+column guess ("events start") rather than a single keyword, and a
  // literal whole-string substring match would find nothing for that.
  const tokens = (query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  function tableMatchesToken(t: TableDef, token: string): boolean {
    if (t.name.toLowerCase().includes(token)) return true;
    if (t.description?.toLowerCase().includes(token)) return true;
    return t.columns.some((c) => {
      if (c.name.toLowerCase().includes(token)) return true;
      if (c.description?.toLowerCase().includes(token)) return true;
      const enumDef = enums.get(c.type);
      return enumDef?.values.some((v) => v.toLowerCase().includes(token)) ?? false;
    });
  }

  const matchedTables = [...tables.values()]
    .filter((t) => !tokens.length || tokens.some((token) => tableMatchesToken(t, token)))
    .map((t) => ({
      table: t.name,
      description: t.description,
      required: t.columns.filter((c) => !c.nullable && !c.hasDefault).map((c) => c.name),
      columns: t.columns.map((c) => describeColumn(c, enums)),
    }));

  const matchedRpcs = functions
    .filter(
      (f) =>
        !tokens.length ||
        tokens.some(
          (token) =>
            f.name.toLowerCase().includes(token) || f.description?.toLowerCase().includes(token)
        )
    )
    .map((f) => ({ name: f.name, args: f.args, returns: f.returns, description: f.description }));

  return { tables: matchedTables, rpcFunctions: matchedRpcs };
}
