import { useMemo, useState } from 'react';
import { Plus, FolderKanban } from 'lucide-react';
import {
  useFields,
  useProjects,
  useSections,
  useTasks,
  useFieldMutations,
  useProjectMutations,
} from '../hooks/useHierarchy';
import {
  EmptyState,
  TextInput,
  Button,
  Modal,
  Select,
} from '../components/common/ui';
import ProjectCard from '../components/projects/ProjectCard';
import type { Id } from '../lib/types';

interface ProjectDraft {
  name: string;
  fieldId: string;
}

interface ProjectStats {
  sectionCount: number;
  taskCount: number;
  doneCount: number;
}

export default function ProjectsPage() {
  const { data: fields = [] } = useFields();
  const { data: projects = [] } = useProjects();
  const { data: sections = [] } = useSections();
  const { data: tasks = [] } = useTasks();
  const { create: createField } = useFieldMutations();
  const { create: createProject } = useProjectMutations();

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [draft, setDraft] = useState<ProjectDraft>({ name: '', fieldId: '' });

  const stats = useMemo(() => {
    const map = new Map<Id, ProjectStats>();
    for (const project of projects) {
      const projectSections = sections.filter(
        (s) => s.project_id === project.id
      );
      const projectTasks = tasks.filter((t) =>
        projectSections.some((s) => s.id === t.section_id)
      );
      map.set(project.id, {
        sectionCount: projectSections.length,
        taskCount: projectTasks.length,
        doneCount: projectTasks.filter((t) => t.status === 'done').length,
      });
    }
    return map;
  }, [projects, sections, tasks]);

  function submitProject(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    createProject.mutate(
      {
        name: draft.name.trim(),
        field_id: draft.fieldId || null,
        status: 'planning',
      },
      { onSuccess: () => setNewProjectOpen(false) }
    );
    setDraft({ name: '', fieldId: '' });
  }

  function addField() {
    const name = window.prompt(
      'New field name (a life area, e.g. "Work" or "Health")'
    );
    if (name?.trim())
      createField.mutate({ name: name.trim(), order: fields.length });
  }

  const unassigned = projects.filter((p) => !p.field_id);

  return (
    <div className="px-6 py-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-nyx-100 text-display-lg">Projects</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={addField}>
            New field
          </Button>
          <Button onClick={() => setNewProjectOpen(true)}>
            <Plus size={14} /> New project
          </Button>
        </div>
      </div>

      {!projects.length && (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          hint='Click "New project" to create your first one.'
        />
      )}

      <div className="space-y-7">
        {fields.map((field) => {
          const fieldProjects = projects.filter((p) => p.field_id === field.id);
          if (!fieldProjects.length) return null;
          return (
            <div key={field.id}>
              <h2 className="text-nyx-500 mb-2 text-caption font-semibold tracking-wide uppercase">
                {field.name}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fieldProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    fieldName={field.name}
                    {...stats.get(p.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {Boolean(unassigned.length) && (
          <div>
            <h2 className="text-nyx-500 mb-2 text-caption font-semibold tracking-wide uppercase">
              Unsorted
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unassigned.map((p) => (
                <ProjectCard key={p.id} project={p} {...stats.get(p.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        title="New project"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitProject}>Create</Button>
          </>
        }
      >
        <form onSubmit={submitProject} className="space-y-3">
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
          <div>
            <label className="text-nyx-400 mb-1 block text-caption font-medium">
              Field (optional)
            </label>
            <Select
              value={draft.fieldId}
              onChange={(e) => setDraft({ ...draft, fieldId: e.target.value })}
              className="w-full"
            >
              <option value="">No field</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
