import { createContext, useContext, useState, type ReactNode } from 'react';

// Tracks only whether the session's proactive opener produced something
// worth flagging on the mobile collapsed-chat badge (see AppShell) — the
// message content itself still lives in useChatAgent's own history/state.
interface ChatActivityContextValue {
  hasUnseenOpener: boolean;
  markOpenerUnseen: () => void;
  markOpenerSeen: () => void;
}

const Ctx = createContext<ChatActivityContextValue>({
  hasUnseenOpener: false,
  markOpenerUnseen: () => {},
  markOpenerSeen: () => {},
});

export function ChatActivityProvider({ children }: { children: ReactNode }) {
  const [hasUnseenOpener, setHasUnseenOpener] = useState(false);

  return (
    <Ctx.Provider
      value={{
        hasUnseenOpener,
        markOpenerUnseen: () => setHasUnseenOpener(true),
        markOpenerSeen: () => setHasUnseenOpener(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useChatActivity() {
  return useContext(Ctx);
}
