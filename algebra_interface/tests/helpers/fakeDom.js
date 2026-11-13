/**
 * A minimal DOM stand-in for running the REAL renderer in Node.
 * Enough for createElement, classes, dataset, attributes and children.
 * Browser layout and events still need Playwright.
 */
export function fakeDocument() {
  return { createElement(tag) {
    const classes = new Set();
    const el = { tag, tagName: String(tag).toUpperCase(), children: [], dataset: {}, attributes: {}, textContent: '', title: '',
      get className() { return [...classes].join(' '); },
      set className(value) { classes.clear(); for (const name of String(value).split(/\s+/).filter(Boolean)) classes.add(name); },
      classList: {
        add(...names) { for (const n of names) classes.add(n); },
        remove(...names) { for (const n of names) classes.delete(n); },
        contains(name) { return classes.has(name); },
        toggle(name, force) { const on = force ?? !classes.has(name); on ? classes.add(name) : classes.delete(name); return on; }
      },
      append(...children) { el.children.push(...children); },
      setAttribute(name, value) { el.attributes[name] = String(value); },
      getAttribute(name) { return el.attributes[name] ?? null; },
      hasAttribute(name) { return Object.hasOwn(el.attributes, name); },
      removeAttribute(name) { delete el.attributes[name]; },
      // Enough for partFromElement on an element that is itself labelled.
      closest() { return el.dataset.hitboxRole ? el : null; }
    };
    return el;
  } };
}
export const allElements = el => [el, ...el.children.flatMap(allElements)];

/** Render with the fake document installed, then restore the real global. */
export async function withFakeDocument(run) {
  const original = globalThis.document;
  globalThis.document = fakeDocument();
  try { return await run(); } finally { globalThis.document = original; }
}
