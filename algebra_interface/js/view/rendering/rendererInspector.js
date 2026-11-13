/**
 * Opt-in, read-only renderer inspector for developers and educational review.
 * Enabled only by ?rendererInspector=1. It does not intercept clicks, mutate
 * mathematical state, or affect normal hit-testing/drag operations.
 * The panel lives outside the equation so its geometry cannot move hitboxes.
 */
import { mapMathematicalOccurrences } from './semanticContainerMap.js';
import { createSemanticTargetResolver } from './semanticTargetResolver.js';

export function createRendererInspector(view, getRoot, semanticTargetResolver) {
  const resolver = semanticTargetResolver ?? createSemanticTargetResolver({
    view, getRoot, getMathematicalObjectId: () => 'standalone',
  });
  if (new URLSearchParams(window.location.search).get('rendererInspector') !== '1') {
    return { refresh() {}, dispose() {} };
  }
  const panel = document.createElement('aside');
  panel.dataset.testid = 'renderer-inspector';
  panel.setAttribute('aria-label', 'Renderer semantic container inspector');
  Object.assign(panel.style, {
    position: 'fixed', right: '12px', bottom: '12px', zIndex: '10000',
    maxWidth: '380px', maxHeight: '45vh', overflow: 'auto', padding: '12px',
    border: '1px solid #8290a8', borderRadius: '8px',
    background: 'Canvas', color: 'CanvasText', font: '12px/1.5 monospace',
    boxShadow: '0 4px 16px #0003'
  });
  const heading = document.createElement('strong');
  heading.textContent = 'Renderer Inspector (read-only)';
  const help = document.createElement('p');
  help.textContent = 'Choose an occurrence below to inspect its AST identity and rendered targets.';
  const picker = document.createElement('select');
  picker.setAttribute('aria-label', 'Mathematical occurrence');
  picker.style.maxWidth = '100%';
  const details = document.createElement('pre');
  details.style.whiteSpace = 'pre-wrap';
  const close = document.createElement('button');
  close.textContent = 'Close inspector';
  close.addEventListener('click', () => panel.remove());
  panel.append(heading, help, picker, details, close);
  document.body.append(panel);
  let mapped = [];
  function display() {
    const entry = mapped.find(item => item.nodeId === picker.value);
    details.textContent = entry ? JSON.stringify(entry, null, 2) : 'No occurrence selected';
  }
  picker.addEventListener('change', display);
  function refresh() {
    if (!panel.isConnected) return;
    const previous = picker.value;
    if (!semanticTargetResolver) resolver.refresh();
    mapped = getRoot() ? mapMathematicalOccurrences(getRoot()).map(entry => resolver.describe(entry.nodeId)) : [];
    picker.replaceChildren();
    mapped.forEach(entry => {
      const option = document.createElement('option');
      option.value = entry.nodeId;
      option.textContent = `${'  '.repeat(entry.depth)}${entry.type} (${entry.nodeId})`;
      picker.append(option);
    });
    if (mapped.some(entry => entry.nodeId === previous)) picker.value = previous;
    display();
  }
  return { refresh, dispose() { panel.remove(); } };
}
