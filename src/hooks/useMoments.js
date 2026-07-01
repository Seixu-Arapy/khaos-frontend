import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { momentsApi } from '../lib/api/moments';

// entityRef: one of { project_id }, { section_id }, { task_id }, { event_id }
function refKey(entityRef) {
  return entityRef ? Object.entries(entityRef)[0] : null; // [column, value]
}

export function useNotes(entityRef) {
  const key = refKey(entityRef);
  return useQuery({
    queryKey: ['moments', key?.[0], key?.[1]],
    queryFn: () => momentsApi.listForEntity(entityRef),
    enabled: Boolean(key),
  });
}

export function useNoteMutations(entityRef) {
  const qc = useQueryClient();
  const key = refKey(entityRef);
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['moments', key?.[0], key?.[1]] });
  return {
    addNote: useMutation({
      mutationFn: (note) => momentsApi.addNote(entityRef, note),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: momentsApi.remove,
      onSuccess: invalidate,
    }),
  };
}
