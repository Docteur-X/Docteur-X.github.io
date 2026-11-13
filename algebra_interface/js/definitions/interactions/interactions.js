/**
 * The interaction registry: every gesture, listed once (stage I1).
 * A rule's declaration names one of these in `kind`; the input router checks
 * declarations against them. Adding a gesture is one folder in
 * js/definitions/interactions/ and one line here.
 */
import { defineRegistry } from '../define.js';
import { interaction as activate } from './activate/index.js';
import { interaction as drag } from './drag/index.js';
import { interaction as dragBetween } from './drag-between/index.js';
import { interaction as dropTool } from './drop-tool/index.js';
import { interaction as command } from './command/index.js';
import { interaction as key } from './key/index.js';

export const INTERACTIONS = defineRegistry('Interaction', [activate, drag, dragBetween, dropTool, command, key]);
