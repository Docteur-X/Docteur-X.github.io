/**
 * One proposal lifecycle for all deliberate previews. A proposal is never a
 * committed AST. The caller supplies the current revision on confirmation;
 * stale previews cannot overwrite changes made by other controls/windows.
 */
export function createPreviewCoordinator() {
  let active = null;
  return Object.freeze({
    open(candidate, revision) {
      if (!candidate || active) return false;
      active = { candidate, revision };
      return true;
    },
    get() { return active?.candidate || null; },
    confirm(revision) {
      if (!active) return null;
      const accepted = active.revision === revision ? active.candidate : null;
      active = null;
      return accepted;
    },
    cancel() { active = null; },
    isOpen() { return Boolean(active); }
  });
}
