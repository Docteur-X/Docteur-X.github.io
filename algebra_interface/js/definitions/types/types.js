/**
 * The type registry: every type, listed once (Engine stage E3).
 * Adding a type is one folder in js/definitions/types/ and one line here.
 */
import { defineRegistry } from '../define.js';
import { type as scalar } from './scalar/index.js';

export const TYPES = defineRegistry('Type', [scalar]);
/** The type of anything not declared otherwise (owner decision: scalars). */
export const DEFAULT_TYPE = 'scalar';
