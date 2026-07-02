import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  eventsApi,
  type EventInput,
  type EventPatchInput,
} from '../lib/api/events';
import type { Id } from '../lib/types';

export function useEvents() {
  return useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
}

export function useEventMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['events'] });
  return {
    create: useMutation({
      mutationFn: (input: EventInput) => eventsApi.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: Id; patch: EventPatchInput }) =>
        eventsApi.update(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: Id) => eventsApi.remove(id),
      onSuccess: invalidate,
    }),
  };
}
