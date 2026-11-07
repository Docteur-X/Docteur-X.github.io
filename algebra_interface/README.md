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

## What works (v3 baseline)

- Scalar expression trees, numerical combination, rearrangement, distribution, factorisation, explicit grouping and identity insertion, with direct gestures and feedback.
- Binary equality, symmetry and limited clipboard-driven addition/ordered multiplication on both sides.
- Multiple Mathematical Objects per document, branching histories, session mathematical clipboard, IndexedDB saves and validated compact/legacy JSON import/export.
- Registered transformation proposals and shared confirmation/history preparation for seven principal transformation families.

See [current status](Developer%20Documentation/05_Roadmap/Current_Status.md) for precise scope and limitations.

## Saved work

Documents are saved in the browser's IndexedDB for the current site origin and browser profile, **not** in the source folder. Use **Export JSON** for portable backups. Closing a document does not delete it. Clearing site data or changing the localhost port may make browser-saved documents unavailable.

## Documentation for developers

Start at the [authoritative documentation index](Developer%20Documentation/README.md), then read the [founding student-agency vision](Developer%20Documentation/01_Founding_Vision/Student_Agency.md), [current status](Developer%20Documentation/05_Roadmap/Current_Status.md) and [architecture map](Developer%20Documentation/02_Architecture/System_Overview.md). Older milestone notes are preserved under [historical records](Developer%20Documentation/06_Historical_Records/README.md) but are not current specifications.

## Known limits

Advanced function/domain reasoning, general substitution, inequalities, matrices, multiple active resizable windows and annotations remain future work. See [known issues](Developer%20Documentation/05_Roadmap/Known_Issues.md) and [future features](Developer%20Documentation/05_Roadmap/Future_Features.md).

## Automated browser tests

The optional Playwright suite tests actual mouse interactions in Chromium. Install Node.js/npm, then run `npm install`, `npx playwright install chromium`, and `npm run test:e2e`. See [Testing and verification](Developer%20Documentation/03_Developer_Guides/Testing_and_Verification.md) for scope and limitations. The existing mathematical tests still run with `npm test`.
