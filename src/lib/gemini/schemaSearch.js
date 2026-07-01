import { supabase } from '../supabaseClient';
import { searchSchema } from './schemaSearch';

// Every real table the agent is allowed to write to. Keeps the agent from
// guessing at a typo'd or non-existent table name, and from attempting
// writes against read-only views.
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
];

// Tables and views the agent may read from with query_rows. Includes
// active_task_log, a view over task_logs pre-filtered to the currently
// running timer (upper_inf(duration) = true) — cheaper than scanning
// task_logs manually to find it.
export const READABLE_TABLES = [...ALLOWED_TABLES, 'active_task_log'];

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
];

const filtersSchema = {
  type: 'array',
  description: 'Row filters, all combined with AND.',
  items: {
    type: 'object',
    properties: {
      column: { type: 'string' },
      operator: { type: 'string', enum: VALID_OPERATORS },
      value: {
        description:
          'Value to compare against. For "in", pass a comma-separated string.',
      },
    },
    required: ['column', 'operator', 'value'],
  },
};

// Tools the agent can call without confirmation — they only read data.
export const READ_TOOLS = new Set(['search_schema', 'query_rows']);
// Tools that change data — always confirmed with the user first.
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
    description: `Reads rows from a table or view (SELECT). Allowed: ${READABLE_TABLES.join(', ')}. active_task_log is a read-only view pre-filtered to the currently running timer, if any — prefer it over scanning task_logs when you just need to know whether a timer is active.`,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', enum: READABLE_TABLES },
        select: {
          type: 'string',
          description:
            'Comma-separated columns, or "*" for all. Defaults to "*".',
        },
        filters: filtersSchema,
        orderBy: { type: 'string', description: 'Column to order by.' },
        ascending: { type: 'boolean' },
        limit: {
          type: 'integer',
          description: 'Max rows to return. Defaults to 25, capped at 100.',
        },
      },
      required: ['table'],
    },
  },
  {
    name: 'insert_row',
    description: `Inserts one new row into a table. Allowed tables: ${ALLOWED_TABLES.join(', ')}. Always call search_schema first if unsure of required columns or enum values.`,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', enum: ALLOWED_TABLES },
        values: {
          type: 'object',
          description: 'Column-value pairs for the new row.',
        },
      },
      required: ['table', 'values'],
    },
  },
  {
    name: 'update_rows',
    description:
      'Updates rows matching the given filters. Filters are required — updates cannot target an entire table.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', enum: ALLOWED_TABLES },
        values: { type: 'object', description: 'Column-value pairs to set.' },
        filters: filtersSchema,
      },
      required: ['table', 'values', 'filters'],
    },
  },
  {
    name: 'delete_rows',
    description:
      'Deletes rows matching the given filters. Filters are required — deletes cannot target an entire table.',
    parametersJsonSchema: {
      type: 'object',
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
      'Calls a Postgres function exposed via PostgREST, e.g. stop_active_task. Use search_schema with query "rpc" to discover available functions.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        args: {
          type: 'object',
          description: 'Named arguments for the function, if any.',
        },
      },
      required: ['name'],
    },
  },
];

function assertAllowedTable(table) {
  if (!ALLOWED_TABLES.includes(table)) {
    throw new Error(
      `"${table}" is not a recognized writable table. Call search_schema to find the right one.`
    );
  }
}

function assertReadableTable(table) {
  if (!READABLE_TABLES.includes(table)) {
    throw new Error(
      `"${table}" is not a recognized table or view. Call search_schema to find the right one.`
    );
  }
}

function applyFilters(query, filters) {
  let q = query;
  for (const f of filters || []) {
    if (!VALID_OPERATORS.includes(f.operator))
      throw new Error(`Unsupported operator "${f.operator}"`);
    q = q.filter(f.column, f.operator, f.value);
  }
  return q;
}

/** Executes a single tool call and returns a plain JSON-serializable result. */
export async function executeTool(name, args) {
  switch (name) {
    case 'search_schema':
      return searchSchema(args.query);

    case 'query_rows': {
      assertReadableTable(args.table);
      let q = supabase.from(args.table).select(args.select || '*');
      q = applyFilters(q, args.filters);
      if (args.orderBy)
        q = q.order(args.orderBy, { ascending: args.ascending !== false });
      q = q.limit(Math.min(args.limit || 25, 100));
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { rows: data, count: data.length };
    }

    case 'insert_row': {
      assertAllowedTable(args.table);
      const { data, error } = await supabase
        .from(args.table)
        .insert(args.values)
        .select();
      if (error) throw new Error(error.message);
      return { inserted: data };
    }

    case 'update_rows': {
      assertAllowedTable(args.table);
      if (!args.filters?.length)
        throw new Error('Refusing to update without at least one filter.');
      let q = supabase.from(args.table).update(args.values);
      q = applyFilters(q, args.filters);
      const { data, error } = await q.select();
      if (error) throw new Error(error.message);
      return { updated: data, count: data.length };
    }

    case 'delete_rows': {
      assertAllowedTable(args.table);
      if (!args.filters?.length)
        throw new Error('Refusing to delete without at least one filter.');
      let q = supabase.from(args.table).delete();
      q = applyFilters(q, args.filters);
      const { data, error } = await q.select();
      if (error) throw new Error(error.message);
      return { deleted: data, count: data.length };
    }

    case 'call_rpc': {
      const { data, error } = await supabase.rpc(args.name, args.args || {});
      if (error) throw new Error(error.message);
      return { result: data };
    }

    default:
      throw new Error(`Unknown tool "${name}"`);
  }
}

/** Builds a short, human-readable summary of a pending write for the confirmation card. */
export function describeAction(name, args) {
  switch (name) {
    case 'insert_row':
      return `Insert a new row into "${args.table}": ${JSON.stringify(args.values)}`;
    case 'update_rows':
      return `Update rows in "${args.table}" where ${args.filters
        .map((f) => `${f.column} ${f.operator} ${f.value}`)
        .join(' and ')} → set ${JSON.stringify(args.values)}`;
    case 'delete_rows':
      return `Delete rows from "${args.table}" where ${args.filters
        .map((f) => `${f.column} ${f.operator} ${f.value}`)
        .join(' and ')}`;
    case 'call_rpc':
      return `Call function "${args.name}"${args.args ? ` with ${JSON.stringify(args.args)}` : ''}`;
    default:
      return `${name}(${JSON.stringify(args)})`;
  }
}
