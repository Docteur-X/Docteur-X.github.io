import { renderExpression } from '../rendering/domRenderer.js';

/**
 * Owns the presentation lifecycle of an armed equality in ONE mathematical
 * view. No mathematical rule, clipboard storage or history mutation lives here.
 * The host supplies callbacks for proposal confirmation/cancellation.
 *
 * Future multiple-window support can create one controller per view. An
 * equality's arming state is intentionally transient and not serialized.
 */
export function createEqualityInteractionController({document, window, equation, getRoot,
  onApplySelected, onConfirm, onCancel}) {
  let arming = null;
  let menu = null;
  let originalNodes = null;
  let actions = null;
  let previewActive = false;
  let disposed = false;
  const sign = () => equation.querySelector('.equality-root .equality-sign');
  function closeMenu() {
    if (menu) menu.hidden = true;
    sign()?.setAttribute('aria-expanded', 'false');
  }
  function positionMenu() {
    if (!menu || menu.hidden) return;
    const trigger = sign();
    if (!trigger) { closeMenu(); return; }
    const rect = trigger.getBoundingClientRect();
    const width = menu.offsetWidth, height = menu.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth-width-8, rect.left+(rect.width-width)/2));
    const above = rect.top >= height + 12;
    menu.style.left = `${left}px`;
    menu.style.top = `${above ? rect.top-height-6 : Math.min(window.innerHeight-height-8,rect.bottom+6)}px`;
  }
  function paintArming() {
    const trigger = sign();
    if (!trigger) return;
    const context = arming?.relationId === getRoot()?.id ? arming.context : null;
    trigger.dataset.armed = context || '';
    trigger.title = context ? `Armed: ${context}. Click to change.` : 'Click to arm an equality operation';
    const indicator = trigger.querySelector('.relation-armed-indicator');
    if (indicator) indicator.textContent = context ? ({'add-right':'+','multiply-left':'×L','multiply-right':'×R'}[context]) : '';
    menu?.querySelectorAll('[data-equality-context]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.equalityContext === context));
    });
  }
  function cancelPreview() {
    if (originalNodes) equation.replaceChildren(...originalNodes);
    originalNodes = null;
    actions?.remove();
    actions = null;
    previewActive = false;
    paintArming();
  }
  function showPreview(root, visualRoles, renderOptions = {}) {
    if (disposed) throw new Error("Cannot preview in a disposed equality view");
    if (previewActive) cancelPreview();
    const resultView = renderExpression(root, {...renderOptions, visualRoles});
    resultView.classList.add('equality-inline-preview');
    resultView.dataset.equalityPreview = 'true';
    resultView.addEventListener('click', event => {
      if (event.target.closest('[data-equality-preview-confirm]')) {
        event.stopPropagation(); onConfirm();
      }
    });
    originalNodes = [...equation.childNodes];
    equation.replaceChildren(resultView);
    actions = document.createElement('div');
    actions.className = 'equality-inline-actions';
    actions.innerHTML = `<span>Preview: amber terms are newly inserted.</span>
      <button type="button" class="button button--small" data-equality-preview-confirm>Confirm</button>
      <button type="button" class="button button--quiet button--small" data-equality-preview-cancel>Cancel</button>`;
    equation.insertAdjacentElement('afterend', actions);
    actions.querySelector('[data-equality-preview-confirm]').addEventListener('click', onConfirm);
    actions.querySelector('[data-equality-preview-cancel]').addEventListener('click', onCancel);
    previewActive = true;
  }
  function mountOnRenderedEquation() {
    closeMenu();
    menu?.remove();
    menu = null;
    const relation = equation.querySelector('.equality-root');
    if (!relation) return;
    const trigger = relation.querySelector('.equality-sign');
    if (!trigger) return;
    trigger.setAttribute('role','button');
    trigger.setAttribute('tabindex','0');
    trigger.setAttribute('aria-label','Equality operation menu');
    trigger.setAttribute('aria-expanded','false');
    const nextMenu = document.createElement('div');
    nextMenu.className='equality-operation-menu';
    nextMenu.hidden=true;
    nextMenu.setAttribute('role','group');
    nextMenu.setAttribute('aria-label','Arm an equality operation');
    for (const [context,label] of [
      ['add-right','+'],['subtract','−'],['multiply-left','c·'],
      ['multiply-right','·c'],['divide','÷'],['function','f(x)']
    ]) {
      const button=document.createElement('button');
      button.type='button';
      button.className='equality-operation-choice';
      button.dataset.equalityContext=context;
      button.textContent=label;
      button.title=({'add-right':'Add operand to both sides',
        'multiply-left':'Multiply operand on the left of both sides',
        'multiply-right':'Multiply operand on the right of both sides'}[context]) ||
        'Not yet supported by the mathematical engine';
      if (!['add-right','multiply-left','multiply-right'].includes(context)) button.disabled=true;
      button.addEventListener('click',event=>{
        event.stopPropagation();
        arming = arming?.relationId===getRoot()?.id && arming.context===context
          ? null : {relationId:getRoot().id,context};
        paintArming(); closeMenu();
      });
      button.setAttribute('aria-pressed','false');
      nextMenu.append(button);
    }
    const indicator=document.createElement('span');
    indicator.className='relation-armed-indicator';
    indicator.setAttribute('aria-hidden','true');
    trigger.append(indicator);
    document.body.append(nextMenu);
    menu = nextMenu;
    const toggle=()=>{menu.hidden=!menu.hidden; trigger.setAttribute('aria-expanded',String(!menu.hidden)); positionMenu();};
    trigger.addEventListener('click',toggle);
    trigger.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}
    });
    const use=document.createElement('button');
    use.type='button';
    use.className='equality-use-clipboard button button--quiet button--small';
    use.textContent='Use selected clipboard expression';
    use.addEventListener('click',onApplySelected);
    menu.append(use);
    paintArming();
  }
  // Named handlers allow deterministic teardown when a mathematical view is
  // unmounted. Anonymous global listeners would retain stale view references.
  const onDocumentPointerDown = event => {
    if (!menu?.hidden && !menu?.contains(event.target) &&
        !event.target.closest?.('.equality-sign')) closeMenu();
  };
  const onPreviewPointerDown = event => {
    if (!previewActive) return;
    // Pointerdown precedes click. Cancelling here used to detach the amber
    // confirmation target before its click could fire. The entire preview
    // subtree is a legitimate confirmation surface, not a click-away target.
    if (event.target.closest?.('[data-equality-preview-confirm], [data-equality-preview-cancel]')) return;
    onCancel();
  };
  const onEscape = event => {
    if (event.key === 'Escape' && previewActive) onCancel();
  };
  window.addEventListener('resize',positionMenu);
  window.addEventListener('scroll',positionMenu,true);
  document.addEventListener('pointerdown',onDocumentPointerDown,true);
  document.addEventListener('pointerdown',onPreviewPointerDown,true);
  document.addEventListener('keydown',onEscape,true);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelPreview();
    closeMenu();
    menu?.remove();
    menu = null;
    arming = null;
    window.removeEventListener('resize',positionMenu);
    window.removeEventListener('scroll',positionMenu,true);
    document.removeEventListener('pointerdown',onDocumentPointerDown,true);
    document.removeEventListener('pointerdown',onPreviewPointerDown,true);
    document.removeEventListener('keydown',onEscape,true);
  }
  return {get arming(){return arming;}, closeMenu, paintArming, cancelPreview,
    showPreview, mountOnRenderedEquation, dispose};
}
