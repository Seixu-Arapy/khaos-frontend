import { supabase } from '../supabaseClient';
import {
  describeAction,
  coerceFilters,
  coerceValues,
  type RowFilter,
  type InsertRowArgs,
  type UpdateRowsArgs,
  type DeleteRowsArgs,
} from './tools';

export type PreviewEntityType = 'task' | 'project' | null;

export interface FieldChange {
  field: string;
  label: string;
  from: unknown;
  to: unknown;
}

export interface ConfirmationPreview {
  kind: 'insert' | 'update' | 'delete' | 'generic';
  entityType: PreviewEntityType;
  entities: Record<string, unknown>[];
  changes?: FieldChange[];
  summaryText?: string;
}

const ENTITY_TABLES: Record<string, PreviewEntityType> = {
  tasks: 'task',
  projects: 'project',
};

const FIELD_LABELS: Record<string, string> = {
  status: 'status',
  priority: 'priority',
  due: 'due date',
  estimate: 'estimate',
  name: 'name',
  target: 'target',
};

function getIdFilter(filters?: RowFilter[]): string | null {
  const match = (filters || []).find(
    (f) => f.column === 'id' && f.operator === 'eq'
  );
  return match ? String(match.value) : null;
}

export async function buildConfirmationPreview(
  name: string,
  args: Record<string, unknown>
): Promise<ConfirmationPreview> {
  if (name === 'insert_row') {
    const a = args as unknown as InsertRowArgs;
    return {
      kind: 'insert',
      entityType: ENTITY_TABLES[a.table] ?? null,
      entities: [coerceValues(args)],
    };
  }

  if (name === 'update_rows') {
    const a = args as unknown as UpdateRowsArgs;
    const entityType = ENTITY_TABLES[a.table] ?? null;
    const filters = coerceFilters(a.filters);
    const values = coerceValues(args);
    const id = getIdFilter(filters);
    let before: Record<string, unknown> | null = null;

    if (entityType && id) {
      // a.table is a union of every allowed table, and not all of them
      // (e.g. sections_sequence) have an `id` column — but entityType is
      // only set for tasks/projects, both of which do.
      const { data } = await supabase
        .from(a.table as never)
        .select('*')
        .eq('id', id)
        .single();
      before = data;
    }

    const changes: FieldChange[] = Object.entries(values).map(
      ([field, to]) => ({
        field,
        label: FIELD_LABELS[field] || field,
        from: before ? before[field] : undefined,
        to,
      })
    );

    return {
      kind: 'update',
      entityType,
      entities: before ? [before] : [],
      changes,
    };
  }

  if (name === 'delete_rows') {
    const a = args as unknown as DeleteRowsArgs;
    const entityType = ENTITY_TABLES[a.table] ?? null;
    let entities: Record<string, unknown>[] = [];

    if (entityType) {
      let query = supabase.from(a.table).select('*');
      for (const f of coerceFilters(a.filters)) {
        query = query.filter(f.column, f.operator, f.value);
      }
      const { data } = await query.limit(10);
      entities = data || [];
    }

    return { kind: 'delete', entityType, entities };
  }

  return {
    kind: 'generic',
    entityType: null,
    entities: [],
    summaryText: describeAction(name, args),
  };
}
