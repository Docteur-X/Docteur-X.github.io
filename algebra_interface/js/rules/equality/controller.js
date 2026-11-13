/**
 * Owns the presentation lifecycle of an armed equality in ONE mathematical
 * view. No mathematical rule, clipboard storage or history mutation lives here.
 * The host supplies callbacks for proposal confirmation/cancellation.
 *
 * Future multiple-window support can create one controller per view. An
 * equality's arming state is intentionally transient and not serialized.
 *
 * Since stage 4 this file lives in the equality rule bundle:
 * - `render(root, options)` is supplied by the caller (the rule context), so
 *   the bundle never imports the renderer itself;
 * - with a `router`, its pointer and key handling are input-router routes
 *   (standard 2). Without one (standalone use, tests) it listens directly.
 * - the preview is the shared candidate preview (owner, 12 November 2026: one
 *   amber look for every preview), with the equality's one-line layout
 *   (css/previews.css, .equality-preview-math).
 */
import { createCandidatePreview } from '../../view/preview/candidatePreview.js';

export function createEqualityInteractionController({document, window, equation, getRoot,
  render, router = null, onApplySelected, onConfirm, onCancel, createFeedback, describe}) {
  let arming = null;
  let menu = null;
  let previewActive = false;
  const preview = createCandidatePreview({ name: 'equality', equation, renderCandidate: root => render(root),
    feedback: createFeedback(), describe, onConfirm, onCancel });
  let disposed = false;
  let question = null; // the sign question (E4d), when one is open
  const sign = () => equation.querySelector('.relation-root .relation-sign');
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
    preview.clear();
    previewActive = false;
    paintArming();
  }
  /** Show a candidate (its result's root, with its inserted operands amber). */
  function showPreview(candidate) {
    if (disposed) throw new Error("Cannot preview in a disposed equality view");
    if (previewActive) cancelPreview();
    preview.show(candidate);
    previewActive = true;
  }
  /**
   * Ask the student a question with a few answers (stage E4d: the sign of a
   * factor, when it decides what happens to an inequality). `choices` are
   * { value, label }; the controller knows no mathematics. Escape, Cancel or a
   * press outside dismisses it.
   */
  function closeQuestion() {
    question?.remove();
    question = null;
  }
  function ask({ prompt, choices, onChoose, onDismiss }) {
    closeQuestion();
    closeMenu();
    const panel = document.createElement('div');
    panel.className = 'relation-sign-question';
    panel.dataset.testid = 'relation-sign-question';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', prompt);
    const text = document.createElement('span');
    text.textContent = prompt;
    panel.append(text);
    const dismiss = () => { closeQuestion(); onDismiss?.(); };
    for (const { value, label } of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button button--small';
      button.dataset.signChoice = value;
      button.textContent = label;
      button.addEventListener('click', event => { event.stopPropagation(); closeQuestion(); onChoose(value); });
      panel.append(button);
    }
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'button button--quiet button--small';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', event => { event.stopPropagation(); dismiss(); });
    panel.append(cancel);
    panel.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    });
    question = panel;
    question.dismiss = dismiss;
    equation.insertAdjacentElement('afterend', panel);
    panel.querySelector('button')?.focus();
  }

  function mountOnRenderedEquation() {
    closeMenu();
    menu?.remove();
    menu = null;
    const relation = equation.querySelector('.relation-root');
    if (!relation) return;
    // Every relation (=, <, >) carries the menu since stage E4d; what each
    // operation does to it comes from the relation's definition.
    const trigger = relation.querySelector('.relation-sign');
    if (!trigger) return;
    trigger.setAttribute('role','button');
    trigger.setAttribute('tabindex','0');
    // Keep the relation's spoken name (the renderer's label: "equals", "is
    // less than") and say that it opens the menu.
    const spoken = (trigger.getAttribute('aria-label') ?? 'relation').replace(/: operation menu$/, '');
    trigger.setAttribute('aria-label', `${spoken}: operation menu`);
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
        !event.target.closest?.('.relation-sign')) closeMenu();
    if (question && !question.contains(event.target)) question.dismiss();
  };
  const onPreviewPointerDown = event => {
    if (!previewActive) return;
    // Pointerdown precedes click. Cancelling here used to detach the amber
    // confirmation target before its click could fire. The entire preview
    // subtree is a legitimate confirmation surface, not a click-away target.
    if (event.target.closest?.('[data-preview-confirm], [data-candidate-preview-actions]')) return;
    onCancel();
  };
  const onEscape = event => {
    if (event.key !== 'Escape' || !previewActive) return;
    // The equality preview owns this keypress. Its document-capture listener
    // runs before the application window fallback; allowing propagation would
    // make one Escape both dismiss the proposal and clear another interaction.
    // Consume only when an equality preview is active, leaving ordinary Escape
    // handling untouched after the preview has been dismissed.
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  };
  window.addEventListener('resize',positionMenu);
  window.addEventListener('scroll',positionMenu,true);
  if (router) {
    // The menu closes on any outside pointerdown, in any mode; the preview
    // routes run only while the equality preview holds the view.
    router.route({ name: 'equality-menu-outside', on: 'pointerdown', at: 'document-capture', modes: 'any', handle: onDocumentPointerDown });
    router.route({ name: 'equality-preview-outside', on: 'pointerdown', at: 'document-capture', modes: 'preview:equality', handle: onPreviewPointerDown });
    router.route({ name: 'equality-preview-escape', on: 'keydown', at: 'document-capture', modes: 'preview:equality', handle: onEscape });
  } else {
    document.addEventListener('pointerdown',onDocumentPointerDown,true);
    document.addEventListener('pointerdown',onPreviewPointerDown,true);
    document.addEventListener('keydown',onEscape,true);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelPreview();
    closeQuestion();
    closeMenu();
    menu?.remove();
    menu = null;
    arming = null;
    window.removeEventListener('resize',positionMenu);
    window.removeEventListener('scroll',positionMenu,true);
    if (!router) {
      document.removeEventListener('pointerdown',onDocumentPointerDown,true);
      document.removeEventListener('pointerdown',onPreviewPointerDown,true);
      document.removeEventListener('keydown',onEscape,true);
    }
  }
  return {get arming(){return arming;}, closeMenu, paintArming, cancelPreview,
    showPreview, mountOnRenderedEquation, ask, closeQuestion, dispose};
}
