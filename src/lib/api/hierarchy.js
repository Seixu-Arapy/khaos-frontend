import { supabase } from '../supabaseClient';
import { edgesFromOrder } from '../reorder';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// ---------- Fields ----------
export const fieldsApi = {
  list: () =>
    supabase
      .from('fields')
      .select('*')
      .order('order', { ascending: true })
      .then(unwrap),
  create: (payload) =>
    supabase.from('fields').insert(payload).select().single().then(unwrap),
  update: (id, patch) =>
    supabase
      .from('fields')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
      .then(unwrap),
  remove: (id) => supabase.from('fields').delete().eq('id', id).then(unwrap),
};

// ---------- Projects ----------
export const projectsApi = {
  list: () => supabase.from('projects').select('*').then(unwrap),
  get: (id) =>
    supabase.from('projects').select('*').eq('id', id).single().then(unwrap),
  create: (payload) =>
    supabase.from('projects').insert(payload).select().single().then(unwrap),
  update: (id, patch) =>
    supabase
      .from('projects')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
      .then(unwrap),
  archive: (id) =>
    supabase
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single()
      .then(unwrap),
  remove: (id) => supabase.from('projects').delete().eq('id', id).then(unwrap),
};

// ---------- Sections ----------
export const sectionsApi = {
  list: () => supabase.from('sections').select('*').then(unwrap),
  listByProject: (projectId) =>
    supabase
      .from('sections')
      .select('*')
      .eq('project_id', projectId)
      .then(unwrap),
  create: (payload) =>
    supabase.from('sections').insert(payload).select().single().then(unwrap),
  update: (id, patch) =>
    supabase
      .from('sections')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
      .then(unwrap),
  archive: (id) =>
    supabase
      .from('sections')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single()
      .then(unwrap),
  remove: (id) => supabase.from('sections').delete().eq('id', id).then(unwrap),

  // Rewrites the whole ordering chain for a project's sections. Simple and
  // crash-safe at personal-project scale (handfuls to dozens of sections).
  async persistOrder(projectId, orderedSectionIds) {
    await supabase
      .from('sections_sequence')
      .delete()
      .in('section_previous', orderedSectionIds);
    await supabase
      .from('sections_sequence')
      .delete()
      .in('section_next', orderedSectionIds);
    const rows = edgesFromOrder(
      orderedSectionIds,
      'section_previous',
      'section_next'
    );
    if (rows.length)
      await supabase.from('sections_sequence').insert(rows).then(unwrap);
  },
};

export const sectionsSequenceApi = {
  list: () => supabase.from('sections_sequence').select('*').then(unwrap),
};

// ---------- Tasks ----------
export const tasksApi = {
  list: () => supabase.from('tasks').select('*').then(unwrap),
  listBySection: (sectionId) =>
    supabase.from('tasks').select('*').eq('section_id', sectionId).then(unwrap),
  get: (id) =>
    supabase.from('tasks').select('*').eq('id', id).single().then(unwrap),
  create: (payload) =>
    supabase.from('tasks').insert(payload).select().single().then(unwrap),
  update: (id, patch) =>
    supabase
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
      .then(unwrap),
  archive: (id) =>
    supabase
      .from('tasks')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single()
      .then(unwrap),
  remove: (id) => supabase.from('tasks').delete().eq('id', id).then(unwrap),

  async persistOrder(orderedTaskIds) {
    await supabase
      .from('tasks_sequence')
      .delete()
      .in('task_previous', orderedTaskIds);
    await supabase
      .from('tasks_sequence')
      .delete()
      .in('task_next', orderedTaskIds);
    const rows = edgesFromOrder(orderedTaskIds, 'task_previous', 'task_next');
    if (rows.length)
      await supabase.from('tasks_sequence').insert(rows).then(unwrap);
  },
};

export const tasksSequenceApi = {
  list: () => supabase.from('tasks_sequence').select('*').then(unwrap),
};

// ---------- Task items (checklist) ----------
export const taskItemsApi = {
  listByTask: (taskId) =>
    supabase
      .from('task_items')
      .select('*')
      .eq('task_id', taskId)
      .order('order', { ascending: true })
      .then(unwrap),
  create: (payload) =>
    supabase.from('task_items').insert(payload).select().single().then(unwrap),
  update: (id, patch) =>
    supabase
      .from('task_items')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
      .then(unwrap),
  remove: (id) =>
    supabase.from('task_items').delete().eq('id', id).then(unwrap),
};
