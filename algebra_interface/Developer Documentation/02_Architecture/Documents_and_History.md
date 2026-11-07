# Documents, Mathematical Objects, history and persistence

A Document (schema v2) contains multiple independent Mathematical Objects. Each object has a mathematical root, assignments and branching history. Workspace persistence uses browser IndexedDB; import/export passes through validated serialization and compatibility adapters in `js/core/`. Session clipboard entries can capture mathematical subtrees across documents without automatically creating a new object.

History stores committed states/events, rule metadata and node identities; preview and pointer movement do not create mathematical history. Compact event-only document export/import is integrated (see current serialization code); historical notes claiming otherwise predate this integration. Failed import must not replace the active workspace. A valid in-memory commit should not be rolled back merely because a later autosave fails; report durability separately.

Current publication preserves existing document identity for workspace references, but the app still relies on a single active view. A future multi-window design should publish through the authoritative object store and notify each view. See [Data model](../04_Reference/Mathematical_Data_Model.md) and [Serialization](../04_Reference/Serialization_Formats.md).
