import {
  client,
  MODEL_NAME,
  SYSTEM_INSTRUCTION,
  TONE_INSTRUCTION,
} from './client';
import { executeTool, WRITE_TOOLS, functionDeclarations } from './tools';

const MAX_TOOL_ROUNDS = 6;
const MAX_HISTORY_MESSAGES = 14;

const formattedTools = functionDeclarations.map((fd) => ({
  type: 'function' as const,
  function: {
    name: fd.name,
    description: fd.description,
    parameters: fd.parametersJsonSchema,
  },
}));

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
  // UI-only flag — never sent to the API, stripped in sanitizedMessages.
  isError?: boolean;
}

interface RunTurnOptions {
  onPendingWrite: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<boolean>;
}

// Trims to the system prompt + last N messages, but never starts the slice
// on a 'tool' message — the Groq/OpenAI API rejects a history where a tool
// response is missing its preceding assistant tool_calls message.
function trimHistory(
  messages: ChatMessage[],
  maxMessages: number
): ChatMessage[] {
  if (messages.length <= maxMessages) return messages;

  const systemPrompt = messages[0]?.role === 'system' ? messages[0] : null;
  const rest = systemPrompt ? messages.slice(1) : messages;

  let sliceFrom = Math.max(0, rest.length - maxMessages);
  while (sliceFrom > 0 && rest[sliceFrom].role === 'tool') {
    sliceFrom--;
  }

  const trimmed = rest.slice(sliceFrom);
  return systemPrompt ? [systemPrompt, ...trimmed] : trimmed;
}

export async function runTurn(
  history: ChatMessage[],
  userMessage: string,
  { onPendingWrite }: RunTurnOptions
): Promise<{ updatedHistory: ChatMessage[]; text: string }> {
  let currentMessages = [...history];
  if (currentMessages.length === 0 || currentMessages[0].role !== 'system') {
    currentMessages.unshift({ role: 'system', content: TONE_INSTRUCTION });
    currentMessages.unshift({ role: 'system', content: SYSTEM_INSTRUCTION });
  }

  currentMessages.push({ role: 'user', content: userMessage });

  let rounds = 0;
  let keepGoing = true;

  while (rounds < MAX_TOOL_ROUNDS && keepGoing) {
    currentMessages = trimHistory(currentMessages, MAX_HISTORY_MESSAGES);

    const sanitizedMessages = currentMessages.map((m) => {
      const cleaned: any = { role: m.role, content: m.content ?? null };
      if (m.tool_calls) cleaned.tool_calls = m.tool_calls;
      if (m.tool_call_id) cleaned.tool_call_id = m.tool_call_id;
      if (m.name) cleaned.name = m.name;
      return cleaned;
    });

    const response = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: sanitizedMessages,
      tools: formattedTools,
      tool_choice: 'auto',
    });

    const assistantMessage = response.choices[0].message;
    currentMessages.push({
      role: 'assistant',
      content: assistantMessage.content ?? null,
      tool_calls: assistantMessage.tool_calls,
    });

    console.log(
      '=== MODELO CHAMOU FERRAMENTAS ===',
      assistantMessage.tool_calls
    );

    if (assistantMessage.tool_calls?.length) {
      rounds++;
      for (const tc of assistantMessage.tool_calls) {
        const args = JSON.parse(tc.function.arguments);
        let result: unknown;

        try {
          if (WRITE_TOOLS.has(tc.function.name)) {
            console.log(
              `[WRITE] A aguardar aprovação da UI para: ${tc.function.name}`
            );
            const approved = await onPendingWrite(tc.function.name, args);
            console.log(
              `[WRITE] Resposta da UI: ${approved ? 'Aprovado' : 'Recusado'}`
            );

            result = approved
              ? await executeTool(tc.function.name, args)
              : {
                  declined: true,
                  message:
                    'The person chose not to run this action. Do not retry.',
                };
          } else {
            console.log(
              `[READ/SCHEMA] A executar ferramenta direta: ${tc.function.name}`
            );
            result = await executeTool(tc.function.name, args);
          }
        } catch (err) {
          console.error('[ERRO NA FERRAMENTA]', err);
          result = { error: (err as Error).message };
        }

        console.log(`[TOOL RESPONSE] A enviar de volta para o modelo:`, result);
        currentMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(result),
        });
      }
    } else {
      keepGoing = false;
    }
  }

  const lastMessage = currentMessages[currentMessages.length - 1];
  return {
    updatedHistory: currentMessages,
    text: lastMessage.role === 'assistant' ? lastMessage.content || '' : '',
  };
}
