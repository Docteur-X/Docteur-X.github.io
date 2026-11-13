// Stage I1: gestures are interaction definitions (js/definitions/interactions/); rules name
// them, and several rules and types share one. Interaction-side code asks the
// operator definitions (js/definitions/operators/presentation.js) instead of naming types.
// Design: Developer Documentation/06_Historical_Records/Superseded_2026-11-12/Engine_Standard_Design_Draft.md (decisions: 00_Current/Decisions.md)
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { defineInteraction } from '../../js/definitions/define.js';
import { INTERACTIONS } from '../../js/definitions/interactions/interactions.js';
import { GESTURE_DECLARATIONS } from '../../js/app/gestureDeclarations.js';
import { GESTURE_KINDS } from '../../js/view/inputRouter.js';
import { OPERATORS } from '../../js/definitions/operators/operators.js';
import { sequenceOf, isTermSequence, signDrawnInside } from '../../js/definitions/operators/presentation.js';
import { parseExpression } from '../../js/engine/parser.js';

test('interaction definitions refuse a mistaken definition', () => {
  assert.throws(() => defineInteraction({ id: 'pinch', recognisedBy: ['x'] }), /description/);
  assert.throws(() => defineInteraction({ id: 'pinch', description: 'Pinch', fields: { onto: 'maybe' }, recognisedBy: ['x'] }), /fields.onto/);
  assert.throws(() => defineInteraction({ id: 'pinch', description: 'Pinch', fields: { key: 'optional' }, recognisedBy: ['x'] }), /fields.key/);
  assert.throws(() => defineInteraction({ id: 'pinch', description: 'Pinch' }), /recognise/);
  const pinch = defineInteraction({ id: 'pinch', description: 'Pinch two terms together', recognisedBy: ['js/x.js'] });
  assert.deepEqual(pinch.fields, { onto: 'optional', key: 'none' });
  assert.equal(pinch.commitsThrough, 'ctx.commitTransformation');
});

test('the router\'s gesture kinds are the interaction definitions, and every module they name exists', () => {
  assert.deepEqual([...GESTURE_KINDS].sort(), ['activate', 'command', 'drag', 'drag-between', 'drop-tool', 'key']);
  for (const interaction of INTERACTIONS.list) {
    for (const path of [...interaction.recognisedBy, ...interaction.previewedBy].filter(path => path.startsWith('js/'))) {
      assert.ok(existsSync(new URL(`../../${path}`, import.meta.url)), `${interaction.id}: ${path}`);
    }
  }
});

test('every rule declaration names a registered interaction and gives the fields it needs', () => {
  for (const declaration of GESTURE_DECLARATIONS) {
    const interaction = INTERACTIONS.get(declaration.kind);
    assert.ok(interaction, `${declaration.ruleId}: ${declaration.kind}`);
    if (interaction.fields.onto === 'required') assert.ok(declaration.onto, `${declaration.ruleId} needs onto`);
    if (interaction.fields.onto === 'none') assert.equal(declaration.onto, undefined, `${declaration.ruleId} takes no onto`);
    if (interaction.fields.key === 'required') assert.ok(declaration.key, `${declaration.ruleId} needs a key`);
  }
  // Gestures are shared: one drag serves many rules (owner decision).
  const rulesUsing = kind => new Set(GESTURE_DECLARATIONS.filter(d => d.kind === kind).map(d => d.ruleId)).size;
  assert.ok(rulesUsing('drag') >= 5);
  assert.ok(rulesUsing('drag-between') >= 2);
});

test('sums and products describe their own presentation; a ÷ factor draws its sign inside', () => {
  const fields = ['role', 'containerClass', 'containerLabel', 'termClass', 'termLabel', 'operatorClass', 'combineLabel'];
  const sequences = OPERATORS.list.filter(operator => operator.presentation?.sequence);
  assert.deepEqual(sequences.map(operator => operator.node).sort(), ['Add', 'Multiply']);
  for (const operator of sequences) for (const field of fields) assert.ok(operator.presentation.sequence[field], `${operator.id} ${field}`);
  const product = parseExpression('a÷b');
  assert.ok(isTermSequence(product) && sequenceOf(product).signStyles);
  assert.ok(signDrawnInside(product.operands[1], product));
  assert.ok(!signDrawnInside(product.operands[0], product));
  assert.ok(!isTermSequence(parseExpression('-a')));
});

// Prevention (I1): code on the interaction side asks the definitions; it does
// not name node types. The renderer's per-type table (nodeSpecs.js) is where
// each type's drawing lives, so it is the one place allowed to.
const INTERACTION_SIDE = ['interaction', 'view', 'input', 'ui', 'composition', 'manipulator', 'workspace', 'rendering', 'interactions'];
const ALLOWED = new Set(['js/view/rendering/nodeSpecs.js']);
function jsFiles(dir) {
  if (!existsSync(new URL(`../../${dir}/`, import.meta.url))) return [];
  return readdirSync(new URL(`../../${dir}/`, import.meta.url), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? jsFiles(`${dir}/${entry.name}`) : entry.name.endsWith('.js') ? [`${dir}/${entry.name}`] : []);
}
test('interaction-side code names no node type (it asks the operator and node registries)', () => {
  const offenders = [];
  for (const file of INTERACTION_SIDE.flatMap(dir => jsFiles(`js/${dir}`)).filter(file => !ALLOWED.has(file))) {
    const code = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');
    const names = code.match(/['"](Add|Multiply|Negate|Invert|Group|Equal|Apply|Number|Symbol)['"]|invert-content/g);
    if (names) offenders.push(`${file}: ${[...new Set(names)].join(', ')}`);
  }
  assert.deepEqual(offenders, []);
});
