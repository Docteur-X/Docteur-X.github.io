/**
 * Exact companion to the screenshots, for stylesheet work.
 *
 * A screenshot tolerance must ignore edge noise, so it also misses small shade
 * changes. Computed styles have no such noise: they record what the browser
 * finally decided for every property of every element, so even a one-digit
 * colour change appears. Compare two captures with
 * scripts/compare-computed-styles.mjs.
 *
 * The capture is large, so it is written to a folder you choose and never stored
 * in the project.
 */
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Record every element and generated ::before/::after in the page's current state. */
export async function writeComputedStyles(page, folder, name) {
  const styles = await page.evaluate(async () => {
    // Finish transitions first, or a value could be captured halfway through one.
    for (const animation of document.getAnimations()) {
      try { animation.finish(); } catch { /* An endless animation cannot finish. */ }
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const read = (element, pseudo) => {
      const computed = getComputedStyle(element, pseudo);
      const values = {};
      for (const property of computed) values[property] = computed.getPropertyValue(property);
      return values;
    };
    const result = {};
    const visit = (element, path) => {
      if (element.tagName === 'SCRIPT' || element.tagName === 'HEAD') return;
      result[path] = read(element);
      for (const pseudo of ['::before', '::after']) {
        const content = getComputedStyle(element, pseudo).content;
        if (content !== 'none' && content !== 'normal') result[path + pseudo] = read(element, pseudo);
      }
      // Paths use position, not node IDs, which change from run to run.
      [...element.children].forEach((child, index) =>
        visit(child, `${path}>${child.tagName.toLowerCase()}[${index}]`));
    };
    visit(document.documentElement, 'html');
    return result;
  });
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, `${name}.json.gz`), gzipSync(JSON.stringify(styles)));
}
