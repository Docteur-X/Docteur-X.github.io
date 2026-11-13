/**
 * The operator registry: every operator, listed once (Engine stage E3).
 * Adding an operator is one folder in js/definitions/operators/ and one line here. The
 * notation table (js/engine/notation.js) is assembled from these definitions,
 * in this order; infix levels are ordered by precedence.
 */
import { defineRegistry } from '../define.js';
import { operator as add } from './add/index.js';
import { operator as multiply } from './multiply/index.js';
import { operator as negate } from './negate/index.js';
import { operator as invert } from './invert/index.js';
import { operator as group } from './group/index.js';
import { operator as binaryAdd } from './binary-add/index.js';
import { operator as binaryMultiply } from './binary-multiply/index.js';
import { operator as sequentiallyApply } from './sequentially-apply/index.js';
// Functions (stage E4): typed \sin(x), stored as Apply.
import { operator as sin } from './sin/index.js';
import { operator as cos } from './cos/index.js';
import { operator as tan } from './tan/index.js';
import { operator as ln } from './ln/index.js';
import { operator as exp } from './exp/index.js';

export const OPERATORS = defineRegistry('Operator',
  [add, multiply, negate, invert, group, binaryAdd, binaryMultiply, sequentiallyApply, sin, cos, tan, ln, exp]);
