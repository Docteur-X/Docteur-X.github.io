/**
 * Workspace status publication gate.
 *
 * Storage writes are serialized separately. This gate only determines whether
 * an asynchronous operation may still describe the CURRENT workspace after it
 * completes. It never cancels a persistence operation or owns mathematics.
 */
export function createWorkspaceStatusGate() {
  let generation = 0;
  return {
    invalidate() { generation += 1; },
    capture(documentId) { return { generation, documentId }; },
    isCurrent(token, activeDocumentId) {
      return Boolean(token) && token.generation === generation &&
        token.documentId === activeDocumentId;
    }
  };
}
