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

// Helper para remover recursivamente valores nulos, indefinidos ou vazios e economizar tokens no payload
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

const filtersSchema = {
  type: 'array',
  description: 'Row filters, all combined with AND.',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      column: { type: 'string' },
      operator: { type: 'string', enum: VALID_OPERATORS },
      value: {
        type: 'string',
        description:
          'Value to compare against, always as a string (e.g. "42", "true", "2026-01-01"). For "in", pass a comma-separated string.',
      },
    },
    required: ['column', 'operator', 'value'],
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
      "Searches the database's live OpenAPI schema by keyword to find table names, columns, types, enum values, and available RPC functions. Call this first whenever you're unsure of exact table/column names or valid enum values.",
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: {
          type: 'string',
          description: 'Keyword to search for, e.g. "priority" or "calendar".',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'query_rows',
    description: `Reads rows from a table (SELECT). Prefer selecting specific, needed columns (e.g., "id, name, status") instead of "*" to save context space. Allowed tables: ${ALLOWED_TABLES.join(', ')}.`,
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        table: { type: 'string', enum: ALLOWED_TABLES },
        select: {
          type: 'string',
          description:
            'Comma-separated columns. Avoid using "*" unless absolutely necessary.',
        },
        filters: filtersSchema,
        orderBy: { type: 'string', description: 'Column to order by.' },
        ascending: { type: 'boolean' },
        limit: {
          type: 'integer',
          description:
            'Max rows to return. Defaults to 8, capped at 40 to avoid token limits.',
        },
      },
      required: ['table'],
    },
  },
  {
    name: 'insert_row',
    description: `Inserts a single new row into a table. Allowed tables: ${ALLOWED_TABLES.join(', ')}.`,
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        table: { type: 'string', enum: ALLOWED_TABLES },
        values: {
          type: 'object',
          description:
            'Column/value pairs to insert, e.g. { "name": "Task name", "status": "todo" }.',
        },
      },
      required: ['table', 'values'],
    },
  },
  {
    name: 'update_rows',
    description: `Updates rows matching the given filters. Always include at least one filter (usually "id"). Allowed tables: ${ALLOWED_TABLES.join(', ')}.`,
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        table: { type: 'string', enum: ALLOWED_TABLES },
        values: {
          type: 'object',
          description: 'Column/value pairs to set.',
        },
        filters: filtersSchema,
      },
      required: ['table', 'values', 'filters'],
    },
  },
  {
    name: 'delete_rows',
    description: `Soft- or hard-deletes rows matching the given filters (use update_rows with deleted_at for soft delete when the table supports it). Allowed tables: ${ALLOWED_TABLES.join(', ')}.`,
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        table: { type: 'string', enum: ALLOWED_TABLES },
        filters: filtersSchema,
      },
      required: ['table', 'filters'],
    },
  },
  {
    name: 'call_rpc',
    description:
      'Calls a Postgres RPC function exposed by Supabase (e.g. stop_active_task).',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string', description: 'Name of the RPC function.' },
        args: {
          type: 'object',
          description: 'Named arguments for the RPC function, if any.',
        },
      },
      required: ['name'],
    },
  },
];

function assertAllowedTable(table: string): asserts table is AllowedTable {
  if (!(ALLOWED_TABLES as readonly string[]).includes(table)) {
    throw new Error(
      `"${table}" is not a recognized table. Call search_schema to find the right one.`
    );
  }
}

function applyFilters<
  T extends { filter: (column: string, operator: string, value: unknown) => T },
>(query: T, filters?: RowFilter[]): T {
  let q = query;
  for (const f of filters || []) {
    if (!(VALID_OPERATORS as readonly string[]).includes(f.operator))
      throw new Error(`Unsupported operator "${f.operator}"`);
    q = q.filter(f.column, f.operator, f.value);
  }
  return q;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'search_schema': {
      const a = args as SearchSchemaArgs;
      return cleanPayload(searchSchema(a.query)); // Limpa o payload do schema
    }

    case 'query_rows': {
      const a = args as QueryRowsArgs;
      assertAllowedTable(a.table);
      let q = supabase.from(a.table).select(a.select || '*');
      q = applyFilters(q, a.filters);
      if (a.orderBy)
        q = q.order(a.orderBy, { ascending: a.ascending !== false });

      // Otimização: Aplicando os limites severos de token (Padrão: 8, Máximo: 40)
      q = q.limit(Math.min(a.limit || 8, 40));

      const { data, error } = await q;
      if (error) throw new Error(error.message);

      // Otimização: Remove chaves inúteis que contêm 'null' ou strings vazias
      const cleanedRows = cleanPayload(data ?? []);
      return { rows: cleanedRows, count: cleanedRows.length };
    }

    case 'insert_row': {
      const a = args as InsertRowArgs;
      assertAllowedTable(a.table);
      const { data, error } = await supabase
        .from(a.table)
        .insert(a.values as never)
        .select();
      if (error) throw new Error(error.message);
      return { inserted: cleanPayload(data ?? []) };
    }

    case 'update_rows': {
      const a = args as UpdateRowsArgs;
      assertAllowedTable(a.table);
      if (!a.filters?.length)
        throw new Error('Refusing to update without at least one filter.');
      let q = supabase.from(a.table).update(a.values as never);
      q = applyFilters(q, a.filters);
      const { data, error } = await q.select();
      if (error) throw new Error(error.message);
      return { updated: cleanPayload(data ?? []), count: data?.length ?? 0 };
    }

    case 'delete_rows': {
      const a = args as DeleteRowsArgs;
      assertAllowedTable(a.table);
      if (!a.filters?.length)
        throw new Error('Refusing to delete without at least one filter.');
      let q = supabase.from(a.table).delete();
      q = applyFilters(q, a.filters);
      const { data, error } = await q.select();
      if (error) throw new Error(error.message);
      return { deleted: cleanPayload(data ?? []), count: data?.length ?? 0 };
    }

    case 'call_rpc': {
      const a = args as CallRpcArgs;
      const { data, error } = await supabase.rpc(
        a.name as unknown as Parameters<typeof supabase.rpc>[0],
        a.args || {}
      );
      if (error) throw new Error(error.message);
      return { result: cleanPayload(data) };
    }

    default:
      throw new Error(`Unknown tool "${name}"`);
  }
}

/** Builds a short, human-readable summary of a pending write for the confirmation card. */
export function describeAction(
  name: string,
  args: Record<string, unknown>
): string {
  switch (name) {
    case 'insert_row': {
      const a = args as InsertRowArgs;
      return `Insert a new row into "${a.table}": ${JSON.stringify(a.values)}`;
    }
    case 'update_rows': {
      const a = args as UpdateRowsArgs;
      return `Update rows in "${a.table}" where ${a.filters
        .map((f) => `${f.column} ${f.operator} ${f.value}`)
        .join(' and ')} → set ${JSON.stringify(a.values)}`;
    }
    case 'delete_rows': {
      const a = args as DeleteRowsArgs;
      return `Delete rows from "${a.table}" where ${a.filters
        .map((f) => `${f.column} ${f.operator} ${f.value}`)
        .join(' and ')}`;
    }
    case 'call_rpc': {
      const a = args as CallRpcArgs;
      return `Call function "${a.name}"${a.args ? ` with ${JSON.stringify(a.args)}` : ''}`;
    }
    default:
      return `${name}(${JSON.stringify(args)})`;
  }
}
