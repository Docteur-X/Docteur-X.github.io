/**
 * Input router: the one place a view listens to pointer and keyboard input.
 *
 * Standard 2 of the interaction standards
 * (Developer Documentation/06_Historical_Records/Superseded_2026-11-12/Interaction_Standards_Draft.md (decisions: 00_Current/Decisions.md)).
 *
 * WHY: before stage 3, `app.js` added 18 separate pointer/key listeners to the
 * equation, its parent, `document` and `window`. Which one acted depended on
 * the order they happened to be added and on `stopImmediatePropagation()`.
 * Here every route is listed in one table, in the order it runs, and the view
 * mode is checked in one place before any route runs.
 *
 * HOW:
 * - A *route* is `{ name, on, at, modes, handle }`.
 *   - `on`:    a DOM event type ('pointerdown', 'click', 'keydown', ...).
 *   - `at`:    where it listens, which also fixes WHEN it runs in the browser's
 *              event order: 'document-capture' (first), 'view', 'view-parent',
 *              'document', 'window' (last).
 *   - `modes`: which view modes it may run in (see `modeMatches`). This is
 *              how decision 1.2 is enforced: a route marked 'idle' can never
 *              run while a preview is open or a drag is in progress.
 *   - `handle(event)`: the code to run.
 * - The router adds ONE native listener per (place, event type), the first
 *   time a route needs it. Routes for that pair run in the order declared.
 * - A route that calls `event.stopImmediatePropagation()` stops the later
 *   routes of the same listener, exactly as it stopped later native
 *   listeners before. (The router notices the call; see `dispatch`.)
 *
 * GESTURE DECLARATIONS: `declare()` records which gestures a rule accepts on
 * which labelled parts (data only). `gesturesFor(part)` answers "what can I do
 * here?" from them (decision 2.2: for guided teaching and accessibility).
 * Routes still contain the behaviour until rules move into bundles (stage 4).
 *
 * This file does not know any rule, the renderer or application state.
 */
import { INTERACTIONS } from '../definitions/interactions/interactions.js';

const LISTEN_AT = Object.freeze(['document-capture', 'view', 'view-parent', 'document', 'window']);

/**
 * Does a route's `modes` allow the current mode?
 *   'any'                        always
 *   'idle'                       only when idle
 *   'preview' / 'dragging'       any preview / any drag
 *   'preview:grouping'           only that owner's preview (likewise dragging)
 *   ['idle', 'dragging:factor']  any of the listed
 */
export function modeMatches(modes, mode) {
  if (modes === 'any') return true;
  const list = Array.isArray(modes) ? modes : [modes];
  return list.some(spec => {
    if (typeof spec !== 'string') return false;
    const [kind, owner] = spec.split(':');
    return mode.kind === kind && (owner === undefined || mode.owner === owner);
  });
}

/**
 * The gesture kinds of decision 2.1, read from the interaction definitions
 * (js/definitions/interactions/, stage I1). Adding a gesture is a folder there, not an
 * edit here.
 */
export const GESTURE_KINDS = Object.freeze(INTERACTIONS.list.map(interaction => interaction.id));

/**
 * Does a declaration's `on` pattern match a labelled part?
 * A part is plain data read from the renderer's labels and the tree, e.g.
 * { role: 'operator', operatorKind: 'negate', nodeId: 'node-5' } or
 * { role: 'occurrence', nodeType: 'Number', parentType: 'Multiply', selected: true }.
 * Every key in the pattern must equal the part's value.
 */
export function partMatches(pattern, part) {
  if (!pattern || !part) return false;
  return Object.entries(pattern).every(([key, value]) => part[key] === value);
}

export function createInputRouter({ viewMode, places }) {
  if (!viewMode || typeof viewMode.current !== 'function') {
    throw new TypeError('The input router needs the view mode');
  }
  for (const at of LISTEN_AT) {
    if (!places?.[at] || typeof places[at].addEventListener !== 'function') {
      throw new TypeError(`The input router needs a place to listen: ${at}`);
    }
  }
  const routes = new Map();       // `${at} ${on}` -> route[]
  const names = new Set();
  const declarations = [];

  function dispatch(list, event) {
    // A route stops later routes of this listener by calling the native
    // stopImmediatePropagation(), as before. Record the call so this loop
    // stops too; the native call still stops other listeners.
    let stopped = false;
    const native = event.stopImmediatePropagation;
    event.stopImmediatePropagation = function stopImmediatePropagation() {
      stopped = true;
      return native.call(event);
    };
    try {
      for (const route of list) {
        if (stopped) break;
        // The single mode check (standard 1, decision 1.2).
        if (!modeMatches(route.modes, viewMode.current())) continue;
        route.handle(event);
      }
    } finally {
      event.stopImmediatePropagation = native;
    }
  }

  return Object.freeze({
    /** Add a route. Routes for the same place and event run in this order. */
    route({ name, on, at, modes, handle }) {
      if (typeof name !== 'string' || !name || names.has(name)) throw new TypeError(`Route needs a unique name: ${name}`);
      if (typeof on !== 'string' || !on) throw new TypeError(`Route ${name} needs an event type`);
      if (!LISTEN_AT.includes(at)) throw new TypeError(`Route ${name} has an unknown place: ${at}`);
      if (modes === undefined) throw new TypeError(`Route ${name} must say which modes it runs in`);
      if (typeof handle !== 'function') throw new TypeError(`Route ${name} needs a handler`);
      names.add(name);
      const key = `${at} ${on}`;
      if (!routes.has(key)) {
        const list = [];
        routes.set(key, list);
        const capture = at === 'document-capture';
        places[at].addEventListener(on, event => dispatch(list, event), capture);
      }
      routes.get(key).push(Object.freeze({ name, on, at, modes, handle }));
    },

    /** Record that a rule accepts a gesture on parts matching `on` (data only). */
    declare({ ruleId, kind, on, onto, key, description, spoken, hint }) {
      if (typeof ruleId !== 'string' || !ruleId) throw new TypeError('A declaration needs a rule ID');
      const interaction = INTERACTIONS.get(kind);
      if (!interaction) throw new TypeError(`Unknown gesture kind: ${kind}`);
      if (!on || typeof on !== 'object') throw new TypeError('A declaration needs an `on` pattern');
      // What a declaration of this gesture must (or must not) give comes from
      // its definition: a key gesture needs its key, a drag onto needs `onto`.
      const { fields } = interaction;
      if (fields.key === 'required' && (typeof key !== 'string' || !key)) throw new TypeError('A key gesture needs its key');
      if (fields.onto === 'required' && (!onto || typeof onto !== 'object')) throw new TypeError(`A ${kind} gesture needs an \`onto\` pattern`);
      if (fields.onto === 'none' && onto) throw new TypeError(`A ${kind} gesture takes no \`onto\` pattern`);
      declarations.push(Object.freeze({ ruleId, kind, on: Object.freeze({ ...on }),
        onto: onto ? Object.freeze({ ...onto }) : undefined, key, description, spoken, hint }));
    },

    /**
     * "What can I do here?" Every declaration whose `on` matches this part.
     * While the view is not idle the answer is empty: nothing new may start
     * (decision 1.2), so nothing is offered.
     */
    gesturesFor(part) {
      if (!viewMode.isIdle()) return [];
      return declarations.filter(declaration => partMatches(declaration.on, part));
    },

    /** The route table, in order, for tests and the renderer inspector. */
    describeRoutes() {
      return [...routes.values()].flat().map(({ name, on, at, modes }) => ({ name, on, at, modes }));
    },
    declarations() { return [...declarations]; }
  });
}
