// tasks_sequence and sections_sequence store ordering as a linked list of
// (previous, next) id pairs rather than a simple integer column. These
// helpers turn that edge list into an ordered array, and back again.

/**
 * @param ids - all ids that belong to this list (e.g. every task in a section)
 * @param edges - edges scoped to this list
 * @returns ids in order
 */
export function orderFromEdges<T>(
  ids: T[],
  edges: { prev: T; next: T }[]
): T[] {
  const idSet = new Set(ids);
  const nextOf = new Map<T, T>();
  const hasIncoming = new Set<T>();

  edges.forEach(({ prev, next }) => {
    if (idSet.has(prev) && idSet.has(next)) {
      nextOf.set(prev, next);
      hasIncoming.add(next);
    }
  });

  let head = ids.find((id) => !hasIncoming.has(id));
  if (head === undefined) head = ids[0];

  const ordered: T[] = [];
  const seen = new Set<T>();
  let current: T | undefined = head;

  while (current !== undefined && !seen.has(current)) {
    ordered.push(current);
    seen.add(current);
    current = nextOf.get(current);
  }

  // Anything not reached (e.g. brand new items with no sequence row yet)
  // gets appended at the end, in their original relative order.
  ids.forEach((id) => {
    if (!seen.has(id)) ordered.push(id);
  });

  return ordered;
}

/**
 * Moves `movedId` so it sits at `targetIndex` within `orderedIds`, returning
 * a new ordered array. Does not touch the database.
 */
export function moveInOrder<T>(
  orderedIds: T[],
  movedId: T,
  targetIndex: number
): T[] {
  const withoutMoved = orderedIds.filter((id) => id !== movedId);
  const clampedIndex = Math.max(0, Math.min(targetIndex, withoutMoved.length));
  withoutMoved.splice(clampedIndex, 0, movedId);
  return withoutMoved;
}

/**
 * Turns an ordered id array into the edge rows to persist, e.g.
 * [{ task_previous: 1, task_next: 2 }, { task_previous: 2, task_next: 3 }]
 */
export function edgesFromOrder<T, P extends string, N extends string>(
  orderedIds: T[],
  prevKey: P,
  nextKey: N
): ({ [K in P]: T } & { [K in N]: T })[] {
  const rows: ({ [K in P]: T } & { [K in N]: T })[] = [];
  for (let i = 0; i < orderedIds.length - 1; i++) {
    rows.push(
      { [prevKey]: orderedIds[i], [nextKey]: orderedIds[i + 1] } as {
        [K in P]: T;
      } & { [K in N]: T }
    );
  }
  return rows;
}
