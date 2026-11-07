/** Browser-local repository. IndexedDB belongs to persistence, not mathematics.
 * Save requests are serialized by the caller to avoid older writes winning races.
 */
import { validateDocument } from './workspaceDocuments.js';
const DB_NAME = 'visual-mathematics-workspace';
const STORE = 'documents';
const VERSION = 1;
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB is unavailable.')); return; }
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction(mode, work) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = work(tx.objectStore(STORE));
      // A request can succeed before the transaction is durably committed.
      // Report success only when the whole transaction completes.
      let result;
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || req.error);
      tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted.'));
    });
  } finally { db.close(); }
}
export const documentRepository = {
  async list() { return (await transaction('readonly', s => s.getAll())).map(validateDocument); },
  async load(id) { const doc = await transaction('readonly', s => s.get(id)); return doc ? validateDocument(doc) : null; },
  async save(doc) { return transaction('readwrite', s => s.put(validateDocument(doc))); },
  async remove(id) { return transaction('readwrite', s => s.delete(id)); }
};
