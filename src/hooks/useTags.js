import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi } from '../lib/api/tags';

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
      mutationFn: tagsApi.create,
      onSuccess: invalidateTags,
    }),
    remove: useMutation({
      mutationFn: tagsApi.remove,
      onSuccess: () => {
        invalidateTags();
        invalidateLinks();
      },
    }),
    // entityRef: one of { project_id }, { section_id }, { task_id }, { event_id }
    attach: useMutation({
      mutationFn: ({ tagId, entityRef }) => tagsApi.attach(tagId, entityRef),
      onSuccess: invalidateLinks,
    }),
    detach: useMutation({
      mutationFn: ({ tagId, entityRef }) => tagsApi.detach(tagId, entityRef),
      onSuccess: invalidateLinks,
    }),
  };
}
