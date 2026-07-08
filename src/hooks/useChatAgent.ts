import { useCallback, useEffect, useState } from 'react';
import { runTurn, type ChatMessage as AgentMessage } from '../lib/gemini/agent';
import {
  buildConfirmationPreview,
  type ConfirmationPreview,
} from '../lib/gemini/confirmationPreview';
import { useProcessingContext } from '../lib/processingContext';
import { useActiveEntity } from '../lib/activeEntityContext';
import { getTimezone } from '../lib/timezone';

const STORAGE_KEY = 'logbook.chatHistory.v1';

// UI-facing shape — this is what ChatPanel and the rest of the app render.
// Kept separate from AgentMessage (system/tool/tool_calls) on purpose.
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

function loadHistory(): AgentMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userTimeZone = getTimezone();

      const userLocalDateTime = new Date().toLocaleString('en-US', {
        timeZone: userTimeZone,
        dateStyle: 'long',
        timeStyle: 'short',
      });
      const userIsoString = new Date().toISOString();

      let contextNote = `[Temporal Context: The user's current local time is ${userLocalDateTime} (Timezone: ${userTimeZone}). The current global UTC time is ${userIsoString}. Use this local time to resolve relative dates like 'today', 'tomorrow', or 'next Monday', but remember that database operations expect standardized times.]\n`;

      if (activeEntity) {
        contextNote += `[UI Context: the person currently has this open on screen — ${activeEntity.type} "${activeEntity.name}" (id: ${activeEntity.id}). If their message refers to "this"/"it" without naming something else, assume it's this.]\n`;
      }

      contextNote += '\n';

      const userMessageText = contextNote + trimmed;

      setIsSending(true);
      setAssistantProcessing(true);

      try {
        const { updatedHistory } = await runTurn(messages, userMessageText, {
          onPendingWrite: requestConfirmation,
        });
        setMessages(updatedHistory);
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: `Something went wrong: ${(err as Error).message}`,
            isError: true,
          },
        ]);
      } finally {
        setIsSending(false);
        setAssistantProcessing(false);
      }
    },
    [messages, requestConfirmation, activeEntity, setAssistantProcessing]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Only user turns and the assistant's final text reply are shown.
  // Intermediate assistant messages that only carry tool_calls (content is
  // null) and every 'tool' role response are internal plumbing, not chat.
  const uiMessages: ChatMessage[] = messages
    .filter(
      (m) => (m.role === 'user' || m.role === 'assistant') && Boolean(m.content)
    )
    .map((m, index) => {
      let textToShow = m.content || '';

      if (m.role === 'user') {
        textToShow = textToShow.replace(
          /^\[Temporal Context:[\s\S]*?\]\s*/g,
          ''
        );
        textToShow = textToShow.replace(/^\[UI Context:[\s\S]*?\]\s*/g, '');
        textToShow = textToShow.replace(/^\[Context:[\s\S]*?\]\s*/g, '');
      }

      return {
        id: `${m.role}-${index}`,
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        text: textToShow,
        isError: m.isError,
      };
    });

  return {
    messages: uiMessages,
    sendMessage,
    isSending,
    pending,
    resolvePending,
    clearHistory,
  };
}
