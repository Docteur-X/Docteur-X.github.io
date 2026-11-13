/**
 * Row chunks (D14, 14 November 2026): where a long row may break.
 *
 * A row of terms (a sum's addends, a product's factors) wraps between its
 * flex items. The owner's rule is to break only BEFORE an operator, never
 * after one, so each operator is wrapped with the term that follows it:
 *
 *   [3x] [+ −2y] [+ 4 sin(x)] [+ −5z]
 *
 * A chunk is a box for line breaking only. It is not a term, has no node id,
 * no hitbox role and no feedback; the row's meaning is unchanged. Code that
 * reads a row's terms and operators must use rowItems(), which sees through
 * the chunks, never `container.children`.
 *
 * Grouping rule: a new chunk starts at each item after the chunk already holds
 * a term, except a closing bracket, which stays with the term before it. So
 * an opening bracket stays with the first term, an operator with the term
 * after it, and a ÷ factor (its sign is inside its own box) starts its own.
 */
const ROW_CHUNK_CLASS = "row-chunk";

// Reads classes through classList when it can, else className, so the same
// code runs on the page and on the small stand-in elements of the Node tests.
function hasClass(element, name) {
  if (typeof element?.classList?.contains === "function") return element.classList.contains(name);
  return String(element?.className ?? "").split(/\s+/).includes(name);
}
const isChunk = element => hasClass(element, ROW_CHUNK_CLASS);
const isTerm = element => hasClass(element, "term");
const isClosingBracket = element =>
  hasClass(element, "expression-bracket") && /^[)\]}]$/.test(element.textContent ?? "");

/** Group a row's items into chunks; returns the chunks, in order. */
export function chunkItems(items, doc = document) {
  const chunks = [];
  let current = null;
  let holdsTerm = false;
  for (const item of items) {
    if (!current || (holdsTerm && !isClosingBracket(item))) {
      current = doc.createElement("span");
      if (typeof current.classList?.add === "function") current.classList.add(ROW_CHUNK_CLASS);
      else current.className = ROW_CHUNK_CLASS;
      chunks.push(current);
      holdsTerm = false;
    }
    current.append(item);
    if (isTerm(item)) holdsTerm = true;
  }
  return chunks;
}

/** Put a row's items into the container, chunked. */
export function appendChunked(container, items, doc = document) {
  container.append(...chunkItems(items, doc));
}

/** Replace a row's contents with these items, chunked (used by previews). */
export function replaceChunked(container, items, doc = document) {
  container.replaceChildren(...chunkItems(items, doc));
}

/** A row's terms, operators and brackets in order, seeing through chunks. */
export function rowItems(container) {
  return [...(container?.children ?? [])].flatMap(child => isChunk(child) ? [...child.children] : [child]);
}

/** The items just before and after an element in its row (or null). */
export function rowNeighbours(element) {
  const parent = element?.parentElement;
  const row = isChunk(parent) ? parent.parentElement : parent;
  const items = rowItems(row);
  const index = items.indexOf(element);
  return { previous: index > 0 ? items[index - 1] : null, next: index >= 0 ? items[index + 1] ?? null : null };
}
