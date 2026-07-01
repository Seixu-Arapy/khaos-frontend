import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

// Columns whose changes we surface to the user for optional annotation.
// The trigger already auto-inserts the raw moment; this is about letting the
// user add context ("why did this change?") or record a target / definition.
const WATCHED_FIELDS = {
  tasks: ['status', 'due', 'estimate', 'priority'],
  projects: ['status', 'due', 'priority'],
  sections: ['status', 'due'],
};

const FIELD_LABEL = {
  status: 'status',
  due: 'due date',
  estimate: 'estimate',
  priority: 'priority',
};

// moments/work_tag_entities link back to an entity via a direct FK column
// rather than a polymorphic (entity_type, entity_id) pair.
const ENTITY_FK_COLUMN = {
  tasks: 'task_id',
  projects: 'project_id',
  sections: 'section_id',
};

function buildPrompt(table, oldRow, newRow) {
  const watched = WATCHED_FIELDS[table] || [];
  const changes = watched.filter((col) => oldRow[col] !== newRow[col]);
  if (!changes.length) return null;

  const fkColumn = ENTITY_FK_COLUMN[table];

  return {
    id: `${table}-${newRow.id}-${Date.now()}`,
    entityRef: { [fkColumn]: newRow.id },
    entityName: newRow.name,
    changes: changes.map((col) => ({
      field: col,
      label: FIELD_LABEL[col] || col,
      from: oldRow[col],
      to: newRow[col],
    })),
  };
}

export function useMomentDetector() {
  const [queue, setQueue] = useState([]); // pending prompts
  const [current, setCurrent] = useState(null);
  const qc = useQueryClient();
  const prevRows = useRef({}); // table:id → last known row

  // When a new prompt lands, surface it if nothing is showing
  useEffect(() => {
    if (!current && queue.length) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [queue, current]);

  const dismiss = useCallback(() => setCurrent(null), []);

  const enqueue = useCallback((prompt) => {
    setQueue((q) => [...q, prompt]);
  }, []);

  useEffect(() => {
    const channels = Object.keys(WATCHED_FIELDS).map((table) => {
      return supabase
        .channel(`moment-detector-${table}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table },
          (payload) => {
            const { old: oldRow, new: newRow } = payload;
            const prompt = buildPrompt(table, oldRow, newRow);
            if (prompt) enqueue(prompt); // Safe to call here

            qc.invalidateQueries({
              queryKey: [table === 'tasks' ? 'tasks' : table],
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table },
          () => {
            qc.invalidateQueries({
              queryKey: [table === 'tasks' ? 'tasks' : table],
            });
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [enqueue, qc]);

  return { current, dismiss, pendingCount: queue.length };
}
