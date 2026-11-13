/* ========================================================================== *
 * Definition helpers (Engine stage E3)
 * ========================================================================== *
 * Design: Developer Documentation/06_Historical_Records/Superseded_2026-11-12/Engine_Standard_Design_Draft.md (decisions: 00_Current/Decisions.md)
 *
 * Types, operators and relations are DEFINITION OBJECTS (owner decision):
 * plain data, one folder each, exported from its index.js and listed once in
 * a registry file (js/definitions/types/types.js, js/definitions/operators/operators.js,
 * js/definitions/relations/relations.js). These helpers check a definition when it is
 * loaded, so a mistake fails at start-up with a clear message, and freeze it.
 * ========================================================================== */

/** The algebraic properties an operation can have on a type. */
const PROPERTIES = Object.freeze([
  'associative',   // (a∘b)∘c = a∘(b∘c): grouping does not matter
  'commutative',   // a∘b = b∘a: order does not matter
  'identity',      // an identity element e: a∘e = e∘a = a
  'inverses',      // every allowed element has an inverse: a∘a⁻¹ = e
  'distributive',  // this operation distributes over another: a(b+c) = ab+ac
]);
/** The properties a relation can have. */
const RELATION_PROPERTIES = Object.freeze(['reflexive', 'symmetric', 'transitive', 'irreflexive', 'antisymmetric']);

const fail = (kind, id, message) => { throw new TypeError(`${kind} definition "${id}": ${message}`); };
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const needsId = (kind, definition) => {
  // A plain word; a rule id may have dotted parts (sin.addition).
  if (!definition || typeof definition.id !== 'string' || !/^[A-Za-z][\w-]*(\.[\w-]+)*$/.test(definition.id)) {
    throw new TypeError(`${kind} definition needs an id (a plain word, or words joined by dots).`);
  }
};

/**
 * A type: what a kind of object is, and which structure each operation forms
 * on it. `operations.Add.properties` lists properties from PROPERTIES; an
 * identity or inverse names how it is written (identity: '0', inverse: 'Negate').
 */
export function defineType(definition) {
  needsId('Type', definition);
  const { id, operations } = definition;
  if (!operations || typeof operations !== 'object') fail('Type', id, 'needs operations');
  for (const [operation, structure] of Object.entries(operations)) {
    const properties = structure?.properties;
    if (!Array.isArray(properties)) fail('Type', id, `${operation} needs a properties list`);
    for (const property of properties) if (!PROPERTIES.includes(property)) fail('Type', id, `${operation}: unknown property ${property}`);
    if (properties.includes('identity') && structure.identity === undefined) fail('Type', id, `${operation} has an identity but does not name it`);
    if (properties.includes('inverses') && !structure.inverse) fail('Type', id, `${operation} has inverses but does not name the inverse operator`);
    if (properties.includes('distributive') && !Array.isArray(structure.distributesOver)) fail('Type', id, `${operation} is distributive but does not say over what`);
  }
  return deepFreeze({ ...definition });
}

/**
 * An operator: a symbol that builds expressions. `node` is the AST node type
 * it is stored as (null for one that is defined but not stored yet, such as
 * BinaryAdd). `notation` holds its rows for the notation table (notation.js).
 * `definedAs` says how a natural form is defined from an axiomatic one:
 * { sequentially: 'BinaryAdd', direction: 'left' } (owner decisions).
 */
export function defineOperator(definition) {
  needsId('Operator', definition);
  const { id, arity, definedAs } = definition;
  if (!(arity === 'many' || (Number.isInteger(arity) && arity >= 0))) fail('Operator', id, 'arity must be a whole number or "many"');
  if (definedAs && !(typeof definedAs.sequentially === 'string' && ['left', 'right'].includes(definedAs.direction))) {
    fail('Operator', id, 'definedAs needs { sequentially: <operator>, direction: "left" | "right" }');
  }
  return deepFreeze({ node: null, notation: {}, ...definition });
}

/**
 * A relation: a statement between two expressions. `bothSides` says what
 * applying one operation to both sides does: 'same' (the relation holds),
 * 'converse' (it flips), { assumes } (it holds under an assumption), or
 * { refuse } (it may not be done). Notation rows as for operators.
 */
export function defineRelation(definition) {
  needsId('Relation', definition);
  const { id, properties = [], bothSides = {} } = definition;
  for (const property of properties) if (!RELATION_PROPERTIES.includes(property)) fail('Relation', id, `unknown property ${property}`);
  for (const [operation, effect] of Object.entries(bothSides)) {
    // { bySign }: the effect depends on the sign of what is applied (stage E4c):
    // multiplying a < b by a positive keeps <, by zero gives =, by a negative flips it.
    const bySignOk = effect?.bySign && ['positive', 'zero', 'negative'].every(sign =>
      ['same', 'converse', 'equal'].includes(effect.bySign[sign]));
    const ok = effect === 'same' || effect === 'converse' || typeof effect?.assumes === 'string' ||
      typeof effect?.refuse === 'string' || bySignOk;
    if (!ok) fail('Relation', id, `bothSides.${operation} must be 'same', 'converse', { assumes }, { refuse } or { bySign }`);
  }
  return deepFreeze({ notation: {}, ...definition });
}

/**
 * An identity rule written as data (stage E4b; owner decision): two sides in
 * the typed notation, `lhs` and `rhs`, and the symbols that are variables
 * (each stands for any expression). `directions` says which ways it may be
 * used: 'expand' (lhs to rhs) and 'collapse' (rhs to lhs). The engine matches
 * and rebuilds (js/engine/patterns.js); no code is written per identity.
 * `interaction` names its gesture (js/definitions/interactions/); `requires` as for rules.
 */
export function defineIdentity(definition) {
  needsId('Identity', definition);
  const { id, label, lhs, rhs, variables, directions = ['expand', 'collapse'], interaction = 'activate' } = definition;
  if (typeof label !== 'string' || !label) fail('Identity', id, 'needs a label (what it says, for the student)');
  if (typeof lhs !== 'string' || !lhs || typeof rhs !== 'string' || !rhs) fail('Identity', id, 'needs lhs and rhs');
  if (!Array.isArray(variables) || variables.some(name => typeof name !== 'string' || !name)) fail('Identity', id, 'needs its variables, a list of names');
  if (!directions.length || directions.some(direction => !['expand', 'collapse'].includes(direction))) fail('Identity', id, 'directions are expand and/or collapse');
  return deepFreeze({ requires: [], ...definition, directions, interaction });
}

/**
 * An interaction (stage I1): a gesture a student can make. Rules name it in
 * their declarations (`kind`), and different rules and types share it.
 * `fields` says what a declaration of this gesture must or must not give:
 * { onto: 'required' | 'optional' | 'none', key: 'required' | 'none' }.
 * `recognisedBy` and `previewedBy` name the modules that do the work, and
 * every gesture commits through the one shared path (ctx.commitTransformation).
 */
export function defineInteraction(definition) {
  needsId('Interaction', definition);
  const { id, description, fields = {}, recognisedBy } = definition;
  if (typeof description !== 'string' || !description) fail('Interaction', id, 'needs a description');
  for (const [field, rule] of Object.entries(fields)) {
    const allowed = field === 'key' ? ['required', 'none'] : ['required', 'optional', 'none'];
    if (!['onto', 'key'].includes(field) || !allowed.includes(rule)) fail('Interaction', id, `fields.${field} cannot be ${rule}`);
  }
  if (!Array.isArray(recognisedBy) || recognisedBy.length === 0) fail('Interaction', id, 'must say which modules recognise it');
  return deepFreeze({ previewedBy: [], commitsThrough: 'ctx.commitTransformation', ...definition,
    fields: { onto: 'optional', key: 'none', ...fields } });
}

/** Check a registry list: definitions of one kind, with distinct ids. */
export function defineRegistry(kind, definitions) {
  const byId = new Map();
  for (const definition of definitions) {
    if (!definition?.id) throw new TypeError(`${kind} registry: an entry has no id.`);
    if (byId.has(definition.id)) throw new TypeError(`${kind} registry: "${definition.id}" is listed twice.`);
    byId.set(definition.id, definition);
  }
  return Object.freeze({ list: Object.freeze([...definitions]), get: id => byId.get(id) ?? null, has: id => byId.has(id) });
}
