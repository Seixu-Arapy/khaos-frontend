import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  eventsApi,
  type EventInput,
  type EventPatchInput,
} from '../lib/api/events';
import { parseRange } from '../lib/range';
import type { Id } from '../lib/types';

export function useEvents() {
  return useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
}

// Set of task ids with a future 'scheduled' event, for the TaskRow badge.
export function useScheduledTaskIds() {
  const { data: events = [] } = useEvents();
  return useMemo(() => {
    const ids = new Set<Id>();
    const now = Date.now();
    events.forEach((e) => {
      if (e.event_type !== 'scheduled' || !e.task_id) return;
      const { start } = parseRange(e.duration);
      if (start && start.getTime() > now) ids.add(e.task_id);
    });
    return ids;
  }, [events]);
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
