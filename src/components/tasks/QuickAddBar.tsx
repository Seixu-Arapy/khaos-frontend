import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  useProjects,
  useSections,
  useTaskMutations,
} from '../../hooks/useHierarchy';
import { parseQuickAdd } from '../../lib/quickAdd';
import { PRIORITIES } from '../../lib/constants';
import { Modal, Select, TextInput, Button } from '../common/ui';
import { toDatetimeLocalValue } from '../../lib/dateUtils';
import type { Id, Priority } from '../../lib/types';

interface Draft {
  name: string;
  priority: Priority;
  dueDate: Date | null;
  projectId: Id | null;
  sectionId: Id | null;
}

export default function QuickAddBar() {
  const { data: projects = [] } = useProjects();
  const { data: sections = [] } = useSections();
  const { create } = useTaskMutations();

  const [raw, setRaw] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);

  const sectionsForProject = useMemo(
    () => sections.filter((s) => s.project_id === draft?.projectId),
    [sections, draft?.projectId]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raw.trim()) return;
    const parsed = parseQuickAdd(raw, projects);
    const defaultSections = sections.filter(
      (s) => s.project_id === parsed.projectId
    );
    setDraft({
      name: parsed.name || raw,
      priority: parsed.priority || 'medium',
      dueDate: parsed.dueDate,
      projectId: parsed.projectId || defaultSections[0]?.project_id || null,
      sectionId: defaultSections[0]?.id || null,
    });
  }

  function confirmCreate() {
    if (!draft || !draft.sectionId || !draft.name.trim()) return;
    create.mutate(
      {
        section_id: draft.sectionId,
        name: draft.name.trim(),
        priority: draft.priority,
        due: draft.dueDate ? new Date(draft.dueDate).toISOString() : null,
      },
      { onSuccess: () => setDraft(null) }
    );
    setRaw('');
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="relative max-w-xl flex-1">
        <Sparkles
          size={15}
          className="text-nyx-500 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Quick add: Finish report tomorrow 3pm #ProjectX !high"
          className="border-nyx-700 bg-nyx-800 text-nyx-100 placeholder:text-nyx-500 focus:border-eros-400 w-full rounded-full border py-2 pr-3 pl-9 text-body focus:outline-hidden"
        />
      </form>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title="New task"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmCreate}
              disabled={
                !draft?.sectionId || !draft?.name.trim() || create.isPending
              }
            >
              Create task
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-3">
            <div>
              <label className="text-nyx-400 mb-1 block text-caption font-medium">
                Name
              </label>
              <TextInput
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-nyx-400 mb-1 block text-caption font-medium">
                  Project
                </label>
                <Select
                  value={draft.projectId ?? ''}
                  className="w-full"
                  onChange={(e) => {
                    const projectId = e.target.value;
                    const firstSection = sections.find(
                      (s) => s.project_id === projectId
                    );
                    setDraft({
                      ...draft,
                      projectId,
                      sectionId: firstSection?.id ?? null,
                    });
                  }}
                >
                  <option value="" disabled>
                    Choose a project
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-nyx-400 mb-1 block text-caption font-medium">
                  Section
                </label>
                <Select
                  value={draft.sectionId ?? ''}
                  className="w-full"
                  onChange={(e) =>
                    setDraft({ ...draft, sectionId: e.target.value })
                  }
                  disabled={!draft.projectId}
                >
                  <option value="" disabled>
                    {draft.projectId
                      ? 'Choose a section'
                      : 'Pick a project first'}
                  </option>
                  {sectionsForProject.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-nyx-400 mb-1 block text-caption font-medium">
                  Priority
                </label>
                <Select
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      priority: e.target.value as Priority,
                    })
                  }
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-nyx-400 mb-1 block text-caption font-medium">
                  Due
                </label>
                <TextInput
                  type="datetime-local"
                  value={toDatetimeLocalValue(draft.dueDate)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      dueDate: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>
            {!sectionsForProject.length && draft.projectId && (
              <p className="text-tartarus-500 text-caption">
                This project has no sections yet — add one first.
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
