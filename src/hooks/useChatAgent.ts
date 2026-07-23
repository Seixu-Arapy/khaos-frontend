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

const BOOTSTRAP_INSTRUCTION =
  '[Session Bootstrap: This is the first turn of a new session — nobody has typed anything yet. Follow your OPENING TURN rules: a brief greeting is fine, but do not offer to help or ask an open-ended question — check current state for something worth surfacing before saying anything else, including anything recall_oversight_notes turns up.]';

// A session is one page load, full stop — history isn't persisted across
// reloads, and this flag lives in module scope (not localStorage) for the
// same reason: it needs to reset every time the JS itself reloads, not
// survive it. It still does real work within a single load, though —
// preventing the always-mounted desktop panel and a freshly-opened mobile
// sheet from both firing the opener.
let bootstrapClaimedThisLoad = false;

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

// No loadHistory()/isWellFormedMessage() sanitization here — main added that
// to harden localStorage-persisted history against malformed `content`
// surviving a JSON round-trip, but this branch removes that persistence
// entirely (a session is one page load; messages always start empty), so
// there's nothing stored to sanitize. extractText()'s own defensive
// undefined-content handling (src/lib/chat/agent.ts) still applies regardless
// of where a malformed message came from, and is kept.
export function useChatAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [pending, setPending] = useState<PendingWrite | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { setAssistantProcessing } = useProcessingContext();
  const { activeEntity } = useActiveEntity();
  const { markOpenerUnseen } = useChatActivity();
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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

  // Runs once per page load, on mount — see bootstrapClaimedThisLoad above.
  useEffect(() => {
    if (bootstrapClaimedThisLoad) return;
    bootstrapClaimedThisLoad = true;

    const timeCtx = `[Temporal Context: current_time is ${new Date().toISOString()}, timezone is ${getTimezone()}]\n`;
    runWithUserContent(`${timeCtx}${BOOTSTRAP_INSTRUCTION}`, {
      silent: true,
    }).then((updatedHistory) => {
      const last = updatedHistory?.[updatedHistory.length - 1];
      if (last?.role === 'assistant' && extractText(last.content)) {
        markOpenerUnseen();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Just a wipe — reopening the conversation is what a reload is for, not
  // something Clear should do on its own.
  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

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
