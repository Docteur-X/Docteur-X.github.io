/**
 * The identity registry (stage E4b): every identity rule, listed once.
 * Adding an identity is one folder here (an index.js with defineIdentity)
 * and one line below: no code.
 */
import { defineRegistry } from '../../definitions/define.js';
import { identity as sinAddition } from './sin-addition/index.js';
import { identity as cosAddition } from './cos-addition/index.js';

export const IDENTITIES = defineRegistry('Identity', [sinAddition, cosAddition]);
