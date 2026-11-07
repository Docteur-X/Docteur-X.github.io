# Mathematical Documents v2 — multiple independent objects

**Status:** Implemented in the document model and active-object UI. Browser interaction still requires manual verification.

## Concept

A Workspace contains Documents. Each Document contains zero or more **Mathematical Objects**. An object is one independently evolving expression or statement AST, with its own branching snapshot/event history and temporary numerical assignments. Mere co-location in a Document **does not** imply logical AND, OR, or equality.

A Document is a persistent working file for a problem or investigation, not necessarily a single application session. The `Session` term remains reserved for a period of activity.

## Data model

- `schemaVersion: 2` identifies the document format.
- `objects` maps stable object IDs to `{id, title, root, kind, history, substitutions, metadata}`.
- `objectOrder` controls display order independently of object IDs.
- `activeObjectId` identifies the one object attached to the current Manipulator; it may be `null` for an empty document.
- Each object's `root` is an expression or statement AST; `history` stores its own branch graph and replayable events.
- The Document owns its identity, title, metadata, and object collection; the Workspace owns open documents.

The `workspaceDocuments.js` module validates, creates, removes, renames and migrates objects without importing DOM or algebra rules. `documentController.js` delegates committed AST/history updates to the active object. `app.js` binds the existing single Manipulator to that object and cancels transient gestures on object switches. Mathematical rule modules and the renderer remain unchanged.

## Behaviour and limitations

- A new document opens with one empty working object for immediate input; the schema also supports zero-object documents.
- **New object**, **Rename object**, **Delete object** and object tabs are in the active Document interface.
- Switching objects preserves each object's AST, history and variable assignments. Transient selections, drags and previews are discarded.
- Autosave, manual Save, JSON export/import and IndexedDB store the complete v2 document. Existing v1 documents are migrated on load/import by wrapping their root/history in one object, preserving all mathematical node and history IDs.
- Each object is edited separately in v2; multiple simultaneous Manipulators, copying subexpressions, cross-object operations and document-level coordinated activity events are future features.
- History remains snapshot-backed in memory. This release was built from the latest available documentation-reviewed project archive, which uses full JSON export; compact history export is not claimed as part of this build.

## Regression checklist

1. Create one document, add an equation and a second object containing `-3`.
2. Rearrange or factorise the equation; verify the auxiliary expression is unchanged.
3. Switch between objects, undo and branch within one, and confirm the other's history remains independent.
4. Delete an object, including the final object, then add a new one.
5. Save/reload and JSON export/import; verify all objects and histories survive.
6. Import a schema-v1 document; verify its root, node IDs and branching history survive migration.
7. Verify existing drag previews, hitbox visibility and identity toolbar still work on the active object.
