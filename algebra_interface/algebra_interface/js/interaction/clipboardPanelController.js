import { expressionToDisplayString } from '../core/parser.js';
import { selectClipboardEntry, removeClipboardEntry, clearClipboardLibrary } from '../core/clipboardLibrary.js';

/**
 * Session clipboard presentation and pointer-drop adapter. No clipboard entry
 * is changed by dragging; the drop callback receives the original immutable
 * mathematical snapshot. This module deliberately has no Engine imports.
 */
export function createClipboardPanelController({document, window, dom, equation,
  getLibrary, setLibrary, getArming, onApply, onStatus}) {
  let drag = null;
  let ghost = null;
  let disposed = false;
  function removeGhost() { ghost?.remove(); ghost=null; }
  function startPointer(event, entry) {
    if (disposed || event.button !== 0 || !getArming()) return;
    drag={pointerId:event.pointerId,entryId:entry.clipboardId,
      x:event.clientX,y:event.clientY,moved:false};
  }
  const onPointerMove = event=>{
    if(!drag || event.pointerId!==drag.pointerId) return;
    if (!getArming() || !getLibrary().entries.some(e=>e.clipboardId===drag.entryId)) { cancelDrag(); return; }
    if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>8){
      drag.moved=true;
      if(!ghost){
        ghost=document.createElement('div');
        ghost.className='clipboard-drag-ghost';
        const entry=getLibrary().entries.find(e=>e.clipboardId===drag.entryId);
        ghost.textContent=entry?expressionToDisplayString(entry.root):'';
        document.body.append(ghost);
      }
      ghost.style.left=`${event.clientX+14}px`;
      ghost.style.top=`${event.clientY+14}px`;
    }
    equation.classList.toggle('equality-drop-hover',drag.moved &&
      Boolean(document.elementFromPoint(event.clientX,event.clientY)?.closest('.equality-sign, .equality-root')));
  };
  const onPointerUp = event=>{
    const current=drag;
    if(!current || event.pointerId!==current.pointerId) return;
    cancelDrag();
    if(!current.moved || !getArming()) return;
    const target=document.elementFromPoint(event.clientX,event.clientY);
    const relation=target?.closest('.equality-root');
    if(!relation || relation.dataset.relationId!==getArming()?.relationId) return;
    // Specific subtree drops are reserved for future justified substitution.
    // Never silently reinterpret a rejected substitution as an equation action.
    if(target.closest('[data-node-id]') && !target.closest('.equality-sign')){
      onStatus('Subtree drop reserved for justified substitution; drop on = or equation background.');
      return;
    }
    const entry=getLibrary().entries.find(e=>e.clipboardId===current.entryId);
    onApply(entry);
  };
  const onPointerCancel = event => {
    if (drag && event?.pointerId != null && event.pointerId !== drag.pointerId) return;
    cancelDrag();
  };
  function cancelDrag() {
    drag = null;
    removeGhost();
    equation.classList.remove('equality-drop-hover');
  }
  // Global listeners are owned by this view controller and removable on dispose.
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('blur', cancelDrag);

  function render(){
    if (disposed) return;
    const library=getLibrary();
    // Removing/clearing the source during a drag invalidates the gesture.
    if (drag && !library.entries.some(e=>e.clipboardId===drag.entryId)) cancelDrag();
    dom.clipboardEntries.replaceChildren();
    dom.clipboardCount.textContent=String(library.entries.length);
    dom.clipboardClear.disabled=library.entries.length===0;
    if(!library.entries.length){
      const empty=document.createElement('p');
      empty.className='field-help';
      empty.textContent='No saved mathematical selections yet.';
      dom.clipboardEntries.append(empty);
      return;
    }
    for(const entry of library.entries){
      const row=document.createElement('div');
      row.className='clipboard-entry';
      row.setAttribute('role','listitem');
      const choose=document.createElement('button');
      choose.type='button';
      choose.className='button button--quiet button--small clipboard-draggable';
      choose.setAttribute('aria-pressed',String(entry.clipboardId===library.activeId));
      // textContent protects user-entered symbols against HTML injection.
      choose.textContent=expressionToDisplayString(entry.root);
      choose.title='Tap to select, or drag onto an armed equality';
      choose.addEventListener('pointerdown',event=>startPointer(event,entry));
      choose.addEventListener('click',()=>{
        setLibrary(selectClipboardEntry(getLibrary(),entry.clipboardId));render();
      });
      const remove=document.createElement('button');
      remove.type='button';
      remove.className='button button--quiet button--small';
      remove.textContent='Remove';
      remove.setAttribute('aria-label','Remove saved mathematical selection');
      remove.addEventListener('click',()=>{
        setLibrary(removeClipboardEntry(getLibrary(),entry.clipboardId));render();
      });
      row.append(choose,remove);
      dom.clipboardEntries.append(row);
    }
  }
  const onClear = () => {
    cancelDrag();
    setLibrary(clearClipboardLibrary()); render();
  };
  dom.clipboardClear.addEventListener('click', onClear);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelDrag();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    window.removeEventListener('blur', cancelDrag);
    dom.clipboardClear.removeEventListener('click', onClear);
  }
  return {render, cancelDrag, dispose};
}
