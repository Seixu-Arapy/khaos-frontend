import { supabase } from '../supabaseClient';
import { searchSchema } from './schemaSearch';

export const ALLOWED_TABLES = [
  'fields',
  'projects',
  'sections',
  'tasks',
  'task_items',
  'task_logs',
  'events',
  'routines',
  'moments',
  'moment_tags',
  'work_tags',
  'moment_tag_entities',
  'work_tag_entities',
  'sections_sequence',
  'tasks_sequence',
] as const;

export type AllowedTable = (typeof ALLOWED_TABLES)[number];

const VALID_OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
  'cs',
  'cd',
  'ov',
] as const;

type FilterOperator = (typeof VALID_OPERATORS)[number];

export interface RowFilter {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

export interface SearchSchemaArgs {
  query: string;
}
export interface QueryRowsArgs {
  table: AllowedTable;
  select?: string;
  filters?: RowFilter[];
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
}
export interface InsertRowArgs {
  table: AllowedTable;
  values: Record<string, unknown>;
}
export interface UpdateRowsArgs {
  table: AllowedTable;
  values: Record<string, unknown>;
  filters: RowFilter[];
}
export interface DeleteRowsArgs {
  table: AllowedTable;
  filters: RowFilter[];
}
export interface CallRpcArgs {
  name: string;
  args?: Record<string, unknown>;
}

function cleanPayload(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanPayload);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, cleanPayload(v)])
    );
  }
  return obj;
}

// IMPORTANT: Groq validates the raw tool-call JSON against this schema
// *before* our code ever runs (that's what the "tool call validation
// failed" 400 is). The model frequently emits `filters` as a JSON *string*
// instead of a real array (and `ascending`/`limit` as strings too), so a
// schema that only accepts the "correct" type causes Groq itself to reject
// otherwise-fine tool calls. We accept both shapes here and coerce in
// executeTool() below.
const looseFiltersSchema = {
  type: ['array', 'string'],
  description:
    'Row filters, combined with AND. Each entry MUST have all three keys column, operator and value — never a plain {column: value} map. ' +
    'Example: to filter event_type = scheduled, pass [{"column":"event_type","operator":"eq","value":"scheduled"}]. ' +
    'Range-typed columns (e.g. tstzrange columns like "duration" or "schedule") have no separate start/end column to filter — ' +
    'to test overlap with a window, use operator "ov" with a Postgres range literal value, ' +
    'e.g. [{"column":"duration","operator":"ov","value":"[2026-07-09 00:00:00,2026-07-10 00:00:00)"}] to find events on 2026-07-09. ' +
    'When filtering by a name or other free-text column on a value the person typed (not a value you already confirmed from a prior result), ' +
    'use operator "ilike" with %wildcards% instead of "eq" — stored values may differ in case, language, or phrasing from what was typed. ' +
    'Prefer a real array of these objects; a JSON-encoded string of the same shape is also accepted.',
  items: {
    type: 'object',
    properties: {
      column: { type: 'string' },
      operator: { type: 'string', enum: VALID_OPERATORS },
      value: {
        type: 'string',
        description: 'The literal value to compare against.',
      },
    },
    required: ['column', 'operator', 'value'],
    additionalProperties: false,
  },
};

export const READ_TOOLS = new Set(['search_schema', 'query_rows']);
export const WRITE_TOOLS = new Set([
  'insert_row',
  'update_rows',
  'delete_rows',
  'call_rpc',
]);

export const functionDeclarations = [
  {
    name: 'search_schema',
    description:
      "Searches the database's schema (tables, columns, enum values, callable RPC functions) by keyword.",
    parametersJsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword to search for.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'query_rows',
    description: `Reads rows from a table (SELECT). Allowed tables: fields, projects, sections, tasks, task_items, task_logs, events, routines, moments, moment_tags, work_tags, moment_tag_entities, work_tag_entities, sections_sequence, tasks_sequence.`,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', enum: ALLOWED_TABLES },
        select: {
          type: 'string',
          description: 'Comma-separated columns or "*"',
        },
        filters: looseFiltersSchema,
        orderBy: { type: 'string' },
        ascending: {
          type: ['boolean', 'string'],
          description: 'true/false. May be sent as a string.',
        },
        limit: {
          type: ['integer', 'string'],
          description: 'Max rows to return. May be sent as a string.',
        },
      },
      required: ['table'],
      additionalProperties: false,
    },
  },
  {
    name: 'insert_row',
    description: `Inserts a single new row into a table. Allowed tables: ${ALLOWED_TABLES.join(', ')}.`,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', enum: ALLOWED_TABLES },
        values: {
          type: 'object',
          description: 'Column/value pairs to insert.',
          additionalProperties: true,
        },
      },
      required: ['table', 'values'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_rows',
    description: `Updates rows matching given filters. Allowed tables: ${ALLOWED_TABLES.join(', ')}.`,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', enum: ALLOWED_TABLES },
        values: {
          type: 'object',
          description: 'Column/value pairs to set.',
          additionalProperties: true,
        },
        filters: looseFiltersSchema,
      },
      required: ['table', 'values', 'filters'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_rows',
    description: `Deletes rows matching given filters. Allowed tables: ${ALLOWED_TABLES.join(', ')}.`,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', enum: ALLOWED_TABLES },
        filters: looseFiltersSchema,
      },
      required: ['table', 'filters'],
      additionalProperties: false,
    },
  },
  {
    name: 'call_rpc',
    description: 'Calls a Postgres RPC function exposed by Supabase.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the RPC function.' },
        args: {
          type: 'object',
          description: 'Named arguments for the RPC function.',
          additionalProperties: true,
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
];

function assertAllowedTable(table: string): asserts table is AllowedTable {
  if (!(ALLOWED_TABLES as readonly string[]).includes(table)) {
    throw new Error(`"${table}" is not a recognized table.`);
  }
}

function applyFilters<
  T extends { filter: (column: string, operator: string, value: unknown) => T },
>(query: T, filters?: RowFilter[]): T {
  let q = query;
  for (const f of filters || []) {
    q = q.filter(f.column, f.operator, f.value);
  }
  return q;
}

// The model occasionally collapses filters into a plain {column: value} map
// (e.g. {"id": "Chicago"}) instead of the documented array-of-objects shape.
// Treat every entry as an equality filter rather than dropping it — silently
// coercing an unrecognized shape to [] here would strip the WHERE clause
// entirely, turning an update/delete meant for one row into one that hits
// every row in the table.
function objectToFilters(obj: Record<string, unknown>): RowFilter[] {
  return Object.entries(obj).map(([column, value]) => ({
    column,
    operator: 'eq' as const,
    value,
  }));
}

// Filters may legitimately arrive as a real array, or (because the model
// sometimes emits them that way, and Groq's schema now permits it) as a
// JSON-encoded string, or as a plain object map. Normalize to an array here,
// once, for every tool.
export function coerceFilters(raw: unknown): RowFilter[] {
  if (Array.isArray(raw)) return raw as RowFilter[];
  if (raw !== null && typeof raw === 'object') {
    return objectToFilters(raw as Record<string, unknown>);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed !== null && typeof parsed === 'object') {
        return objectToFilters(parsed);
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

// The model sometimes calls the singular/plural variant of a tool name, or
// uses "set" instead of the documented "values" key for insert_row/
// update_rows. Normalize both before dispatch so a cosmetic mismatch doesn't
// surface as "Unknown tool" or silently drop the payload.
const TOOL_NAME_ALIASES: Record<string, string> = {
  update_row: 'update_rows',
  insert_rows: 'insert_row',
  delete_row: 'delete_rows',
  query_row: 'query_rows',
};

export function normalizeToolName(name: string): string {
  return TOOL_NAME_ALIASES[name] ?? name;
}

// Like filters, "values" (or the "set" alias) may arrive as a real object or
// as a JSON-encoded string.
export function coerceValues(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const candidate = raw.values ?? raw.set ?? {};
  if (typeof candidate === 'string') {
    try {
      const parsed = JSON.parse(candidate);
      return parsed !== null && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return candidate as Record<string, unknown>;
}

function coerceBoolean(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() !== 'false';
  return fallback;
}

function coerceInt(raw: unknown, fallback: number): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

export async function executeTool(
  rawName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const name = normalizeToolName(rawName);
  switch (name) {
    case 'search_schema': {
      return cleanPayload(searchSchema((args as any).query));
    }
    case 'query_rows': {
      const a = args as any;
      assertAllowedTable(a.table);
      let q = supabase.from(a.table).select(a.select || '*');

      const safeFilters = coerceFilters(a.filters);
      if (safeFilters.length) q = applyFilters(q, safeFilters);

      if (a.orderBy) {
        q = q.order(a.orderBy, { ascending: coerceBoolean(a.ascending, true) });
      }

      const lim = coerceInt(a.limit, 8);
      q = q.limit(Math.min(lim, 40));

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { rows: cleanPayload(data ?? []), count: data?.length ?? 0 };
    }
    case 'insert_row': {
      const a = args as any;
      assertAllowedTable(a.table);
      const { data, error } = await supabase
        .from(a.table)
        .insert(coerceValues(a) as never)
        .select();
      if (error) throw new Error(error.message);
      return { inserted: cleanPayload(data ?? []) };
    }
    case 'update_rows': {
      const a = args as any;
      assertAllowedTable(a.table);
      let q = supabase.from(a.table).update(coerceValues(a) as never);
      q = applyFilters(q, coerceFilters(a.filters));
      const { data, error } = await q.select();
      if (error) throw new Error(error.message);
      return { updated: cleanPayload(data ?? []), count: data?.length ?? 0 };
    }
    case 'delete_rows': {
      const a = args as any;
      assertAllowedTable(a.table);
      let q = supabase.from(a.table).delete();
      q = applyFilters(q, coerceFilters(a.filters));
      const { data, error } = await q.select();
      if (error) throw new Error(error.message);
      return { deleted: cleanPayload(data ?? []), count: data?.length ?? 0 };
    }
    case 'call_rpc': {
      const a = args as unknown as CallRpcArgs;
      const { data, error } = await supabase.rpc(a.name as any, a.args || {});
      if (error) throw new Error(error.message);
      return { result: cleanPayload(data) };
    }
    default:
      throw new Error(`Unknown tool "${name}"`);
  }
}

export function describeAction(
  name: string,
  args: Record<string, unknown>
): string {
  return `${name}(${JSON.stringify(args)})`;
}
