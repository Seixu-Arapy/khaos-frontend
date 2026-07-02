import { supabase } from '../supabaseClient';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export const momentsApi = {
  listForEntity: (entityRef) => {
    let query = supabase.from('moments').select('*');
    for (const [column, value] of Object.entries(entityRef)) {
      query = query.eq(column, value);
    }
    return query.order('created_at', { ascending: false }).then(unwrap);
  },

  attachNoteToLatestChange: async (entityRef, note) => {
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
      return supabase
        .from('moments')
        .update({ moment_note: note })
        .eq('id', latestMoments[0].id)
        .select()
        .single()
        .then(unwrap);
    }

    return supabase
      .from('moments')
      .insert({
        ...entityRef,
        moment_type: 'note',
        moment_note: note,
      })
      .select()
      .single()
      .then(unwrap);
  },

  remove: (id) => supabase.from('moments').delete().eq('id', id).then(unwrap),
};
