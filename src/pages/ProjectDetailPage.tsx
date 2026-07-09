import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, ExternalLink, FolderKanban } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  useProjects,
  useSections,
  useTasks,
  useSectionsSequence,
  useOrderedSectionIds,
  useProjectMutations,
  useSectionMutations,
} from '../hooks/useHierarchy';
import { STATUSES, PRIORITIES } from '../lib/constants';
import { parseRange } from '../lib/range';
import { Select, TextInput, EmptyState } from '../components/common/ui';
import SectionColumn, {
  SortableSectionWrapper,
} from '../components/projects/SectionColumn';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import TargetEditor from '../components/common/TargetEditor';
import { useSyncActiveEntity } from '../lib/activeEntityContext';
import type { Id, Priority, Section, Status, Task } from '../lib/types';

// Ordem cronológica dentro de uma seção: target.start primeiro, senão due,
// senão vai para o final (precisa "se encaixar" — mesmo critério do Gantt).
function taskChronoKey(task: Task): number {
  const { start } = parseRange(task.target);
  if (start) return start.getTime();
  if (task.due) return new Date(task.due).getTime();
  return Infinity;
}

interface SectionBlockProps {
  sectionId: Id;
  section: Section;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}

function SectionBlock({
  sectionId,
  section,
  tasks,
  onOpenTask,
  dragHandleProps,
}: SectionBlockProps) {
  const orderedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.section_id === sectionId)
      .sort((a, b) => taskChronoKey(a) - taskChronoKey(b));
  }, [tasks, sectionId]);

  return (
    <SectionColumn
      section={section}
      orderedTasks={orderedTasks}
      onOpenTask={onOpenTask}
      dragHandleProps={dragHandleProps}
    />
  );
}

export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: projects = [] } = useProjects();
  const { data: sections = [] } = useSections();
  const { data: tasks = [] } = useTasks();
  const { data: sectionEdges = [] } = useSectionsSequence();
  const { update: updateProject, remove: removeProject } =
    useProjectMutations();
  const { create: createSection, reorder: reorderSections } =
    useSectionMutations();

  const [newSectionName, setNewSectionName] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const project = projects.find((p) => p.id === projectId);
  useSyncActiveEntity('project', project?.id, project?.name);
  const orderedSectionIds = useOrderedSectionIds(
    projectId ?? '',
    sections,
    sectionEdges
  );
  const sectionsById = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections]
  );

  const openTaskId = searchParams.get('taskId');
  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) : null;

  if (!projectId || !project) {
    return (
      <div className="px-6 py-5">
        <EmptyState
          icon={FolderKanban}
          title="Project not found"
          hint="It may have been deleted."
        />
      </div>
    );
  }

  function handleSectionDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedSectionIds.indexOf(active.id as Id);
    const newIndex = orderedSectionIds.indexOf(over.id as Id);
    reorderSections.mutate({
      orderedIds: arrayMove(orderedSectionIds, oldIndex, newIndex),
    });
  }

  function addSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    createSection.mutate({
      project_id: projectId,
      name: newSectionName.trim(),
      status: 'planning',
    });
    setNewSectionName('');
  }

  function openTask_(task: Task) {
    setSearchParams({ taskId: String(task.id) });
  }
  function closeTask() {
    searchParams.delete('taskId');
    setSearchParams(searchParams);
  }

  return (
    <div className="px-6 py-5">
      <div className="mb-5">
        <input
          value={project.name}
          onChange={(e) =>
            updateProject.mutate({
              id: projectId,
              patch: { name: e.target.value },
            })
          }
          className="font-display text-ink-100 w-full bg-transparent text-2xl focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select
            value={project.status}
            onChange={(e) =>
              updateProject.mutate({
                id: projectId,
                patch: { status: e.target.value as Status },
              })
            }
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
          <Select
            value={project.priority || 'medium'}
            onChange={(e) =>
              updateProject.mutate({
                id: projectId,
                patch: { priority: e.target.value as Priority },
              })
            }
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <TextInput
            type="date"
            value={project.due ? project.due.slice(0, 10) : ''}
            onChange={(e) =>
              updateProject.mutate({
                id: projectId,
                patch: {
                  due: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                },
              })
            }
            className="w-auto"
          />
          {project.doc_reference && (
            <a
              href={project.doc_reference}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-teal-400 hover:underline"
            >
              <ExternalLink size={12} /> Docs
            </a>
          )}
          <button
            onClick={() =>
              removeProject.mutate(projectId, {
                onSuccess: () => navigate('/tasks'),
              })
            }
            className="text-ink-500 hover:text-ink-300 ml-auto flex items-center gap-1 text-xs"
          >
            <Trash2 size={13} /> Delete project
          </button>
        </div>

        <div className="mt-2 max-w-sm">
          <label className="text-ink-500 mb-1 block text-xs font-medium">
            Target{' '}
            <span className="text-ink-600 font-normal normal-case">
              (planned window — optional, must land before due)
            </span>
          </label>
          <TargetEditor
            value={project.target as string | null}
            due={project.due}
            onChange={(v) =>
              updateProject.mutate({ id: projectId, patch: { target: v } })
            }
          />
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleSectionDragEnd}>
        <SortableContext
          items={orderedSectionIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {orderedSectionIds.map((sectionId) => {
              const section = sectionsById.get(sectionId);
              if (!section) return null;
              return (
                <SortableSectionWrapper key={sectionId} id={sectionId}>
                  {(dragHandleProps) => (
                    <SectionBlock
                      sectionId={sectionId}
                      section={section}
                      tasks={tasks}
                      onOpenTask={openTask_}
                      dragHandleProps={dragHandleProps}
                    />
                  )}
                </SortableSectionWrapper>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {!orderedSectionIds.length && (
        <EmptyState
          icon={FolderKanban}
          title="No sections yet"
          hint="Add a section below to start adding tasks."
        />
      )}

      <form
        onSubmit={addSection}
        className="border-ink-700 mt-3 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5"
      >
        <Plus size={14} className="text-ink-600" />
        <input
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          placeholder="Add a section…"
          className="text-ink-300 placeholder:text-ink-600 flex-1 bg-transparent text-sm focus:outline-none"
        />
      </form>

      {openTask && (
        <TaskDetailModal
          key={openTask.id}
          taskId={openTask.id}
          task={openTask}
          onClose={closeTask}
          onOpenTask={openTask_}
        />
      )}
    </div>
  );
}
