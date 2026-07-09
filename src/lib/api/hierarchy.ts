import { supabase } from '../supabaseClient';
import { edgesFromOrder } from '../reorder';
import type {
  FieldPatch,
  Id,
  NewField,
  NewProject,
  NewSection,
  NewTask,
  NewTaskItem,
  Project,
  ProjectPatch,
  Section,
  SectionPatch,
  SectionsSequence,
  Task,
  TaskItem,
  TaskItemPatch,
  TaskPatch,
  TasksSequence,
} from '../types';

function unwrap<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
}

// ---------- Fields ----------
export const fieldsApi = {
  list: async (): Promise<unknown[]> => {
    const response = await supabase
      .from('fields')
      .select('*')
      .order('order', { ascending: true });
    return unwrap(response);
  },
  create: async (payload: NewField): Promise<unknown> => {
    const response = await supabase
      .from('fields')
      .insert(payload)
      .select()
      .single();
    return unwrap(response);
  },
  update: async (id: Id, patch: FieldPatch): Promise<unknown> => {
    const response = await supabase
      .from('fields')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    return unwrap(response);
  },
  remove: async (id: Id): Promise<unknown> => {
    const response = await supabase.from('fields').delete().eq('id', id);
    return unwrap(response);
  },
};

// ---------- Projects ----------
export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const response = await supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .not('status', 'in', '("done","cancelled")');
    return unwrap(response);
  },

  get: async (id: Id): Promise<Project> => {
    const response = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    return unwrap(response);
  },
  create: async (payload: NewProject): Promise<Project> => {
    const response = await supabase
      .from('projects')
      .insert(payload)
      .select()
      .single();
    return unwrap(response);
  },
  update: async (id: Id, patch: ProjectPatch): Promise<Project> => {
    const response = await supabase
      .from('projects')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    return unwrap(response);
  },
  remove: async (id: Id): Promise<Project> => {
    const response = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return unwrap(response);
  },
};

// ---------- Sections ----------
export const sectionsApi = {
  list: async (): Promise<Section[]> => {
    const response = await supabase
      .from('sections')
      .select('*')
      .is('deleted_at', null);
    return unwrap(response);
  },
  listByProject: async (projectId: Id): Promise<Section[]> => {
    const response = await supabase
      .from('sections')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('id', { ascending: true });
    return unwrap(response);
  },
  create: async (payload: NewSection): Promise<Section> => {
    const response = await supabase
      .from('sections')
      .insert(payload)
      .select()
      .single();
    return unwrap(response);
  },
  update: async (id: Id, patch: SectionPatch): Promise<Section> => {
    const response = await supabase
      .from('sections')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    return unwrap(response);
  },
  remove: async (id: Id): Promise<Section> => {
    const response = await supabase
      .from('sections')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return unwrap(response);
  },

  async persistOrder(orderedSectionIds: Id[]): Promise<void> {
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
    if (rows.length) {
      const response = await supabase.from('sections_sequence').insert(rows);
      unwrap(response);
    }
  },
};

export const sectionsSequenceApi = {
  list: async (): Promise<SectionsSequence[]> => {
    const response = await supabase.from('sections_sequence').select('*');
    return unwrap(response);
  },
};

// ---------- Tasks ----------
export const tasksApi = {
  list: async (): Promise<Task[]> => {
    const response = await supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null);
    return unwrap(response);
  },
  listBySection: async (sectionId: Id): Promise<Task[]> => {
    const response = await supabase
      .from('tasks')
      .select('*')
      .eq('section_id', sectionId)
      .is('deleted_at', null);
    return unwrap(response);
  },
  create: async (payload: NewTask): Promise<Task> => {
    const response = await supabase
      .from('tasks')
      .insert(payload)
      .select()
      .single();
    return unwrap(response);
  },
  update: async (id: Id, patch: TaskPatch): Promise<Task> => {
    const response = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    return unwrap(response);
  },
  remove: async (id: Id): Promise<Task> => {
    const response = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return unwrap(response);
  },
  // persistOrder foi removido: tasks_sequence agora representa relações de
  // sequência entre tasks (task_previous vem antes de task_next) — ver
  // src/lib/api/sequence.ts. Não é mais usada para reordenação manual; a
  // ordem visual de uma seção é calculada cronologicamente a partir de
  // schedule/due, no client — ver ProjectDetailPage.jsx.
};

export const tasksSequenceApi = {
  list: async (): Promise<TasksSequence[]> => {
    const response = await supabase.from('tasks_sequence').select('*');
    return unwrap(response);
  },
};

// ---------- Task items (checklist) ----------
export const taskItemsApi = {
  listByTask: async (taskId: Id): Promise<TaskItem[]> => {
    const response = await supabase
      .from('task_items')
      .select('*')
      .eq('task_id', taskId)
      .order('order', { ascending: true });
    return unwrap(response);
  },
  create: async (payload: NewTaskItem): Promise<TaskItem> => {
    const response = await supabase
      .from('task_items')
      .insert(payload)
      .select()
      .single();
    return unwrap(response);
  },
  update: async (id: Id, patch: TaskItemPatch): Promise<TaskItem> => {
    const response = await supabase
      .from('task_items')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    return unwrap(response);
  },
  remove: async (id: Id): Promise<TaskItem> => {
    const response = await supabase
      .from('task_items')
      .delete()
      .eq('id', id)
      .select()
      .single();
    return unwrap(response);
  },
};
