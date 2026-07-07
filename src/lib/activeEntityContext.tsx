import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type ActiveEntityType = 'task' | 'project' | 'section' | 'event';

export interface ActiveEntity {
  type: ActiveEntityType;
  id: string;
  name?: string | null;
}

interface ActiveEntityContextValue {
  activeEntity: ActiveEntity | null;
  setActiveEntity: (entity: ActiveEntity | null) => void;
  clearActiveEntity: (entityId?: string) => void;
}

const Ctx = createContext<ActiveEntityContextValue>({
  activeEntity: null,
  setActiveEntity: () => {},
  clearActiveEntity: () => {},
});

export function ActiveEntityProvider({ children }: { children: ReactNode }) {
  const [activeEntity, setActiveEntityState] = useState<ActiveEntity | null>(
    null
  );

  const setActiveEntity = useCallback((entity: ActiveEntity | null) => {
    setActiveEntityState(entity);
  }, []);

  // Só limpa se ninguém mais assumiu o "foco" no meio tempo — evita que um
  // modal fechando apague o objeto que outro modal acabou de abrir.
  const clearActiveEntity = useCallback((entityId?: string) => {
    setActiveEntityState((current) => {
      if (entityId && current?.id !== entityId) return current;
      return null;
    });
  }, []);

  return (
    <Ctx.Provider value={{ activeEntity, setActiveEntity, clearActiveEntity }}>
      {children}
    </Ctx.Provider>
  );
}

export function useActiveEntity() {
  return useContext(Ctx);
}

// Helper para páginas/modais de detalhe: registra a entidade enquanto o
// componente está montado, desanexa ao desmontar.
export function useSyncActiveEntity(
  type: ActiveEntityType,
  id: string | null | undefined,
  name?: string | null
) {
  const { setActiveEntity, clearActiveEntity } = useActiveEntity();
  useEffect(() => {
    if (!id) return;
    setActiveEntity({ type, id, name });
    return () => clearActiveEntity(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, name]);
}
