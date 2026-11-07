# Getting started

From `algebra_interface/`, serve the application over HTTP (not `file://`):

```sh
python -m http.server 8000
```

Open `http://localhost:8000/`. Windows may use `py -m http.server 8000` or `start-local-server.bat`.

Install Node.js/npm for development. For deterministic browser test setup, run `npm ci` and `npx playwright install chromium`. Then run:

```sh
npm test
npm run test:e2e
```

The application itself is dependency-free at runtime; Playwright is a development dependency. IndexedDB saves are origin/browser-profile-specific; export JSON for portable backups. Changing localhost port may make previous saved data appear missing. See [Testing](Testing_and_Verification.md).
