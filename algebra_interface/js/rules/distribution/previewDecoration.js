/**
 * Distribution's preview, drawn on the rendered tree (renderer standard,
 * rule 4: decoration happens after rendering). Until stage 5 the renderer
 * built this itself; now it only labels the parts, and this file finds them:
 *
 * - the sum's interior: data-hitbox-role="content" + data-parent-id = sumId.
 *   Its children are replaced by the amber preview: for a(b+c), the copies
 *   a·b + a·c, each copy a real <button> that confirms the whole expansion.
 *   The copies are NOT tree nodes and carry no node IDs.
 * - the source factor's box (data-node-id = sourceFactorId, in the product):
 *   marked is-distribution-source;
 * - the box in the product that contains the sum: is-distribution-target.
 *
 * Works on any element with .children, .dataset and .classList (real DOM or
 * the test stand-in). `operands` are the sum's addends (tree nodes, or plain
 * text in tests); `plan.source` is the copied factor. Both are written with
 * writeNotation, so letters keep the font set's letter face.
 */
import { writeNotation } from '../../view/rendering/notationText.js';
export function decorateDistributionPreview(tree, plan, operands) {
  if (!tree || !plan) return false;
  let sumContent = null;
  const boxesInProduct = [];
  const visit = (element, ancestors) => {
    const data = element.dataset ?? {};
    if (data.hitboxRole === 'content' && data.parentId === plan.sumId) sumContent = { element, ancestors };
    if (data.hitboxRole === 'occurrence' && data.parentId === plan.productId) boxesInProduct.push(element);
    for (const child of element.children ?? []) visit(child, [...ancestors, element]);
  };
  visit(tree, []);
  if (!sumContent) return false;

  for (const box of boxesInProduct) {
    if (box.dataset.nodeId === plan.sourceFactorId) box.classList.add('is-distribution-source');
    // The factor of the product whose box contains the sum's interior.
    if (sumContent.ancestors.includes(box)) box.classList.add('is-distribution-target');
  }

  const container = sumContent.element;
  container.classList.add('distribution-preview', `distribution-preview--${plan.direction}`);
  container.setAttribute('aria-label', 'Proposed distribution. Click any amber factor copy to expand; Escape or click elsewhere to cancel.');
  const items = [];
  operands.forEach((operand, index) => {
    if (index > 0) {
      // The sum's + signs, labelled with their owner like any operator.
      const plus = document.createElement('span');
      plus.setAttribute('aria-hidden', 'true');
      plus.dataset.hitboxRole = 'operator';
      plus.dataset.operatorOwnerId = plan.sumId;
      plus.className = 'plus';
      plus.dataset.sumId = plan.sumId;
      plus.textContent = '+';
      items.push(plus);
    }
    const item = document.createElement('span');
    item.className = 'distribution-preview__item';
    const product = document.createElement('span');
    product.className = 'distribution-preview__product';
    // The amber copy is the only confirmation control: a native button, so
    // Tab, Enter and Space work, and it is large enough to click or tap.
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'distribution-preview__copy';
    copy.dataset.previewConfirm = 'true'; // a confirmable preview copy (generic marker)
    copy.title = 'Apply the full distributive expansion';
    copy.setAttribute('aria-label', `Apply ${plan.direction} distribution (copy ${index + 1} of ${operands.length})`);
    // Text, never HTML; letters marked as the renderer marks them (T7).
    writeNotation(copy, plan.source ?? plan.sourceText);
    const original = document.createElement('span');
    original.className = 'distribution-preview__original';
    writeNotation(original, operand);
    const multiply = document.createElement('span');
    multiply.className = 'distribution-preview__multiplication';
    multiply.textContent = '·';
    if (plan.direction === 'left') product.append(copy, multiply, original);
    else product.append(original, multiply, copy);
    item.append(product);
    items.push(item);
  });
  if (typeof container.replaceChildren === 'function') container.replaceChildren(...items);
  else { container.children.length = 0; container.append(...items); }
  return true;
}
