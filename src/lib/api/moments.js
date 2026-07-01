import { supabase } from '../supabaseClient';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export const momentsApi = {
  // entityRef: one of { project_id }, { section_id }, { task_id }, { event_id }
  listForEntity: (entityRef) => {
    let query = supabase.from('moments').select('*');
    for (const [column, value] of Object.entries(entityRef)) {
      query = query.eq(column, value);
    }
    return query.order('created_at', { ascending: false }).then(unwrap);
  },

  addNote: (entityRef, note) =>
    supabase
      .from('moments')
      .insert({
        ...entityRef,
        moment_type: 'note',
        moment_note: note,
      })
      .select()
      .single()
      .then(unwrap),

  remove: (id) => supabase.from('moments').delete().eq('id', id).then(unwrap),
};
