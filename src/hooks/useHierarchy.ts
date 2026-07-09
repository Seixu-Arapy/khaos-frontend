import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fieldsApi,
  projectsApi,
  sectionsApi,
  tasksApi,
  taskItemsApi,
  tasksSequenceApi,
  sectionsSequenceApi,
} from '../lib/api/hierarchy';
import { orderFromEdges } from '../lib/reorder';
import type {
  Id,
  Section,
  SectionsSequence,
  SectionPatch,
  NewSection,
  TaskPatch,
  NewTask,
  TaskItemPatch,
  NewTaskItem,
  NewField,
  FieldPatch,
  NewProject,
  ProjectPatch,
} from '../lib/types';

// ---------- Reads ----------
// Fetched as flat lists and grouped client-side — simplest correct approach
// at the scale of a single person's task manager.

export function useFields() {
  return useQuery({ queryKey: ['fields'], queryFn: fieldsApi.list });
}

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
}

export function useSections() {
  return useQuery({ queryKey: ['sections'], queryFn: sectionsApi.list });
}

export function useTasks() {
  return useQuery({ queryKey: ['tasks'], queryFn: tasksApi.list });
}

export function useTasksSequence() {
  return useQuery({
    queryKey: ['tasksSequence'],
    queryFn: tasksSequenceApi.list,
  });
}

export function useSectionsSequence() {
  return useQuery({
    queryKey: ['sectionsSequence'],
    queryFn: sectionsSequenceApi.list,
  });
}

export function useTaskItems(taskId: Id | undefined) {
  return useQuery({
    queryKey: ['taskItems', taskId],
    queryFn: () => taskItemsApi.listByTask(taskId as Id),
    enabled: Boolean(taskId),
  });
}

// tasks_sequence agora é só o grafo de dependências (ver
// src/hooks/useDependencies.js) — não existe mais ordenação manual de
// tasks por linked-list. Sections continuam usando sections_sequence.
export function useOrderedSectionIds(
  projectId: Id,
  sections: Section[],
  sequenceEdges: SectionsSequence[]
): Id[] {
  const ids = sections
    .filter((s) => s.project_id === projectId)
    .map((s) => s.id);
  const edges = sequenceEdges
    .filter(
      (e) => ids.includes(e.section_previous) && ids.includes(e.section_next)
    )
    .map((e) => ({ prev: e.section_previous, next: e.section_next }));
  // orderFromEdges (reorder.js) is JSDoc-typed for number[] ids, but this
  // codebase's ids are uuid strings — the implementation is id-type-agnostic.
  const typedOrderFromEdges = orderFromEdges as unknown as (
    ids: Id[],
    edges: { prev: Id; next: Id }[]
  ) => Id[];
  return typedOrderFromEdges(ids, edges);
}

// ---------- Mutations ----------

export function useFieldMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['fields'] });
  return {
    create: useMutation({
      mutationFn: (payload: NewField) => fieldsApi.create(payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: Id; patch: FieldPatch }) =>
        fieldsApi.update(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: Id) => fieldsApi.remove(id),
      onSuccess: invalidate,
    }),
  };
}

export function useProjectMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['projects'] });
  return {
    create: useMutation({
      mutationFn: (payload: NewProject) => projectsApi.create(payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: Id; patch: ProjectPatch }) =>
        projectsApi.update(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: Id) => projectsApi.remove(id),
      onSuccess: invalidate,
    }),
  };
}

export function useSectionMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['sections'] });
  return {
    create: useMutation({
      mutationFn: (payload: NewSection) => sectionsApi.create(payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: Id; patch: SectionPatch }) =>
        sectionsApi.update(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: Id) => sectionsApi.remove(id),
      onSuccess: invalidate,
    }),
    reorder: useMutation({
      mutationFn: ({ orderedIds }: { orderedIds: Id[] }) =>
        sectionsApi.persistOrder(orderedIds),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['sectionsSequence'] }),
    }),
  };
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks'] });
  return {
    create: useMutation({
      mutationFn: (payload: NewTask) => tasksApi.create(payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: Id; patch: TaskPatch }) =>
        tasksApi.update(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: Id) => tasksApi.remove(id),
      onSuccess: invalidate,
    }),
    // reorder foi removido — ver comentário em tasksApi (hierarchy.ts).
  };
}

export function useTaskItemMutations(taskId: Id) {
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['taskItems', taskId] });
  return {
    create: useMutation({
      mutationFn: (payload: NewTaskItem) => taskItemsApi.create(payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: Id; patch: TaskItemPatch }) =>
        taskItemsApi.update(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: Id) => taskItemsApi.remove(id),
      onSuccess: invalidate,
    }),
  };
}
