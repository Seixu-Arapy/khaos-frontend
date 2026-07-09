import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { momentsApi, type EntityRef } from '../lib/api/moments';
import type { Id } from '../lib/types';

function refKey(entityRef: EntityRef | null | undefined): [string, Id] | null {
  return entityRef ? (Object.entries(entityRef)[0] as [string, Id]) : null;
}

export function useNotes(entityRef: EntityRef) {
  const key = refKey(entityRef);
  return useQuery({
    queryKey: ['moments', key?.[0], key?.[1]],
    queryFn: () => momentsApi.listForEntity(entityRef),
    enabled: Boolean(key),
  });
}

export function useNoteMutations(entityRef: EntityRef) {
  const qc = useQueryClient();
  const key = refKey(entityRef);
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['moments', key?.[0], key?.[1]] });
  return {
    addNote: useMutation({
      mutationFn: (note: string) => momentsApi.addNote(entityRef, note),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: Id) => momentsApi.remove(id),
      onSuccess: invalidate,
    }),
  };
}
