# Clean-up plan: the code as a fresh engineer would write it

**Status: approved by the owner, 12 November 2026, with C5 (folders by layer: move them). Recommendations taken for the other two: historical records unchanged; the old-parser oracle kept until E5. Done: C1 to C8 (12 November 2026); this plan is now a historical record, and its decisions are in 00_Current/Decisions.md.** The owner asked whether the code could be made as neat as an engineer restarting the project would make it, and whether that would make the pipeline documentation clearer (12 November 2026). The answer is yes to both, by cleaning in place rather than rewriting. This plan lists every step, in order, for approval before any code changes. It comes before E4d, because E4d builds on code this plan renames (the equality bundle).

## Rules for every step

1. **No change a student can see.** Every step must pass all four suites unchanged: about 860 Node tests, about 164 browser tests, 176 screenshots, and the parser comparison against the old parser. A step that needs a screenshot or route-table change says so, and why, in its commit.
2. **Saved data never changes.** Rule IDs (`identity.introduce`, `equality.apply-function` …), node types and document fields are stored in history. They keep their names even where the code around them is renamed.
3. **One step, one commit, one zip,** with the suites run on the finished change only (lesson 13).
4. **Each step removes a duplicate, a wrong name or a leftover,** and adds a check where one can stop it coming back.

## What a fresh engineer would see today (measured 12 November 2026)

The code is 226 files and about 16,700 lines.

| Finding | Evidence |
|---|---|
| The same preview built three times | `js/rules/negation/inlinePreview.js` (91 lines), `both-sides/inlinePreview.js` (65), `identities/inlinePreview.js` (59): the same show/clear/confirm/cancel shape; a fourth, more general one, `js/view/preview/transformationPreview.js` (241) |
| The same helper written three times | "copy a subtree with fresh IDs": `freshOccurrence` in `js/relations/equalityFunctionApplication.js` and `js/rules/both-sides/engine.js`, `freshCopy` in `js/engine/patterns.js` |
| Names that are now wrong | `equality-root` and `equality-sign` (23 uses) also draw `<` and `>`; `equalityFunctionApplication.js` is becoming "both sides" for every relation; "identity" names both the +0/×1 tool bundle (`js/rules/identity/`) and the identity rules (`js/rules/identities/`) |
| Tests named after history | 26 Node test files and 15 browser test files are named after old phases or versions (`phase3d-…`, `phase4d2-identity-lease`, `negation-compression-v12`, `release-closure`), not after what they check |
| Drag code spread thin | 17 `ordinaryDrag…` and arbitration files sit loose in `js/interaction/` (30 files) beside unrelated ones; `js/input/` has only 4 files |
| Leftover paths | 12 files carry "legacy" handling; some is needed for old saved documents, some may be dead |
| Folders that do not show the layers | `core`, `operations`, `relations`, `definitions`, `types`, `operators` are all Engine; `interaction`, `input`, `view`, `ui`, `rendering` all belong to the view; `manipulator` and `composition` sit between them |
| Documentation weighted to history | 257 documents, 208 of them historical; the handover and the status file receive the same appended paragraphs (5,000 and 7,400 words); six "Draft" architecture documents whose decisions are now made and built |

## The target: one path per job

Each job should have one path, so the documentation can say "this is how it works" once:

```text
reading   text ──► notation table ──► tree                      js/engine/parser.js, notation.js
drawing   tree ──► node specs ──► page                          js/rendering/
a step    gesture ──► request ──► coordinator ──► preview ──► commit ──► history
saving    document ──► history with fingerprints ──► storage
adding    one folder: a type, operator, relation, identity, gesture or rule
```

## Steps, in order

| Step | Work | Removes | Check added | Size |
|---|---|---|---|---|
| **C1. Correct names** (done) | `relation-root`, `relation-sign` for the classes; `js/relations/bothSides.js` for the both-sides engine; `js/rules/identity/` becomes `js/rules/identity-element/`. Rule IDs and saved data unchanged. | 3 wrong names | a test that every class the renderer uses for a relation is relation-neutral | small |
| **C2. One candidate preview** (done; `transformationPreview.js` stays: it draws arrows and an explanatory layout, a different job; the equality preview folds in with E4d) | One shared preview (`js/view/preview/candidatePreview.js`): draw the candidate, mark the new parts amber, Confirm and Cancel. Negation, both-sides and identity rules use it, and `transformationPreview.js` is folded in where it does the same job. One `freshCopy` in `js/core/`. | 3–4 previews, 3 helpers | a test that no rule folder has its own preview DOM code unless it is named as an exception | medium |
| **C3. Leftovers** (done: one result shape for factorisation; every "legacy" comment now says what it means; the one-root document wrapper goes to C7 for evidence) | Go through the 12 "legacy" places: those needed to open old saved documents are kept and labelled "saved-document compatibility", with a test using an old fixture; dead ones are removed. | dead paths | old-document fixtures for each kept path | small |
| **C4. Drag code in one folder** (done, inside C5: `js/view/drag/`) | `js/interaction/drag/` with the 17 drag and arbitration files and one `index.js`; `js/input/` merged into it or into the view. Only moves and import paths change. | loose files | the coupling report counts the folder | small |
| **C5. Folders that show the layers** *(owner decision; done)* | `js/engine/` (core, operations, patterns), `js/definitions/` (types, operators, relations, interactions, identities, and the helpers), `js/rules/`, `js/steps/` (coordinator, preview host, commit, history), `js/view/` (rendering, input router, drag, feedback, selection), `js/app/` (start-up, workspace, panels). Only moves and import paths change. | the folder puzzle | the import-boundary test states the layers by folder | large but mechanical |
| **C6. Tests by subject** (done: `tests/` and `e2e/` grouped as architecture, engine, documents, definitions, steps, view, app and rules/<bundle>; 47 files renamed) | Rename the 41 history-named test files by what they check, and group them in folders: `tests/engine/`, `tests/rules/`, `tests/view/`, `tests/workspace/`; `e2e/` likewise. Contents unchanged. | history names | a test that no test file is named after a phase | medium, mechanical |
| **C7. Unused code** (done: 25 stray exports removed, one dead function, and the one-root document wrapper, which a browser check showed the page never creates; `npm run report:unused`, test-enforced) | A script that lists unused exports and unreferenced files; remove what it finds, one by one. | dead code | the script runs with `npm run report:coupling` | small |
| **C8. Documentation** (done) | A small current set, written last so it describes the final shape: **Overview** (the layers and the folder map); **Pipelines** (reading, drawing, a step, saving: one page each, with the files); **Adding things** (one guide: type, operator, relation, identity, gesture, rule); **Decisions** (every owner decision in one list, with its date); **Status** (one table, not appended paragraphs); **Known issues and lessons**; **Future features**. The decided "Draft" documents become historical records, their decisions moved into Decisions. The handover becomes "how to continue", not a second status log. | duplicated status text, stale drafts | the documentation link check, plus a check that each pipeline page names files that exist | medium |

E4d follows C8, and is then written into the clean structure.

## The folder map for C4 and C5 (one move)

C4 (the drag folder) is done inside C5, so no file moves twice. The tree then shows the layers, from the mathematics outwards:

| New folder | What it holds | From |
|---|---|---|
| `js/engine/` | The mathematics: the tree and its registry, reading and printing, equality of trees, exact numbers, patterns, structures, the leading-1 rule; `operations/` (the rules' arithmetic); `relations/` (equality's own Engine functions, both sides); `teaching/` (teaching policies) | `js/core/` (the tree and notation files), `js/engine/operations/`, `js/engine/relations/equality.js` and `applyToBothSides.js`, `js/engine/teaching/` |
| `js/documents/` | Saving: documents, history and fingerprints, serialization, invariants, the clipboard library | `js/core/` (the document, history and clipboard files) |
| `js/definitions/` | Definition objects and their helpers: `types/`, `operators/`, `relations/`, `interactions/` | `js/definitions/`, `js/definitions/types/`, `js/definitions/operators/`, `js/relations/` (the definition folders), `js/definitions/interactions/` |
| `js/rules/` | Rule bundles, unchanged | `js/rules/` |
| `js/steps/` | A step's lifecycle: requests, the coordinator, the feature registry, candidates, the preview host, the source stamp, the atomic commit and publication | `js/manipulator/` (except the history view), `js/steps/previewSessionHost.js`, `transformationSourceStamp.js` |
| `js/view/` | What the student sees and does: the input router and view mode; `rendering/`; `drag/` (pickup, arbitration, hit testing, drag feedback, the reorder preview); `preview/` (the candidate and transformation previews); selection, structure navigation, feedback, the history view, the equation mount | `js/view/`, `js/view/rendering/`, `js/interaction/` (the rest), `js/input/`, the equation files of `js/ui/`, `js/view/historyView.js` |
| `js/app/` | Start-up wiring and the page around the view: application state, the rule context and extensions, the feature assembly; `workspace/`; `ui/` (panels, preferences, bindings) | `js/app/`, `js/app/workspace/`, the panel files of `js/ui/` |

`js/app.js` stays where it is, as the page's entry point. One change from the plan's first sketch: the document and history files get their own folder, `js/documents/`, because saving is a pipeline of its own, separate from the mathematics.

The layers by folder: **engine** and **definitions** are the mathematics; **documents** and **steps** build on them; **rules** use all of these plus view helpers; **view** draws the mathematics; **app** wires everything together. The import-boundary test will state these rules by folder.

How the move is done: a script moves each file (`git mv`, so history follows it), then rewrites every relative import from the old and new locations, and every quoted path (`js/engine/parser.js`) in code, tests, scripts and the current documentation. Folder names written into tests and scripts (boundary lists, the coupling report) are updated by hand. All four suites must pass unchanged.

## Decisions that are yours

1. **C5, folders by layer:** move the folders (recommended: the tree then shows the architecture, and the move is mechanical and fully checked), or keep today's folders and document the map.
2. **Historical records:** keep `06_Historical_Records/` as a read-only archive, unchanged (recommended), or thin it out.
3. **The old-parser oracle** (`tests/helpers/legacyParser.js`): keep it until E5, then delete it (recommended), or delete it in C3.
