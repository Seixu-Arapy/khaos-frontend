import { executeTool, WRITE_TOOLS } from './tools';

const MAX_TOOL_ROUNDS = 8;

export interface GeminiFunctionCall {
  name: string;
  id?: string;
  args: Record<string, unknown>;
}

export interface GeminiChatResponse {
  functionCalls?: GeminiFunctionCall[];
  text?: string;
}

export interface GeminiChat {
  sendMessage: (input: {
    message:
      | string
      | Array<{
          functionResponse: {
            name: string;
            id?: string;
            response: unknown;
          };
        }>;
  }) => Promise<GeminiChatResponse>;
}

interface RunTurnOptions {
  onPendingWrite: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<boolean>;
}

/**
 * Sends `userMessage` (or, on later iterations, function results) to the
 * chat, executing any requested tool calls, until the model replies with
 * plain text. Write-type tools are routed through `onPendingWrite` so the
 * UI can ask for confirmation before anything touches the database.
 */
export async function runTurn(
  chat: GeminiChat,
  userMessage: string,
  { onPendingWrite }: RunTurnOptions
): Promise<string> {
  let response = await chat.sendMessage({ message: userMessage });
  let rounds = 0;

  while (response.functionCalls?.length && rounds < MAX_TOOL_ROUNDS) {
    rounds++;
    const functionResponses = [];

    for (const fc of response.functionCalls) {
      let result: unknown;
      try {
        if (WRITE_TOOLS.has(fc.name)) {
          const approved = await onPendingWrite(fc.name, fc.args);
          result = approved
            ? await executeTool(fc.name, fc.args)
            : {
                declined: true,
                message:
                  'The person chose not to run this action. Do not retry it.',
              };
        } else {
          result = await executeTool(fc.name, fc.args);
        }
      } catch (err) {
        result = { error: (err as Error).message };
      }
      functionResponses.push({
        functionResponse: { name: fc.name, id: fc.id, response: result },
      });
    }

    response = await chat.sendMessage({ message: functionResponses });
  }

  return response.text || '';
}
