import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

interface ProcessingContextValue {
  isAssistantProcessing: boolean;
  setAssistantProcessing: (value: boolean) => void;
}

const Ctx = createContext<ProcessingContextValue>({
  isAssistantProcessing: false,
  setAssistantProcessing: () => {},
});

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [isAssistantProcessing, setAssistantProcessing] = useState(false);
  const set = useCallback((v: boolean) => setAssistantProcessing(v), []);
  return (
    <Ctx.Provider
      value={{ isAssistantProcessing, setAssistantProcessing: set }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useProcessingContext() {
  return useContext(Ctx);
}
