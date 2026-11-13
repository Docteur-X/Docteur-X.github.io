import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../../js/engine/parser.js';
import { createStructureNavigationModel, navigateStructure } from '../../js/view/structureNavigation.js';

test('navigate nested mathematical groups by AST ancestry, not DOM nesting', () => {
  const nodes = createStructureNavigationModel(parseExpression('(((30)))'));
  assert.deepEqual(nodes.map(n => n.type), ['Group', 'Group', 'Group', 'Number']);
  let id = nodes[0].nodeId;
  for (let i=1;i<4;i++) { id = navigateStructure(nodes,id,'child'); assert.equal(id,nodes[i].nodeId); }
  assert.equal(navigateStructure(nodes,id,'child'),id);
  for (let i=2;i>=0;i--) { id=navigateStructure(nodes,id,'parent'); assert.equal(id,nodes[i].nodeId); }
  assert.equal(navigateStructure(nodes,id,'parent'),id);
});

test('siblings navigate in operand order, with no wraparound', () => {
  const nodes = createStructureNavigationModel(parseExpression('a+b+c'));
  const operands = nodes.filter(n => n.parentId === nodes[0].nodeId);
  assert.equal(operands.length,3);
  assert.equal(navigateStructure(nodes,operands[0].nodeId,'previous'),operands[0].nodeId);
  assert.equal(navigateStructure(nodes,operands[0].nodeId,'next'),operands[1].nodeId);
  assert.equal(navigateStructure(nodes,operands[2].nodeId,'next'),operands[2].nodeId);
});

test('navigation accepts natural multiplication and negation roots', () => {
  for (const expression of ['a(b+c)','-(a+b)']) {
    const nodes=createStructureNavigationModel(parseExpression(expression));
    assert.notEqual(nodes[0].type,'Add');
    assert.equal(navigateStructure(nodes,nodes[0].nodeId,'child'),nodes[1].nodeId);
  }
});
