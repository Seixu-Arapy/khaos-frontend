import { useCallback, useEffect, useState } from 'react';
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
import { getTimezone } from '../lib/timezone';

const STORAGE_KEY = 'logbook.chatHistory.v1';

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
    async (inputText: string) => {
      if (!inputText.trim() || isSending) return;

      setIsSending(true);
      setAssistantProcessing(true);

      const activeCtx = activeEntity
        ? `[UI Context: user is currently looking at ${activeEntity.type} ${activeEntity.id}]\n`
        : '';
      const timeCtx = `[Temporal Context: current_time is ${new Date().toISOString()}, timezone is ${getTimezone()}]\n`;
      const fullUserContent = `${timeCtx}${activeCtx}${inputText}`;

      const newUserAgentMessage: AgentMessage = {
        role: 'user',
        content: fullUserContent,
      };

      setMessages((prev) => [...prev, newUserAgentMessage]);

      try {
        const { updatedHistory } = await runTurn(
          [...messages, newUserAgentMessage],
          {
            onPendingWrite: (name, args) => requestConfirmation(name, args),
          }
        );

        setMessages(updatedHistory);
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
      } finally {
        setIsSending(false);
        setAssistantProcessing(false);
      }
    },
    [
      messages,
      requestConfirmation,
      activeEntity,
      setAssistantProcessing,
      isSending,
    ]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const uiMessages: ChatMessage[] = messages
    .map((m, index) => ({ m, index }))
    .filter(({ m }) => m.role === 'user' || m.role === 'assistant')
    .map(({ m, index }) => ({
      id: `${m.role}-${index}`,
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      // extractText reads only text blocks — a user turn that's actually a
      // tool_result continuation, or an assistant turn that's purely a
      // tool_use with no accompanying text, both collapse to '' here and
      // get filtered out below, same as a falsy `content` did before.
      text: extractText(m.content),
      isError: m.isError,
    }))
    .filter(({ text }) => Boolean(text))
    .map(({ id, role, text, isError }) => {
      let textToShow = text;
      if (role === 'user') {
        textToShow = textToShow.replace(
          /^\[Temporal Context:[\s\S]*?\]\s*/g,
          ''
        );
        textToShow = textToShow.replace(/^\[UI Context:[\s\S]*?\]\s*/g, '');
        textToShow = textToShow.replace(/^\[Context:[\s\S]*?\]\s*/g, '');
      }
      return { id, role, text: textToShow, isError };
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
