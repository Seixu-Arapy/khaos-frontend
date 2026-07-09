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
