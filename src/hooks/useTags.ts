import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi, type TagEntityRef } from '../lib/api/tags';
import type { Id } from '../lib/types';

export function useTags() {
  return useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });
}

export function useTagLinks() {
  return useQuery({ queryKey: ['tagLinks'], queryFn: tagsApi.listLinks });
}

export function useTagMutations() {
  const qc = useQueryClient();
  const invalidateTags = () => qc.invalidateQueries({ queryKey: ['tags'] });
  const invalidateLinks = () =>
    qc.invalidateQueries({ queryKey: ['tagLinks'] });
  return {
    create: useMutation({
      mutationFn: (name: string) => tagsApi.create(name),
      onSuccess: invalidateTags,
    }),
    remove: useMutation({
      mutationFn: (id: Id) => tagsApi.remove(id),
      onSuccess: () => {
        invalidateTags();
        invalidateLinks();
      },
    }),
    // entityRef: one of { project_id }, { section_id }, { task_id }, { event_id }
    attach: useMutation({
      mutationFn: ({
        tagId,
        entityRef,
      }: {
        tagId: Id;
        entityRef: TagEntityRef;
      }) => tagsApi.attach(tagId, entityRef),
      onSuccess: invalidateLinks,
    }),
    detach: useMutation({
      mutationFn: ({
        tagId,
        entityRef,
      }: {
        tagId: Id;
        entityRef: TagEntityRef;
      }) => tagsApi.detach(tagId, entityRef),
      onSuccess: invalidateLinks,
    }),
  };
}
