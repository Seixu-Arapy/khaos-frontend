import { supabase } from '../supabaseClient';
import type { Id, Moment, MomentAuthor } from '../types';

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

  attachNoteToLatestChange: async (
    entityRef: EntityRef,
    note: string,
    authoredBy: MomentAuthor = 'user'
  ): Promise<Moment> => {
    let query = supabase.from('moments').select('id, moment_type');
    for (const [column, value] of Object.entries(entityRef)) {
      query = query.eq(column, value);
    }

    const { data: latestMoments, error: fetchError } = await query
      .neq('moment_type', 'note')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    if (latestMoments && latestMoments.length > 0) {
      const response = await supabase
        .from('moments')
        .update({ moment_note: note, authored_by: authoredBy })
        .eq('id', latestMoments[0].id)
        .select()
        .single();
      return unwrap(response);
    }

    const response = await supabase
      .from('moments')
      .insert({
        ...entityRef,
        moment_type: 'note',
        moment_note: note,
        authored_by: authoredBy,
      })
      .select()
      .single();
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
