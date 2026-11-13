/**
 * Rule extension points (stage 6): the lists that rule bundles register into.
 *
 * WHY: before stage 6 these 17 lists and maps were declared inline in app.js,
 * next to everything else, and the rule context's register* functions were
 * written there too. Now one module owns them: a bundle registers through
 * `registrations` (spread into the rule context), and the application reads
 * the lists when it re-renders, mounts, loads an object, handles Escape, etc.
 * See js/rules/negation/install.js for a bundle that uses them.
 *
 * Nothing here knows any rule; every entry is the bundle's own data.
 */
export function createRuleExtensions() {
  const extensions = {
    // Kinds of drop target for ordinary drags ({ kind, validate, drop, ... }).
    dropTargets: [],
    // Previews that a context change dismisses ({ active, dismiss }).
    previewDismissals: [],
    // Cleanups run before the equation re-renders.
    rerenderCancels: [],
    // Keyboard commands on a focused occurrence, by the action name that
    // classifyOccurrenceKey() returns (e.g. 'request-rearrangement').
    occurrenceKeys: new Map(),
    // Escape handlers (each returns true if it handled the key) and "is this
    // rule busy?" checks, from bundles that own their own drags.
    escapes: [],
    activities: [],
    // Decorations of the shared multi-selection ({ paint, refresh, clear, reset })
    // and named commands (e.g. the selection toolbar's "Preview grouping").
    selectionDecorations: [],
    commands: new Map(),
    // Decorations drawn on the rendered tree before it is mounted, paints after
    // each mount, resize refreshes and object-load cleanups.
    treeDecorations: [],
    afterMounts: [],
    resizes: [],
    objectLoads: [],
    // Selection toolbars, the selection label and status hints (each returns
    // text or null; the first text wins, and `fallback` ones are asked
    // last), what activating (double-clicking) the selected occurrence does,
    // and pick-ups of a selected term.
    selectionToolbars: [],
    selectionLabels: [],
    selectionHints: [],
    selectionActivates: [],
    selectedPickups: [],
    // Named events: 'beforeObjectLoad', 'historyAppend', 'abandonDrags',
    // 'equationMounted'.
    events: new Map()
  };
  const dropTarget = kind => extensions.dropTargets.find(target => target.kind === kind) ?? null;
  const ownsView = () => extensions.activities.some(isActive => isActive());
  // Ordinary entries first, then fallbacks, each in registration order.
  const ordered = list => [...list.filter(entry => !entry.fallback), ...list.filter(entry => entry.fallback)];
  const firstText = list => ordered(list).map(entry => entry.text()).find(Boolean) ?? null;
  const selectionLabel = () => firstText(extensions.selectionLabels);
  const selectionHint = () => firstText(extensions.selectionHints);
  const emit = name => { for (const handler of extensions.events.get(name) ?? []) handler(); };
  const registrations = Object.freeze({
    registerDropTarget: target => { extensions.dropTargets.push(Object.freeze(target)); },
    registerPreviewDismissal: dismissal => { extensions.previewDismissals.push(dismissal); },
    registerRerenderCancel: cancel => { extensions.rerenderCancels.push(cancel); },
    registerOccurrenceKey: (action, handler) => { extensions.occurrenceKeys.set(action, handler); },
    registerEscape: handler => { extensions.escapes.push(handler); },
    registerActivity: isActive => { extensions.activities.push(isActive); },
    registerSelectionDecoration: decoration => { extensions.selectionDecorations.push(decoration); },
    registerCommand: (name, run) => { extensions.commands.set(name, run); },
    registerTreeDecoration: decorate => { extensions.treeDecorations.push(decorate); },
    registerAfterMount: paint => { extensions.afterMounts.push(paint); },
    registerResize: refresh => { extensions.resizes.push(refresh); },
    registerObjectLoad: cleanup => { extensions.objectLoads.push(cleanup); },
    registerSelectionToolbar: update => { extensions.selectionToolbars.push(update); },
    registerSelectionLabel: (text, { fallback = false } = {}) => { extensions.selectionLabels.push({ text, fallback }); },
    registerSelectionHint: (text, { fallback = false } = {}) => { extensions.selectionHints.push({ text, fallback }); },
    registerSelectionActivate: activate => { extensions.selectionActivates.push(activate); },
    registerSelectedPickup: pickup => { extensions.selectedPickups.push(pickup); },
    on(name, handler) {
      if (!extensions.events.has(name)) extensions.events.set(name, []);
      extensions.events.get(name).push(handler);
    }
  });
  return Object.freeze({ ...extensions, dropTarget, ownsView, emit, selectionLabel, selectionHint, registrations });
}
