import { useCallback, useEffect, useRef, useState } from 'react';
import {
  runTurn,
  extractText,
  type ChatMessage as AgentMessage,
} from '../lib/chat/agent';
import {
  buildConfirmationPreview,
  type ConfirmationPreview,
} from '../lib/chat/confirmationPreview';
import { useProcessingContext } from '../lib/processingContext';
import { useActiveEntity } from '../lib/activeEntityContext';
import { useChatActivity } from '../lib/chat/chatActivityContext';
import { getTimezone } from '../lib/timezone';

const STORAGE_KEY = 'logbook.chatHistory.v1';
// Separate from STORAGE_KEY so a per-tab race between the always-mounted
// desktop panel and a freshly-opened mobile sheet can't both fire the
// opener — whichever instance claims this key first is the one that runs.
const BOOTSTRAPPED_KEY = 'logbook.chatBootstrapped.v1';
const BOOTSTRAP_INSTRUCTION =
  '[Session Bootstrap: This is the first turn of a new session — nobody has typed anything yet. Follow your OPENING TURN rules: a brief greeting is fine, but do not offer to help or ask an open-ended question — check current state for something worth surfacing before saying anything else.]';

// UI-facing shape — this is what ChatPanel and the rest of the app render.
// Kept separate from AgentMessage, whose content is Anthropic's own
// text/tool_use/tool_result content-block union, not plain display text.
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface PendingWrite {
  name: string;
  args: Record<string, unknown>;
  preview: ConfirmationPreview;
  resolve: (approved: boolean) => void;
}

// A stored message is only usable if `content` survived the JSON
// round-trip — a message ever persisted with `content: undefined` (e.g. an
// API response that came back malformed) loses that key entirely under
// JSON.stringify, and re-parsing it back would otherwise crash the very
// first render (extractText assumes a string or an array).
function isWellFormedMessage(m: unknown): m is AgentMessage {
  if (!m || typeof m !== 'object') return false;
  const content = (m as { content?: unknown }).content;
  return typeof content === 'string' || Array.isArray(content);
}

function loadHistory(): AgentMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWellFormedMessage);
  } catch {
    return [];
  }
}

export function useChatAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>(loadHistory);
  const [pending, setPending] = useState<PendingWrite | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { setAssistantProcessing } = useProcessingContext();
  const { activeEntity } = useActiveEntity();
  const { markOpenerUnseen } = useChatActivity();
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    } catch {
      // storage full or unavailable
    }
  }, [messages]);

  const requestConfirmation = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      const preview = await buildConfirmationPreview(name, args);
      return new Promise<boolean>((resolve) =>
        setPending({ name, args, preview, resolve })
      );
    },
    []
  );

  const resolvePending = useCallback(
    (approved: boolean) => {
      pending?.resolve(approved);
      setPending(null);
    },
    [pending]
  );

  // Shared by sendMessage and the session-opening bootstrap turn below —
  // both are "push a user-role message, run the agent loop, record the
  // result," differing only in what that message contains and whether a
  // real person is waiting on it.
  const runWithUserContent = useCallback(
    async (content: string, { silent }: { silent?: boolean } = {}) => {
      setIsSending(true);
      if (!silent) setAssistantProcessing(true);

      const newUserAgentMessage: AgentMessage = { role: 'user', content };
      setMessages((prev) => [...prev, newUserAgentMessage]);

      try {
        const { updatedHistory } = await runTurn(
          [...messagesRef.current, newUserAgentMessage],
          {
            onPendingWrite: (name, args) => requestConfirmation(name, args),
          }
        );
        setMessages(updatedHistory);
        return updatedHistory;
      } catch (err) {
        console.error(err);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Something went wrong: ${(err as Error).message}`,
            isError: true,
          },
        ]);
        return null;
      } finally {
        setIsSending(false);
        if (!silent) setAssistantProcessing(false);
      }
    },
    [requestConfirmation, setAssistantProcessing]
  );

  const sendMessage = useCallback(
    async (inputText: string) => {
      if (!inputText.trim() || isSending) return;

      const activeCtx = activeEntity
        ? `[UI Context: user is currently looking at ${activeEntity.type} ${activeEntity.id}]\n`
        : '';
      const timeCtx = `[Temporal Context: current_time is ${new Date().toISOString()}, timezone is ${getTimezone()}]\n`;
      await runWithUserContent(`${timeCtx}${activeCtx}${inputText}`);
    },
    [activeEntity, isSending, runWithUserContent]
  );

  // Guarded by BOOTSTRAPPED_KEY, not just a ref, since the desktop chat
  // panel is always mounted — even hidden on mobile — and could otherwise
  // race a freshly-opened mobile sheet into firing twice.
  const fireBootstrapTurn = useCallback(() => {
    if (localStorage.getItem(BOOTSTRAPPED_KEY)) return;
    localStorage.setItem(BOOTSTRAPPED_KEY, '1');

    const timeCtx = `[Temporal Context: current_time is ${new Date().toISOString()}, timezone is ${getTimezone()}]\n`;
    runWithUserContent(`${timeCtx}${BOOTSTRAP_INSTRUCTION}`, {
      silent: true,
    }).then((updatedHistory) => {
      const last = updatedHistory?.[updatedHistory.length - 1];
      if (last?.role === 'assistant' && extractText(last.content)) {
        markOpenerUnseen();
      }
    });
  }, [runWithUserContent, markOpenerUnseen]);

  // Skips entirely if there's already history: a session here means "since
  // the history was last empty," not "since this component mounted."
  useEffect(() => {
    if (messagesRef.current.length > 0) return;
    fireBootstrapTurn();
    // Runs once on mount, using messagesRef to read the initial history
    // rather than reacting to it — see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BOOTSTRAPPED_KEY);
    // A cleared history is a new session — open it right away rather than
    // waiting for a future mount that may never come (the panel doesn't
    // unmount just because history was cleared).
    fireBootstrapTurn();
  }, [fireBootstrapTurn]);

  const uiMessages: ChatMessage[] = messages
    .map((m, index) => ({ m, index }))
    .filter(({ m }) => m.role === 'user' || m.role === 'assistant')
    .map(({ m, index }) => {
      const role = m.role === 'assistant' ? ('model' as const) : ('user' as const);
      // extractText reads only text blocks — a user turn that's actually a
      // tool_result continuation, or an assistant turn that's purely a
      // tool_use with no accompanying text, both collapse to ''. Stripping
      // has to happen before the emptiness check below, not after — a
      // hidden turn like the bootstrap instruction is nothing *but* a
      // context prefix, so checking emptiness first would let it through
      // as a blank bubble instead of dropping it.
      let text = extractText(m.content);
      if (role === 'user') {
        text = text.replace(/^\[Temporal Context:[\s\S]*?\]\s*/g, '');
        text = text.replace(/^\[UI Context:[\s\S]*?\]\s*/g, '');
        text = text.replace(/^\[Session Bootstrap:[\s\S]*?\]\s*/g, '');
        text = text.replace(/^\[Context:[\s\S]*?\]\s*/g, '');
      }
      return { id: `${m.role}-${index}`, role, text, isError: m.isError };
    })
    .filter(({ text }) => Boolean(text));

  return {
    messages: uiMessages,
    sendMessage,
    isSending,
    pending,
    resolvePending,
    clearHistory,
  };
}
