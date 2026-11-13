# Phase 5B — Dependency-boundary guardrails

**Status:** Phase 5B hardened on 8 November 2026. **Node:** 398/398 passed independently. **Browser:** 74/74 passed on the original Phase 5B build per project owner; hardened test-only changes await a fresh browser run. **Production JS:** unchanged.

## Decision

Enforce a small number of architectural constraints that are true of the current code and directly protect Phase 5 extractions. Do not introduce ESLint, a dependency framework, or a generic controller solely for this increment. The check is a Node test and a small test-only helper, so it runs with the existing `node --test tests/*.test.js` workflow and requires no network or additional packages.

## Files and responsibility

- `tests/helpers/dependencyBoundaries.js`: static relative-ESM graph inspector, pure analysis helper.
- `tests/phase5b-dependency-boundaries.test.js`: production-graph acceptance and adversarial fixtures that prove the checks fail when rules are violated.
- No changes to production files under `js/`.

## Enforced contracts

1. Relative ESM dependencies must resolve to files in the current production `js/` graph.
2. The graph must remain acyclic; report a concrete cycle path.
3. Mathematical layers (`core`, `operations`, `relations`, `teaching`, `manipulator`) must not import presentation/composition layers (`ui`, `rendering`, `interaction`, `composition`, `workspace`). These layers may be composed by the application root.
4. No module may import `js/app.js` as a dependency: the bootstrap remains a composition root.
5. Advisory interaction arbitration/command-routing adapters must not directly import transformation publication, atomic commit, document repository, controller or history modules.

## Hardened lexical inspection and limitations

The original regular expression matched phantom imports in comments, strings and template literals. The hardened test-only helper now tokenizes the project's conventional ESM syntax, ignoring comments, ordinary strings, regex literals and template text when finding import/export declarations. It handles multiline static imports, re-exports and side-effect imports, and reports dynamic `import()` or escaped specifiers for manual architectural review rather than silently accepting them. `import.meta` is not a module dependency.

**This is a bounded lexical scanner, not a standards-complete ECMAScript parser.** Complex template interpolations, unusual regular-expression contexts, semicolon-free edge cases, and future syntax may require a real parser. If new syntax appears, extend the checker with adversarial fixtures or adopt a maintained parser after an explicit dependency decision. The checker still cannot prove absence of hidden globals, runtime side effects, dynamic callback dependencies, or mathematical/interaction correctness.

The current layer classification is directory-based. New module directories must be explicitly classified during future architecture work; no blanket prohibition applies between cooperating presentation modules.

## Hardened regression coverage

Five new tests cover false positives in comments/strings/templates/regex, multiline import and export declarations, dynamic-import review, `import.meta`, and escaped specifier review. The full Node suite passes 398/398. No production files changed. These checks complement rather than replace browser and mathematical regression tests.

## Acceptance and rollback

The full Node suite passed 398/398, including eleven Phase 5B tests. The project owner confirmed 74/74 browser tests on the original Phase 5B build; the hardened checker changes are test-only, and fresh browser verification of this archive remains pending. If a new rule produces legitimate false positives, revise its explicit contract and add fixtures rather than silently suppressing failures. Rollback consists only of removing the test-only helper and its test file; production behavior is unaffected.

## Next: Phase 5C decision gate

Revisit the 5A extraction shortlist. Before moving workspace/document coordination, trace every caller, state owner, save debounce, status gate, object switch and preview cancellation. Extract only a cohesive seam that can receive explicit dependencies without duplicating mathematical state or changing autosave behavior. If none is justified, document why and choose the next stable seam instead.
