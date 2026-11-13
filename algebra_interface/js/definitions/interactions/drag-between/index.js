/**
 * Interaction: Drag between (drag-between). Stage I1.
 * Drag a term into a gap between two others, to reorder a sum or a product.
 * Used by: addition.rearrange and multiplication.rearrange (one gesture, two operations).
 */
import { defineInteraction } from '../../define.js';

export const interaction = defineInteraction({
  id: 'drag-between',
  description: 'Drag a term into a gap between two others, to reorder a sum or a product.',
  fields: { onto: 'none' },
  recognisedBy: ['js/view/drag/ordinaryDragView.js', 'js/view/drag/hitTesting.js'],
  previewedBy: ['js/view/drag/rearrangementPreview.js'],
});
