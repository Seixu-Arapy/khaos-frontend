import { supabase } from '../supabaseClient';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export const tagsApi = {
  list: () =>
    supabase
      .from('work_tags')
      .select('*')
      .order('name', { ascending: true })
      .then(unwrap),
  create: (name) =>
    supabase
      .from('work_tags')
      .insert({ name, synonyms: [] })
      .select()
      .single()
      .then(unwrap),
  remove: (id) => supabase.from('work_tags').delete().eq('id', id).then(unwrap),

  listLinks: () => supabase.from('work_tag_entities').select('*').then(unwrap),

  // entityRef: one of { project_id }, { section_id }, { task_id }, { event_id }
  listForEntity: (entityRef) => {
    let query = supabase.from('work_tag_entities').select('*, work_tags(*)');
    for (const [column, value] of Object.entries(entityRef)) {
      query = query.eq(column, value);
    }
    return query.then(unwrap);
  },

  attach: (tagId, entityRef) =>
    supabase
      .from('work_tag_entities')
      .insert({
        work_tag_id: tagId,
        ...entityRef,
      })
      .then(unwrap),

  detach: (tagId, entityRef) => {
    let query = supabase
      .from('work_tag_entities')
      .delete()
      .eq('work_tag_id', tagId);
    for (const [column, value] of Object.entries(entityRef)) {
      query = query.eq(column, value);
    }
    return query.then(unwrap);
  },
};
