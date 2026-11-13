/**
 * Session-scoped mathematical clipboard library.
 *
 * The library is an application service, not a mathematical transformation.
 * Entries are immutable snapshots captured from a source AST, not references to
 * live nodes. In particular, switching worksheets or changing a source object
 * must never change a previously captured operand.
 *
 * Keeping this module DOM-free lets future renderers (including matrix and
 * logical-statement views) reuse the same clipboard without rewriting rules.
 * No browser storage is used: a reload deliberately starts a new session.
 */
const clone = value => JSON.parse(JSON.stringify(value));

export function createClipboardLibrary() {
  return { entries: [], activeId: null, nextId: 1 };
}

export function appendClipboardEntry(library, captured) {
  if (!captured || captured.format !== 'algebra-mathematical-clipboard' || !captured.root)
    throw new Error('Expected a captured mathematical subtree or statement.');
  const entry = { ...clone(captured), clipboardId: `clip-${library.nextId}` };
  return {
    entries: [...library.entries, entry],
    activeId: entry.clipboardId,
    nextId: library.nextId + 1
  };
}

export function selectClipboardEntry(library, id) {
  if (!library.entries.some(entry => entry.clipboardId === id))
    throw new Error('Clipboard selection no longer exists.');
  return { ...library, activeId: id };
}

export function removeClipboardEntry(library, id) {
  const entries = library.entries.filter(entry => entry.clipboardId !== id);
  if (entries.length === library.entries.length) return library;
  return { ...library, entries, activeId: library.activeId === id ? (entries.at(-1)?.clipboardId ?? null) : library.activeId };
}

export function clearClipboardLibrary() { return createClipboardLibrary(); }

export function activeClipboardEntry(library) {
  return library.entries.find(entry => entry.clipboardId === library.activeId) ?? null;
}
