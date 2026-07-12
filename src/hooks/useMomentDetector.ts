import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { useProcessingContext } from '../lib/processingContext'; // IMPORTADO DO SEU CONTEXTO
import {
  useMomentPrompts,
  type NewMomentPrompt,
} from '../lib/momentPromptsContext';

type WatchedTable = 'tasks' | 'projects' | 'sections' | 'routines';

const WATCHED_FIELDS: Record<WatchedTable, string[]> = {
  tasks: ['status', 'due', 'estimate', 'priority'],
  projects: ['status', 'due', 'priority'],
  sections: ['status', 'due'],
  // routines have neither status, due, nor priority columns — only
  // estimate is watchable for now.
  routines: ['estimate'],
};

const FIELD_LABEL: Record<string, string> = {
  status: 'status',
  due: 'due date',
  estimate: 'estimate',
  priority: 'priority',
};

const ENTITY_FK_COLUMN: Record<WatchedTable, string> = {
  tasks: 'task_id',
  projects: 'project_id',
  sections: 'section_id',
  routines: 'routine_id',
};

function buildPrompt(
  table: WatchedTable,
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>
): NewMomentPrompt | null {
  const watched = WATCHED_FIELDS[table] || [];
  const changes = watched.filter((col) => oldRow[col] !== newRow[col]);
  if (!changes.length) return null;

  const fkColumn = ENTITY_FK_COLUMN[table];

  return {
    id: `${table}-${newRow.id}-${Date.now()}`,
    entityRef: { [fkColumn]: newRow.id as string },
    entityName: newRow.name as string,
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
  const { addPrompt } = useMomentPrompts();

  const isLlmChangingRef = useRef(false);
  useEffect(() => {
    isLlmChangingRef.current = isAssistantProcessing;
  }, [isAssistantProcessing]);

  useEffect(() => {
    const channels = (Object.keys(WATCHED_FIELDS) as WatchedTable[]).map(
      (table) => {
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
                addPrompt(prompt);
              }

              qc.invalidateQueries({
                queryKey: [table === 'tasks' ? 'tasks' : table],
              });
            }
          )
          .subscribe();
      }
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [qc, addPrompt]);
}
