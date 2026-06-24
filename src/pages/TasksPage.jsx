import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { List, Columns3, BarChart3 } from 'lucide-react';
import clsx from 'clsx';
import { useTasks, useProjects, useSections } from '../hooks/useHierarchy';
import { useTags, useTagLinks } from '../hooks/useTags';
import { STATUSES, PRIORITIES, OPEN_STATUSES } from '../lib/constants';
import { Select, TextInput } from '../components/common/ui';
import TaskList from '../components/tasks/TaskList';
import KanbanBoard from '../components/tasks/KanbanBoard';
import PriorityBoard from '../components/tasks/PriorityBoard';
import TaskDetailModal from '../components/tasks/TaskDetailModal';

const VIEWS = [
  { id: 'list', label: 'List', icon: List },
  { id: 'kanban', label: 'Board', icon: Columns3 },
  { id: 'priority', label: 'Priority', icon: BarChart3 },
];

export default function TasksPage() {
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: sections = [] } = useSections();
  const { data: tags = [] } = useTags();
  const { data: tagLinks = [] } = useTagLinks();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState('list');
  const [statusFilter, setStatusFilter] = useState('open');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [search, setSearch] = useState('');

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const sectionsById = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections]
  );

  const taggedTaskIds = useMemo(() => {
    if (tagFilter === 'all') return null;
    return new Set(
      tagLinks
        .filter(
          (l) => l.entity_type === 'task' && l.work_tag_id === Number(tagFilter)
        )
        .map((l) => l.entity_id)
    );
  }, [tagLinks, tagFilter]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter === 'open' && !OPEN_STATUSES.includes(t.status))
        return false;
      if (
        statusFilter !== 'open' &&
        statusFilter !== 'all' &&
        t.status !== statusFilter
      )
        return false;
      if (
        priorityFilter !== 'all' &&
        (t.priority || 'medium') !== priorityFilter
      )
        return false;
      if (projectFilter !== 'all') {
        const section = sectionsById.get(t.section_id);
        if (!section || section.project_id !== Number(projectFilter))
          return false;
      }
      if (taggedTaskIds && !taggedTaskIds.has(t.id)) return false;
      if (
        search.trim() &&
        !t.name.toLowerCase().includes(search.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    tasks,
    statusFilter,
    priorityFilter,
    projectFilter,
    taggedTaskIds,
    search,
    sectionsById,
  ]);

  const openTaskId = searchParams.get('taskId');
  const openTask = openTaskId
    ? tasks.find((t) => t.id === Number(openTaskId))
    : null;

  function openTask_(task) {
    setSearchParams({ taskId: String(task.id) });
  }
  function closeTask() {
    searchParams.delete('taskId');
    setSearchParams(searchParams);
  }

  return (
    <div className="px-6 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-ink-100 text-2xl">All tasks</h1>
        <div className="border-ink-700 flex items-center gap-1 rounded-lg border p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={clsx(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                view === v.id
                  ? 'bg-ink-700 text-ink-100'
                  : 'text-ink-500 hover:text-ink-200'
              )}
            >
              <v.icon size={13} /> {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="max-w-[14rem]"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="open">Open (not done/cancelled/archived)</option>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        {Boolean(tags.length) && (
          <Select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="all">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        )}
        <span className="text-ink-600 ml-auto text-xs">
          {filtered.length} tasks
        </span>
      </div>

      {view === 'list' && (
        <TaskList
          tasks={filtered}
          projectsById={projectsById}
          sectionsById={sectionsById}
          onOpenTask={openTask_}
        />
      )}
      {view === 'kanban' && (
        <KanbanBoard tasks={filtered} onOpenTask={openTask_} />
      )}
      {view === 'priority' && (
        <PriorityBoard tasks={filtered} onOpenTask={openTask_} />
      )}

      {openTask && (
        <TaskDetailModal
          taskId={openTask.id}
          task={openTask}
          onClose={closeTask}
        />
      )}
    </div>
  );
}
