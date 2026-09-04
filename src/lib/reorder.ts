// Shared list reordering helper for the slide editor panels. Moving a row keeps
// every other row in its relative order, so the slide and the PowerPoint export
// simply follow the array order.

/** Move one entry from `from` to `to`; out-of-range moves return the input. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const list = [...items];
  if (from === to) return list;
  if (from < 0 || from >= list.length) return list;
  const target = Math.min(list.length - 1, Math.max(0, to));
  const [moved] = list.splice(from, 1);
  if (moved === undefined) return [...items];
  list.splice(target, 0, moved);
  return list;
}

/** Swap-free nudge helpers used by the keyboard controls in the panels. */
export function moveUp<T>(items: readonly T[], index: number): T[] {
  return index <= 0 ? [...items] : moveItem(items, index, index - 1);
}

export function moveDown<T>(items: readonly T[], index: number): T[] {
  return index >= items.length - 1 ? [...items] : moveItem(items, index, index + 1);
}

export function canMoveUp(index: number): boolean {
  return index > 0;
}

export function canMoveDown(index: number, length: number): boolean {
  return index >= 0 && index < length - 1;
}
