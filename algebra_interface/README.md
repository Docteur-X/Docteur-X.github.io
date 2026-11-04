# Algebra Interface — Visual Mathematical Manipulator

An offline-capable educational prototype for directly manipulating mathematical expressions and equations with visible, deliberate transformations. **Pedagogical clarity comes first.**

## Run

From the project directory, start a local HTTP server:

```sh
python -m http.server 8000
```

On Windows, `py -m http.server 8000` or `start-local-server.bat` may be available. Open <http://localhost:8000/>. Avoid opening `index.html` via `file://`; browser ES modules require an HTTP origin in this setup.

Run automated tests with Node.js:

```sh
node --test tests/*.test.js
```

No application package installation is required. `npm test` is an alternative if npm is installed.

## What works

- Expressions: addition, multiplication, explicit grouping, rearrangement, numerical evaluation, distribution, and factorisation with deliberate visual previews.
- Equality: binary scalar `Equal` statements, symmetry, conservative truth feedback, and independent manipulation of either side.
- Manipulator: stable drag hit-testing, range selection/grouping, hitbox-visibility modes, and draggable `+0` / `×1` identity tools.
- Workspace: multiple named documents, independent branching histories, autosave/manual save through IndexedDB, and JSON import/export.
- History: snapshots plus versioned transformation events and deterministic patches. Compact history-only export exists in the history library, but **compact document export is not yet wired into the Workspace UI**.

## Saved work

Documents are saved in the browser's IndexedDB for the current site origin and browser profile, **not** in the source folder. Use **Export JSON** for portable backups. Closing a document does not delete it. Clearing site data or changing the localhost port may make browser-saved documents unavailable.

## Documentation for developers

Start with [Current implementation status](Developer%20Documentation/CURRENT_STATUS.md), then the [Developer Documentation index](Developer%20Documentation/README.md) and [Project context](Developer%20Documentation/PROJECT_CONTEXT.md). The [Architecture decisions](Developer%20Documentation/ARCHITECTURE_DECISIONS.md) preserve the rationale for major design choices. The [Historical development README](Developer%20Documentation/Historical%20Notes/README_DEVELOPMENT_CHRONICLE.md) is retained for reference, **not** as an authoritative description of today's code.

## Known limits

Browser pointer, accessibility, and storage-failure cases still need broader automated end-to-end testing. Imported JSON receives basic envelope validation; deep AST/event/patch validation and complexity limits remain planned. Cross-document substitution, simultaneous interactive windows, logical connectors, and full keyboard support for identity insertion are not implemented.
