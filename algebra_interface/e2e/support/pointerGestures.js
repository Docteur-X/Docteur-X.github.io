/** Real pointer gestures, using *viewport* geometry measured after scrolling.
 * Do not use HTML drag-and-drop: the Manipulator listens to pointer events. */
export async function positionPair(page, source, target) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  // Align the union of both elements within the viewport when possible.
  // Evaluate with actual element handles, not generated IDs or CSS selectors.
  const sourceHandle = await source.elementHandle();
  const targetHandle = await target.elementHandle();
  if (!sourceHandle || !targetHandle) throw new Error('Missing drag element');
  await page.evaluate(([a, b]) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    const top = Math.min(ar.top, br.top);
    const bottom = Math.max(ar.bottom, br.bottom);
    if (bottom - top < window.innerHeight - 24) {
      window.scrollBy(0, (top + bottom) / 2 - window.innerHeight / 2);
    }
  }, [sourceHandle, targetHandle]);
  const a = await source.boundingBox();
  const b = await target.boundingBox();
  if (!a || !b) throw new Error('Drag source or target is not visible');
  const inside = r => r.y >= 0 && r.y + r.height <= page.viewportSize().height &&
    r.x >= 0 && r.x + r.width <= page.viewportSize().width;
  if (!inside(a) || !inside(b)) {
    throw new Error(`Source and target not simultaneously visible: ${JSON.stringify({ a, b, viewport: page.viewportSize() })}`);
  }
  return { a, b };
}

export async function beginPointerDrag(page, source, target) {
  const { a, b } = await positionPair(page, source, target);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  return { sourceBox: a, targetBox: b };
}

export async function movePointerTo(page, box, side = 'center') {
  const fraction = side === 'left' ? 0.25 : side === 'right' ? 0.75 : 0.5;
  await page.mouse.move(box.x + box.width * fraction, box.y + box.height / 2, { steps: 12 });
}

export async function dragPointer(page, source, target, side = 'center') {
  const { targetBox } = await beginPointerDrag(page, source, target);
  await movePointerTo(page, targetBox, side);
  await page.mouse.up();
}
