import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routinesApi } from '../lib/api/routines';
import type { Id, RoutinePatch, NewRoutine } from '../lib/types';

export function useRoutines() {
  return useQuery({ queryKey: ['routines'], queryFn: routinesApi.list });
}

export function useRoutineMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['routines'] });
  return {
    create: useMutation({
      mutationFn: (payload: NewRoutine) => routinesApi.create(payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: Id; patch: RoutinePatch }) =>
        routinesApi.update(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: Id) => routinesApi.remove(id),
      onSuccess: invalidate,
    }),
  };
}

