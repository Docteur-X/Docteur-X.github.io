/**
 * Interaction: Drop a tool (drop-tool). Stage I1.
 * Drag a tool from the palette (such as +0 or ×1) and drop it on a part.
 * Used by: identity.introduce.
 */
import { defineInteraction } from '../../define.js';

export const interaction = defineInteraction({
  id: 'drop-tool',
  description: 'Drag a tool from the palette (such as +0 or ×1) and drop it on a part.',
  fields: { onto: 'none' },
  recognisedBy: ['js/rules/identity-element/install.js'],
  previewedBy: ['js/rules/identity-element/toolPreview.js'],
});
