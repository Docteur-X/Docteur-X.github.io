/**
 * Decorative distribution-arrow painter.
 *
 * This is a presentation-only adapter: it reads already-rendered hitboxes and
 * paints inert SVG curves. It must never mutate the AST, arbitrate a gesture,
 * acquire a preview lease, or install pointer handlers. The amber factor-copy
 * buttons remain the only confirmation targets.
 *
 * Calling repeatedly replaces the previous SVG; calling with no preview
 * clears it. This is also used on resize, when hitbox geometry changes without
 * an AST rerender.
 */
export function renderDistributionCurves({ equation, preview, document = globalThis.document }) {
  // Resize/layout changes invalidate old coordinates. Remove the previous
  // drawing before replacing it so we never accumulate overlapping arrows.
  equation.querySelector(".distribution-connections")?.remove();
  if (!preview) return;
  const source = [...equation.querySelectorAll("[data-node-id]")]
    .find((element) => element.dataset.nodeId === preview.sourceFactorId);
  const copies = [...equation.querySelectorAll(".distribution-preview__copy")];
  if (!source || copies.length === 0) return;
  const outer = equation.getBoundingClientRect();
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.classList.add("distribution-connections");
  svg.setAttribute("viewBox", `0 0 ${Math.max(outer.width, 1)} ${Math.max(outer.height, 1)}`);
  svg.setAttribute("aria-hidden", "true");
  const marker = document.createElementNS(svgNS, "marker");
  marker.setAttribute("id", "distribution-arrowhead");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("refX", "6");
  marker.setAttribute("refY", "3");
  marker.setAttribute("orient", "auto");
  const arrow = document.createElementNS(svgNS, "path");
  arrow.setAttribute("d", "M0,0 L6,3 L0,6 Z");
  arrow.setAttribute("fill", "currentColor");
  marker.append(arrow);
  const defs = document.createElementNS(svgNS, "defs");
  defs.append(marker);
  svg.append(defs);

  const sourceRect = source.getBoundingClientRect();
  const sourceX = sourceRect.left + sourceRect.width / 2 - outer.left;
  const sourceY = sourceRect.top - outer.top;
  copies.forEach((copy) => {
    const rect = copy.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - outer.left;
    const y = rect.top - outer.top;
    const apex = Math.max(10, Math.min(sourceY, y) - 56);
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M${sourceX},${sourceY - 4} C${sourceX},${apex} ${x},${apex} ${x},${y - 7}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2.5");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("marker-end", "url(#distribution-arrowhead)");
    svg.append(path);
  });
  equation.append(svg);
}

