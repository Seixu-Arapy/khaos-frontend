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

export function useTaskItems(taskId) {
  return useQuery({
    queryKey: ['taskItems', taskId],
    queryFn: () => taskItemsApi.listByTask(taskId),
    enabled: Boolean(taskId),
  });
}

// Orders a set of task ids that share a section using tasks_sequence edges
export function useOrderedTaskIds(sectionId, tasks, sequenceEdges) {
  const ids = tasks.filter((t) => t.section_id === sectionId).map((t) => t.id);
  const edges = sequenceEdges
    .filter((e) => ids.includes(e.task_previous) && ids.includes(e.task_next))
    .map((e) => ({ prev: e.task_previous, next: e.task_next }));
  return orderFromEdges(ids, edges);
}

export function useOrderedSectionIds(projectId, sections, sequenceEdges) {
  const ids = sections
    .filter((s) => s.project_id === projectId)
    .map((s) => s.id);
  const edges = sequenceEdges
    .filter(
      (e) => ids.includes(e.section_previous) && ids.includes(e.section_next)
    )
    .map((e) => ({ prev: e.section_previous, next: e.section_next }));
  return orderFromEdges(ids, edges);
}

// ---------- Mutations ----------

export function useFieldMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['fields'] });
  return {
    create: useMutation({
      mutationFn: fieldsApi.create,
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }) => fieldsApi.update(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: fieldsApi.remove,
      onSuccess: invalidate,
    }),
  };
}

export function useProjectMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['projects'] });
  return {
    create: useMutation({
      mutationFn: projectsApi.create,
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }) => projectsApi.update(id, patch),
      onSuccess: invalidate,
    }),
    archive: useMutation({
      mutationFn: projectsApi.archive,
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: projectsApi.remove,
      onSuccess: () => {
        invalidate();
        qc.invalidateQueries({ queryKey: ['sections'] });
        qc.invalidateQueries({ queryKey: ['tasks'] });
      },
    }),
  };
}

export function useSectionMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['sections'] });
  return {
    create: useMutation({
      mutationFn: sectionsApi.create,
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }) => sectionsApi.update(id, patch),
      onSuccess: invalidate,
    }),
    archive: useMutation({
      mutationFn: sectionsApi.archive,
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: sectionsApi.remove,
      onSuccess: () => {
        invalidate();
        qc.invalidateQueries({ queryKey: ['tasks'] });
      },
    }),
    reorder: useMutation({
      mutationFn: ({ projectId, orderedIds }) =>
        sectionsApi.persistOrder(projectId, orderedIds),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['sectionsSequence'] }),
    }),
  };
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks'] });
  return {
    create: useMutation({ mutationFn: tasksApi.create, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, patch }) => tasksApi.update(id, patch),
      onSuccess: invalidate,
    }),
    archive: useMutation({
      mutationFn: tasksApi.archive,
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: tasksApi.remove, onSuccess: invalidate }),
    reorder: useMutation({
      mutationFn: ({ orderedIds }) => tasksApi.persistOrder(orderedIds),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['tasksSequence'] }),
    }),
  };
}

export function useTaskItemMutations(taskId) {
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['taskItems', taskId] });
  return {
    create: useMutation({
      mutationFn: taskItemsApi.create,
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }) => taskItemsApi.update(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: taskItemsApi.remove,
      onSuccess: invalidate,
    }),
  };
}
