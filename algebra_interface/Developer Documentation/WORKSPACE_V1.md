# Workspace v1 — developer handover

**Implemented:** A workspace starts with zero documents. Students can create, name, reopen, switch, rename, duplicate, close (without deleting), delete (with confirmation), manually save, autosave, export and import JSON documents. The existing Manipulator is reused for the active document only.

## Responsibilities

- `js/core/workspaceDocuments.js`: versioned, JSON-safe document records; document identity; capture/duplicate/validation.
- `js/core/documentController.js`: one document's committed tree, independent history and metadata.
- `js/core/documentRepository.js`: IndexedDB transactions. The browser owns the storage files, **not** the project root.
- `js/app.js`: workspace UI, active-document switching and interaction lifecycle. The algebra rules remain independent.
- `index.html` and `styles.css`: lightweight document browser above the existing Manipulator.

## State and history

Each document owns `root`, `substitutions`, `history`, `id`, `title`, and `metadata`. The history retains branching snapshots and versioned replay events. Empty documents have a null root and no initial history event until mathematics is entered. Node IDs in restored historical branches are reserved to prevent new nodes reusing them.

Switching documents cancels uncommitted drags/previews and clears local selection. It does not create a mathematical event. Future cross-document selection belongs in a **separate workspace-level selection model**, not in this transient local selection.

## Persistence and backups

IndexedDB autosave follows committed changes (short debounce); Save is also available. Storage writes are serialized, and the UI reports failures. JSON export/import provides portable backups. Import assigns a fresh document ID while retaining the imported mathematical node and history IDs. Site storage is origin-specific; changing localhost ports or clearing site data can hide/delete browser-saved documents. Export regularly, especially on shared computers.

The v1 import validator checks the envelope/schema; **future hardening** should deeply validate every AST node, history event and patch and enforce complexity limits before importing untrusted documents.

## Boundaries and follow-up

The existing `app.js` remains the single mounted Manipulator and contains some legacy interaction coordination. This is intentional for v1; no simultaneous interactive windows or cross-document drag gestures yet. The controller/repository boundaries are designed for later per-window Manipulator instances and embeddable use.

**Browser-tested by the project owner:** document creation and switching, independent manipulation, persistence across refresh, JSON export/import, closing all windows, and cancellation of transient interactions on switch. **Still needs targeted testing:** storage-denied/quota failures, corrupted imports, interrupted writes, and broader automated browser regression coverage. Unit tests protect the document model and pre-existing mathematical behaviour.
