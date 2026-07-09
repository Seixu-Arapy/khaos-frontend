// Tokens que o assistente pode emitir na resposta final para referenciar uma
// entidade real (task, project ou event) já persistida, ex: "[[task:3fa8...]]".
// O ChatPanel troca esses tokens por um chip formatado (EntityChip) em vez
// de deixar o modelo descrever a entidade em prosa.

export type ChatEntityType = 'task' | 'project' | 'event';

export interface TextSegment {
  type: 'text';
  value: string;
}

export interface EntitySegment {
  type: 'entity';
  entityType: ChatEntityType;
  id: string;
}

export type MessageSegment = TextSegment | EntitySegment;

const ENTITY_REF_RE = /\[\[(task|project|event):([0-9a-fA-F-]{8,})\]\]/g;

export function parseMessageSegments(text: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(ENTITY_REF_RE)) {
    const [full, entityType, id] = match;
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, index) });
    }
    segments.push({
      type: 'entity',
      entityType: entityType as ChatEntityType,
      id,
    });
    lastIndex = index + full.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}
