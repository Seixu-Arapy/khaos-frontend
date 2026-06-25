import { useState } from 'react';
import { GripVertical, Plus, MoreVertical, Trash2 } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Select } from '../common/ui';
import { STATUS_META } from '../../lib/constants';
import {
  useTaskMutations,
  useSectionMutations,
} from '../../hooks/useHierarchy';
import TaskRow from '../tasks/TaskRow';

function SortableTaskRow({ task, onOpen }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  return (
    <TaskRow
      task={task}
      onOpen={onOpen}
      dragRef={setNodeRef}
      dragStyle={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

export default function SectionColumn({
  section,
  orderedTasks,
  onOpenTask,
  dragHandleProps,
}) {
  const { create: createTask, reorder: reorderTasks } = useTaskMutations();
  const {
    update: updateSection,
    archive: archiveSection,
    remove: removeSection,
  } = useSectionMutations();
  const [newTaskName, setNewTaskName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function handleDragEnd(e) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = orderedTasks.map((t) => t.id);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    reorderTasks.mutate({ orderedIds: arrayMove(ids, oldIndex, newIndex) });
  }

  function addTask(e) {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    createTask.mutate({
      section_id: section.id,
      name: newTaskName.trim(),
      status: 'todo',
    });
    setNewTaskName('');
  }

  return (
    <div className="border-ink-700 bg-ink-800/40 rounded-lg border">
      <div className="border-ink-700 flex items-center gap-2 border-b px-3 py-2.5">
        <span
          {...dragHandleProps}
          className="text-ink-600 hover:text-ink-300 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </span>
        <input
          value={section.name}
          onChange={(e) =>
            updateSection.update.mutate({
              id: section.id,
              patch: { name: e.target.value },
            })
          }
          className="text-ink-100 flex-1 bg-transparent text-sm font-medium focus:outline-none"
        />
        <Select
          value={section.status}
          onChange={(e) =>
            updateSection.update.mutate({
              id: section.id,
              patch: { status: e.target.value },
            })
          }
          className="py-1! text-xs!"
        >
          {Object.keys(STATUS_META).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-ink-500 hover:text-ink-200"
          >
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <div className="border-ink-700 bg-ink-800 shadow-panel absolute right-0 z-10 mt-1 w-44 rounded-md border py-1">
              {section.status === 'archived' ? (
                <button
                  onClick={() => {
                    if (
                      window.confirm(`Permanently delete "${section.name}"?`)
                    ) {
                      removeSection.remove.mutate(section.id);
                    }
                    setMenuOpen(false);
                  }}
                  className="text-rust-500 hover:bg-ink-700 flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs"
                >
                  <Trash2 size={12} /> Delete permanently
                </button>
              ) : (
                <button
                  onClick={() => {
                    archiveSection.mutate(section.id);
                    setMenuOpen(false);
                  }}
                  className="text-ink-400 hover:bg-ink-700 flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs"
                >
                  <Trash2 size={12} /> Archive section
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-2">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={orderedTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0.5">
              {orderedTasks.map((task) => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  onOpen={onOpenTask}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <form
          onSubmit={addTask}
          className="mt-1 flex items-center gap-1.5 px-2 py-1"
        >
          <Plus size={13} className="text-ink-600" />
          <input
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder="Add a task…"
            className="text-ink-300 placeholder:text-ink-600 flex-1 bg-transparent py-0.5 text-sm focus:outline-none"
          />
        </form>
      </div>
    </div>
  );
}

export function SortableSectionWrapper({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}
