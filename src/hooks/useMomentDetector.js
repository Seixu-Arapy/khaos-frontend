import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { useProcessingContext } from '../lib/processingContext'; // IMPORTADO DO SEU CONTEXTO

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
  const qc = useQueryClient();
  const { isAssistantProcessing } = useProcessingContext();

  const isLlmChangingRef = useRef(false);
  useEffect(() => {
    isLlmChangingRef.current = isAssistantProcessing;
  }, [isAssistantProcessing]);

  useEffect(() => {
    const channels = Object.keys(WATCHED_FIELDS).map((table) => {
      return supabase
        .channel(`moment-detector-${table}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table },
          (payload) => {
            const { old: oldRow, new: newRow } = payload;

            if (isLlmChangingRef.current) {
              qc.invalidateQueries({
                queryKey: [table === 'tasks' ? 'tasks' : table],
              });
              return;
            }

            const prompt = buildPrompt(table, oldRow, newRow);
            if (prompt) {
              window.dispatchEvent(
                new CustomEvent('external-moment-detected', { detail: prompt })
              );
            }

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
  }, [qc]);

  return { current: null, dismiss: () => {}, pendingCount: 0 };
}
