import { useCallback, useEffect, useRef, useState } from 'react';
import { genAI, GEMINI_MODEL, SYSTEM_INSTRUCTION } from '../lib/gemini/client';
import { functionDeclarations } from '../lib/gemini/tools';
import { runTurn, type GeminiChat } from '../lib/gemini/agent';
import {
  buildConfirmationPreview,
  type ConfirmationPreview,
} from '../lib/gemini/confirmationPreview';
import { useProcessingContext } from '../lib/processingContext';
import { useActiveEntity } from '../lib/activeEntityContext';

const STORAGE_KEY = 'logbook.chatHistory.v1';

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

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useChatAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);
  const [pending, setPending] = useState<PendingWrite | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { setAssistantProcessing } = useProcessingContext();
  const { activeEntity } = useActiveEntity();
  const chatRef = useRef<GeminiChat | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-200)));
    } catch {
      // storage full or unavailable — chat still works, just won't persist
    }
  }, [messages]);

  const getChat = useCallback((): GeminiChat => {
    if (!chatRef.current) {
      chatRef.current = genAI.chats.create({
        model: GEMINI_MODEL,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations }],
        },
        history: messages
          .filter((m) => !m.isError)
          .map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      });
    }
    return chatRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setMessages((m) => [...m, { id: newId(), role: 'user', text: trimmed }]);
      setIsSending(true);
      setAssistantProcessing(true);
      try {
        const chat = getChat();
        // Injected silently — never shown in the bubble — so pronouns like
        // "this" or "it" resolve to whatever entity is open on screen.
        const contextNote = activeEntity
          ? `[Context: the person currently has this open on screen — ${activeEntity.type} "${activeEntity.name}" (id: ${activeEntity.id}). If their message refers to "this"/"it" without naming something else, assume it's this.]\n\n`
          : '';
        const replyText = await runTurn(chat, contextNote + trimmed, {
          onPendingWrite: requestConfirmation,
        });
        setMessages((m) => [
          ...m,
          {
            id: newId(),
            role: 'model',
            text: replyText || '(No response — try rephrasing.)',
          },
        ]);
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            id: newId(),
            role: 'model',
            text: `Something went wrong: ${(err as Error).message}`,
            isError: true,
          },
        ]);
      } finally {
        setIsSending(false);
        setAssistantProcessing(false);
      }
    },
    [getChat, requestConfirmation, activeEntity, setAssistantProcessing]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    chatRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    messages,
    sendMessage,
    isSending,
    pending,
    resolvePending,
    clearHistory,
  };
}
