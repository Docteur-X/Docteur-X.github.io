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
npm test
```

The application itself needs no package installation. `npm test` needs only Node.js and npm, and finds tests in subfolders too.

## What works

- Scalar expression trees, numerical combination, rearrangement, distribution, factorisation, explicit grouping, identity insertion and negation/subtraction, with direct gestures and feedback.
- Binary equality, symmetry and limited clipboard-driven addition/ordered multiplication on both sides.
- Multiple Mathematical Objects per document, branching histories, session mathematical clipboard, IndexedDB saves and validated compact/legacy JSON import/export.
- Registered transformation proposals and shared confirmation/history preparation for eight principal transformation families.

See [Status](Developer%20Documentation/00_Current/Status.md) for precise scope and limitations.

## Saved work

Documents are saved in the browser's IndexedDB for the current site origin and browser profile, **not** in the source folder. Use **Export JSON** for portable backups. Closing a document does not delete it. Clearing site data or changing the localhost port may make browser-saved documents unavailable.

## Documentation for developers

Start at the [authoritative documentation index](Developer%20Documentation/README.md), then read the [founding student-agency vision](Developer%20Documentation/01_Founding_Vision/Student_Agency.md), [Handover](Developer%20Documentation/00_Current/Handover.md), [Status](Developer%20Documentation/00_Current/Status.md) and [Overview](Developer%20Documentation/00_Current/Overview.md). Older milestone notes are preserved under [historical records](Developer%20Documentation/06_Historical_Records/README.md) but are not current specifications.

## Known limits

Advanced function/domain reasoning, general substitution, inequalities, matrices, multiple active resizable windows and annotations remain future work. See [known issues](Developer%20Documentation/05_Roadmap/Known_Issues.md) and [future features](Developer%20Documentation/05_Roadmap/Future_Features.md).

## Automated browser tests

The optional Playwright suite tests actual mouse interactions in Chromium. Install Node.js/npm, then run `npm install`, `npx playwright install chromium`, and `npm run test:e2e`. See [Testing and verification](Developer%20Documentation/03_Developer_Guides/Testing_and_Verification.md) for scope and limitations. The existing mathematical tests still run with `npm test`.

## Navigate mathematical structure

Use the **Mathematical structure** toolbar to move to the parent, first child, or neighbouring sibling of an AST occurrence. While the equation or toolbar is focused, `Alt+Arrow` provides keyboard navigation. **Select occurrence** selects the focused mathematical node without creating a history event. The navigator does not modify mathematical expressions.
