// Helpers puros sobre o grafo de sequência (tasks_sequence).
// Uma aresta {task_previous, task_next} significa: task_next vem depois de
// task_previous.

import type { Id, TasksSequence } from './types';

// Adicionar previousId -> nextId criaria um ciclo se nextId já conseguir
// alcançar previousId percorrendo as arestas existentes.
export function wouldCreateCycle(
  edges: TasksSequence[],
  previousId: Id,
  nextId: Id
): boolean {
  const adjacency = new Map<Id, Id[]>();
  edges.forEach(({ task_previous, task_next }) => {
    if (!adjacency.has(task_previous)) adjacency.set(task_previous, []);
    adjacency.get(task_previous)!.push(task_next);
  });

  const visited = new Set<Id>();
  const stack = [nextId];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === previousId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    (adjacency.get(current) || []).forEach((next) => stack.push(next));
  }
  return false;
}

export interface RailSegment {
  lane: number;
  colorIndex: number;
  node: boolean;
  drawTop: boolean;
  drawBottom: boolean;
}

export interface RailLayout {
  laneCount: number;
  // Alinhado com orderedIds: rows[i] são os segmentos desenhados na linha i.
  rows: RailSegment[][];
}

// Layout estilo git-graph para uma lista ordenada de tarefas: cada cadeia
// (componente conexo do grafo de sequência restrito à lista) vira uma "lane"
// vertical com um nó por tarefa; linhas passam direto por tarefas que estão
// no meio do intervalo mas fora da cadeia. Arestas com uma ponta fora da
// lista são ignoradas — os contadores before/after do TaskRow seguem
// cobrindo essas ligações.
export function buildSequenceRail(
  orderedIds: Id[],
  edges: TasksSequence[]
): RailLayout {
  const indexById = new Map<Id, number>(orderedIds.map((id, i) => [id, i]));
  const local = edges.filter(
    (e) => indexById.has(e.task_previous) && indexById.has(e.task_next)
  );
  const rows: RailSegment[][] = orderedIds.map(() => []);
  if (!local.length) return { laneCount: 0, rows };

  // Componentes conexos por union-find sobre as arestas locais.
  const parent = new Map<Id, Id>();
  const find = (id: Id): Id => {
    if (!parent.has(id)) parent.set(id, id);
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let current = id;
    while (current !== root) {
      const next = parent.get(current)!;
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  local.forEach((e) => {
    parent.set(find(e.task_previous), find(e.task_next));
  });

  const components = new Map<Id, { members: Set<Id>; first: number; last: number }>();
  parent.forEach((_, id) => {
    const root = find(id);
    if (!components.has(root)) {
      components.set(root, { members: new Set(), first: Infinity, last: -1 });
    }
    const comp = components.get(root)!;
    comp.members.add(id);
    const index = indexById.get(id)!;
    comp.first = Math.min(comp.first, index);
    comp.last = Math.max(comp.last, index);
  });

  // Lanes por empacotamento guloso de intervalos [first, last].
  const ordered = [...components.values()].sort((a, b) => a.first - b.first);
  const laneLastIndex: number[] = [];
  ordered.forEach((comp, colorIndex) => {
    let lane = laneLastIndex.findIndex((last) => last < comp.first);
    if (lane === -1) {
      lane = laneLastIndex.length;
      laneLastIndex.push(comp.last);
    } else {
      laneLastIndex[lane] = comp.last;
    }
    for (let i = comp.first; i <= comp.last; i++) {
      rows[i].push({
        lane,
        colorIndex,
        node: comp.members.has(orderedIds[i]),
        drawTop: i > comp.first,
        drawBottom: i < comp.last,
      });
    }
  });

  return { laneCount: laneLastIndex.length, rows };
}
