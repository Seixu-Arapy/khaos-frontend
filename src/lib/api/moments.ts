import { supabase } from '../supabaseClient';
import type { Id, Moment } from '../types';

function unwrap<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
}

export type EntityRef = Record<string, Id>;

export const momentsApi = {
  listForEntity: async (entityRef: EntityRef): Promise<Moment[]> => {
    let query = supabase.from('moments').select('*');
    for (const [column, value] of Object.entries(entityRef)) {
      query = query.eq(column, value);
    }
    const response = await query.order('created_at', { ascending: false });
    return unwrap(response);
  },

  addNote: async (entityRef: EntityRef, note: string): Promise<Moment> => {
    const response = await supabase
      .from('moments')
      .insert({
        ...entityRef,
        moment_type: 'note',
        moment_note: note,
      })
      .select()
      .single();
    return unwrap(response);
  },

  remove: async (id: Id): Promise<Moment> => {
    const response = await supabase
      .from('moments')
      .delete()
      .eq('id', id)
      .select()
      .single();
    return unwrap(response);
  },
};
