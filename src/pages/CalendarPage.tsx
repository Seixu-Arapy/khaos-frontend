import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useEvents } from '../hooks/useEvents';
import { useTasks, useProjects, useFields } from '../hooks/useHierarchy';
import { Button } from '../components/common/ui';
import CalendarView from '../components/calendar/CalendarView';
import EventModal from '../components/calendar/EventModal';
import type { Event, Task, Project, Field } from '../lib/types';

export default function CalendarPage() {
  const { data: events = [] } = useEvents() as { data: Event[] };
  const { data: tasks = [] } = useTasks() as { data: Task[] };
  const { data: projects = [] } = useProjects() as { data: Project[] };
  const { data: fields = [] } = useFields() as { data: Field[] };
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [creatingAt, setCreatingAt] = useState<Date | null>(null);

  return (
    <div className="flex h-full flex-col px-6 py-5">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-ink-100 text-2xl">Calendar</h1>
        <Button onClick={() => setCreatingAt(new Date())}>
          <Plus size={14} /> New event
        </Button>
      </div>

      <CalendarView
        events={events}
        tasks={tasks}
        projects={projects}
        fields={fields}
        onSlotClick={setCreatingAt}
        onEventClick={setEditingEvent}
      />

      {creatingAt && (
        <EventModal
          defaultStart={creatingAt}
          onClose={() => setCreatingAt(null)}
        />
      )}
      {editingEvent && (
        <EventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}
