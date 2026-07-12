import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { momentsApi, type EntityRef } from './api/moments';
import type { MomentAuthor } from './types';

export type MomentPromptStatus = 'pending' | 'saving' | 'saved' | 'error';

export interface MomentPromptChange {
  field: string;
  label: string;
  from: unknown;
  to: unknown;
}

export interface MomentPromptItem {
  id: string;
  entityRef: EntityRef;
  entityName?: string;
  changes: MomentPromptChange[];
  status: MomentPromptStatus;
  savedNote?: string;
  authoredBy?: MomentAuthor;
}

export type NewMomentPrompt = Pick<
  MomentPromptItem,
  'id' | 'entityRef' | 'entityName' | 'changes'
>;

export const SKIPPED_NOTE_TEXT = 'User skipped adding note.';

interface MomentPromptsContextValue {
  prompts: MomentPromptItem[];
  pendingCount: number;
  addPrompt: (prompt: NewMomentPrompt) => void;
  saveNote: (id: string, note: string) => Promise<void>;
  skipNote: (id: string) => Promise<void>;
}

const Ctx = createContext<MomentPromptsContextValue>({
  prompts: [],
  pendingCount: 0,
  addPrompt: () => {},
  saveNote: async () => {},
  skipNote: async () => {},
});

function invalidateForEntity(qc: QueryClient, entityRef: EntityRef) {
  const [column, value] = Object.entries(entityRef)[0] ?? [];
  if (column) qc.invalidateQueries({ queryKey: ['moments', column, value] });
}

export function MomentPromptsProvider({ children }: { children: ReactNode }) {
  const [prompts, setPrompts] = useState<MomentPromptItem[]>([]);
  const qc = useQueryClient();

  // Mirrored in a ref so the callbacks below stay referentially stable
  // (useMomentDetector depends on addPrompt to avoid resubscribing its
  // realtime channels on every render).
  const promptsRef = useRef(prompts);
  useEffect(() => {
    promptsRef.current = prompts;
  }, [prompts]);

  const addPrompt = useCallback((prompt: NewMomentPrompt) => {
    setPrompts((prev) => [...prev, { ...prompt, status: 'pending' }]);
  }, []);

  const resolvePrompt = useCallback(
    async (id: string, note: string, authoredBy: MomentAuthor) => {
      const target = promptsRef.current.find((p) => p.id === id);
      if (!target) return;

      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'saving' } : p))
      );

      try {
        await momentsApi.attachNoteToLatestChange(
          target.entityRef,
          note,
          authoredBy
        );
        setPrompts((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, status: 'saved', savedNote: note, authoredBy }
              : p
          )
        );
        invalidateForEntity(qc, target.entityRef);
      } catch {
        setPrompts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'error' } : p))
        );
      }
    },
    [qc]
  );

  const saveNote = useCallback(
    (id: string, note: string) => resolvePrompt(id, note, 'user'),
    [resolvePrompt]
  );
  const skipNote = useCallback(
    (id: string) => resolvePrompt(id, SKIPPED_NOTE_TEXT, 'system'),
    [resolvePrompt]
  );

  const pendingCount = prompts.filter((p) => p.status !== 'saved').length;

  return (
    <Ctx.Provider
      value={{ prompts, pendingCount, addPrompt, saveNote, skipNote }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useMomentPrompts() {
  return useContext(Ctx);
}
