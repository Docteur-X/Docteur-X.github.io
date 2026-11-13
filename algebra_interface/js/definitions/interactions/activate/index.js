/**
 * Interaction: Activate (activate). Stage I1.
 * Press or tap a part (or press Enter on it) to start a rule there, such as the = sign or a minus sign.
 * Used by: equality.apply-function (the = sign), negation.expand (a minus sign).
 */
import { defineInteraction } from '../../define.js';

export const interaction = defineInteraction({
  id: 'activate',
  description: 'Press or tap a part (or press Enter on it) to start a rule there, such as the = sign or a minus sign.',
  fields: { onto: 'none' },
  recognisedBy: ['js/view/inputRouter.js', 'the rules\' install.js routes'],
  previewedBy: ['js/steps/previewSessionHost.js'],
});
