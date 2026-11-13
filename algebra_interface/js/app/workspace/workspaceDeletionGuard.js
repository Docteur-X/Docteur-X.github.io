/**
 * Guard the asynchronous deletion boundary. Waiting for pending writes yields
 * to other UI events; a previously confirmed deletion must never clear a
 * different document that became active while the await was in progress.
 *
 * This intentionally compares identity rather than document object equality:
 * commits may replace an immutable document snapshot without changing the
 * active document's identity.
 */
export function isDeletionContextCurrent({ requestedId, activeId, currentDocumentId }) {
  return typeof requestedId === 'string' && requestedId.length > 0 &&
    requestedId === activeId && requestedId === currentDocumentId;
}
