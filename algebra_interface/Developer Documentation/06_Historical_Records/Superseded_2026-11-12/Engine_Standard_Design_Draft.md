# Engine standard: definition objects (design draft)

**Status: draft for owner review, 12 November 2026. Stages E1, E2, E3, I1, E4a, E4b and E4c are built (12 November 2026); E4d and E5 are not.** Items marked **Owner decision** are decided; items marked **Decide** are open. It puts into practice the natural and axiomatic layers of the [engine statements draft](../../02_Architecture/Engine_Statements_Draft.md), and the per-rule bundle pattern of stage 7 ([rebuild plan](Rebuild_Plan.md)).

## The problems it solves (owner, 12 November 2026)

1. The AST can't express general kinds of object (scalars, vectors, matrices, functions, tensors, group elements).
2. The Engine can't tell kinds of object apart, so every rule quietly assumes real numbers.
3. Notation and rules are written into the code. For example, the parser knows `+` and `−` by name, and many places test for an `Equal` parent.

**Requirement (owner):** a new rule, a new kind of object (for example a group) or a new function is added by writing **one definition** in its own folder and one line in a list. Nothing outside that folder is edited, the same test stage 7 used for rule bundles.

## Definition objects (owner decision)

Each definition is a plain object built by a `define…` helper that checks it, exported from its folder's `index.js`. It is data: it can be checked, listed and saved with a document. Literal JavaScript classes were considered; definition objects were chosen as the foundation.

| Kind | Describes | Examples | Registry |
|---|---|---|---|
| Type | What a kind of object is; which structure each operation forms on it | Scalar, Matrix(n×n), element of a group G | `js/definitions/types/types.js` |
| Operator | A symbol that builds expressions: arity, signature, notation, properties | `+`, `×`, `÷`, `sin`, `[ , ]`, `|x|`, `n!`, `ᵀ` | `js/definitions/operators/operators.js` |
| Relation | A statement between two expressions | `=`, `<`, `≤`, `≡ (mod n)`, `⊂` | `js/definitions/relations/relations.js` |
| Rule | A transformation: what it requires, what it produces, its interaction | swap, reorder, cancel inverses, sin addition | `js/rules/bundles.js` (exists) |
| Interaction | A gesture: how it is recognised and previewed | tap, drag onto, drag to reorder, drag across a relation | `js/definitions/interactions/interactions.js` |

Rules never touch the page; interactions know no algebra.

## Rules ask for properties; types provide them

A type declares, for each operation, the structure it forms. A rule declares the properties it needs. A rule is offered only where **all** of them hold, and otherwise it is refused with the missing property as the reason.

| Type | Operation | Structure |
|---|---|---|
| Scalar (real) | `+`, `×` | field: both commutative and associative, identities 0 and 1, inverses (÷ needs ≠ 0) |
| Matrix (n×n) | `×` | associative, identity I, **not commutative**, inverses only when invertible |
| Group element | `·` | associative, identity e, inverses; commutative only if abelian |
| Vector | `+`, scalar × vector | abelian group under `+`; vector space |

```js
// js/types/group-element/index.js (sketch)
export const type = defineType({
  id: 'group-element',
  declare: 'g, h ∈ G',
  operations: {
    Multiply: { properties: ['associative', 'identity', 'inverses'],
                identity: 'e',
                commutative: ({ group }) => group.abelian },
  },
  notation: { Multiply: { sign: '·' }, Invert: { style: 'superscript' } },  // g⁻¹
});
```

One `Invert` node serves both `÷b` (scalars, inside a product) and `g⁻¹` (group); only the notation comes from the type.

### Combined requirements and derived rules

Properties combine to give stronger rules (owner's example):

| Add has | Rule offered | Interaction | Example |
|---|---|---|---|
| commutative | swap two operands | drag to reorder | `a + b` → `b + a` |
| associative | regroup | drag a bracket | `(a + b) + c` → `a + (b + c)` |
| associative **and** commutative | reorder any term to any place | drag to reorder | `a + b + c` → `c + a + b` |

```js
export const rule = defineRule({
  id: 'reorder',
  requires: { operator: 'Add', properties: ['associative', 'commutative'] },
  derivedFrom: ['swap', 'regroup'],
  interaction: 'drag-reorder',          // the same gesture swap uses
});
```

`derivedFrom` feeds "show why" and "earn the shortcut" ([future features](../../05_Roadmap/Future_Features.md)):

```
a + b + c  =  (a + b) + c   Add means this
           =  c + (a + b)   swap
           =  (c + a) + b   regroup
           =  c + a + b     Add
```

**Every rule names an interaction, and different types share the same interaction** (owner decision). For example, drag to reorder serves `+` on scalars, `·` in an abelian group, and swap on two operands.

## Three forms of a binary operation (owner decision)

| Form | Written | Exists when | Meaning |
|---|---|---|---|
| `BinaryAdd` (the axiom) | `(a + b) + c`: nesting always shown with brackets | always | exactly two operands |
| `SequentiallyApply(BinaryAdd)` | `a + b + c` | always | applied from left to right: `(a + b) + c` |
| `Add` (what people mean by addition) | `a + b + c` | `+` is associative | many operands; grouping does not matter |

- **The names are owner decisions:** `BinaryAdd` for the axiom, `Add` for everyday addition, `SequentiallyApply` for the left-to-right form. Likewise `BinaryMultiply` and `Multiply`.
- **`SequentiallyApply` is generic:** one definition serves every binary operator. The node records which operator it applies and its **direction**. Its notation shows no brackets, but its meaning is fixed by the node itself, so no reading is hidden.
- **Direction (owner decision, 12 November 2026):** left to right by default (`a + b + c` means `(a + b) + c`); an operator may declare right to left, and powers do: `a^b^c` means `a^(b^c)`. For a right-to-left sequence, the real subexpression is the **rightmost** pair (`b^c`), so the "leftmost pair" entries in the table below become "rightmost pair".
- **Without associativity there is no `Add`.** The student writes `(a + b) + c`, or a `SequentiallyApply` reads `a + b + c` as left to right.
- **What each form allows:**

| Rule | `BinaryAdd` | `SequentiallyApply` | `Add` |
|---|---|---|---|
| act on a pair | the bracketed pair | only the leftmost pair (`a + b` in `a + b + c`), because only it is a real subexpression | any neighbouring run |
| regroup | if associative | refused (the order of application is the meaning) | not needed: grouping is free |
| swap | if commutative, within one pair | if commutative, the leftmost pair only | if also associative: reorder anything |
| convert | drop left-nested brackets → `SequentiallyApply` | unfold → `(a + b) + c`; if associative → `Add` | unfold (via "show why") |

The conversions are rules with interactions too (tap the brackets).

**Today's engine already is `Add`:** its `Add` and `Multiply` nodes hold lists, and the rearrangement rule assumes both properties without checking them. So the current node names stay and saved documents need no migration. What's new is that `BinaryAdd` and `SequentiallyApply` are added, and the rearrangement rule declares `['associative', 'commutative']`.

**Defined as, not stored as (owner question, 12 November 2026).** `Add` is *defined* as `BinaryAdd` applied from left to right (`definedAs: { sequentially: 'BinaryAdd', direction: 'left' }`), but it is *stored* as one node with a list of operands. Rules, rendering and evaluation work on the list, so ordinary steps cost the same as today; evaluating a left fold of `BinaryAdd` is the same loop over the list. The nested `BinaryAdd` form is built only on request: for "show why" (n − 1 binary nodes for n terms, for that expression only), in axiomatic mode, and when the test suite checks a derived rule's proof. Storing every sum as nested `BinaryAdd` was rejected: for n terms it means n − 1 nodes of depth n − 1, up to about 2(n − 1) steps to move one term to the front, and every rule searching through nesting to find the terms. The cost would be in code complexity more than in speed.

- **Opting out (owner decision, 12 November 2026):** each operator declares whether `SequentiallyApply` is allowed for it. An operator with no agreed reading declares it is not, and writing it without brackets is refused with "write the brackets". The first such case is the cross product: `a×b×c` for vectors is refused; `(a×b)×c` and `a×(b×c)` are accepted.

**Decide:**
- **When the axiomatic form is offered.** Recommended: a lesson setting ("axiomatic mode") in a later stage, not in E3.

## Functions: `sin(a+b)`

All functions use one node, `Apply { operator, arguments }`, which replaced `FunctionCall` in E1.

```js
export const operator = defineOperator({
  id: 'sin', arity: 1, signature: ['Scalar', 'Scalar'],
  notation: { style: 'function', name: 'sin' },
  properties: ['odd', { periodic: '2π' }],   // not 'linear'
});
```

Distribution requires `linear`. It therefore applies to the transpose, the trace and derivatives, and is refused for `sin(a+b)` with "sin is not linear".

### Identity rules as data

Most rules are an identity with pattern variables. An identity rule is written in the canonical text form, with no matching code:

```js
export const rule = defineIdentity({
  id: 'sin.addition',
  lhs: 'sin(a + b)',
  rhs: 'sin(a)·cos(b) + cos(a)·sin(b)',
  variables: { a: 'Scalar', b: 'Scalar' },
  directions: ['expand', 'collapse'],
  interaction: 'tap',
  // later: proof: [...]
});
```

Algorithmic rules (combining numbers, reordering) stay hand-written.

## Brackets: `[a, b]`

```js
export const operator = defineOperator({
  id: 'bracket', arity: 2, signature: ['L', 'L', 'L'],
  notation: { style: 'outfix', open: '[', separator: ',', close: ']' },
  properties: ['bilinear', 'antisymmetric', 'jacobi'],
});
```

| Property | Rule it unlocks | Example |
|---|---|---|
| antisymmetric | swap with a sign | `[a, b]` → `−[b, a]` |
| bilinear | distribute over `+` in either slot | `[a+b, c]` → `[a, c] + [b, c]` |
| jacobi | an identity rule | `[a,[b,c]] + [b,[c,a]] + [c,[a,b]] = 0` |

For matrices, the definition `[a, b] = ab − ba` is one more identity rule.

### Notation styles: the parser's and printer's table

| Style | Examples |
|---|---|
| infix | `a + b`, `a · b`, `g ∘ h` |
| prefix | `−a` |
| postfix or superscript | `n!`, `Aᵀ`, `g⁻¹` |
| outfix | `[a, b]`, `|x|`, `‖v‖` |
| function | `sin(x)`, `f(x, y)` |

Each operator registers its own rows; the parser has no operator written into it.

## Relations: `=`, `<`

Every relation has the same shape, two named sides `left` and `right`, and is marked in the node registry as a relation (`relation: 'equal'`). Code asks `isRelationNode(node)`, never `type === 'Equal'`, so the `sideTerm` field, dragging a whole side and the equation-side box work for every relation. **Built in E1, with one change from the first proposal:** each relation keeps its own stored type name (`Equal`, later `Less`) instead of one `Relation { relation }` node. Saved documents and their history fingerprints therefore stay unchanged, and the names match MathJSON's heads (`Equal`, `Less`). A single `Relation` node would have needed a migration that rewrites every saved history.

**Owner decision (12 November 2026): keep the separate `Equal` type.** Later, `=` gets the same three forms as addition, because equality is an equivalence relation (reflexive, symmetric, transitive):

| Form | Written | Meaning |
|---|---|---|
| `BinaryEqual` (the axiom) | `a = b` | exactly two sides |
| `Equal` (natural) | `a = b = c` | a chain: every neighbouring pair is equal, so by transitivity any two are |

As with `Add`, the natural chain is defined from the binary relation and stored as a list; a relation without transitivity (`≠`) cannot be chained. Today's `Equal` (two sides) is the two-sided case of the natural one. A relation states what happens when one operation is applied to both sides:

```js
export const relation = defineRelation({
  id: 'less', sign: '<', converse: 'greater',
  properties: ['transitive', 'irreflexive'],
  bothSides: {
    add:      { result: 'same' },
    multiply: { positive: 'same', negative: 'converse', zero: 'refuse', unknown: 'ask' },
    invert:   { refuse: 'not order-preserving in general' },
  },
});
```

For `=`, every operation keeps the relation, except dividing both sides, which records the assumption that the divisor is nonzero (the D3 mechanism). The both-sides rule becomes one rule that asks the relation; `<` with `×(−2)` flips to `>`.

## Interactions

1. **A rule using an existing gesture:** the rule names it in `interaction`. No interaction code is written (today's `declarations` already work this way).
2. **A new gesture:** one interaction definition with `recognise(parts, pointer)`, `preview(proposal)` and the shared commit path, added to the interactions list. The generic `rule-drop` of stage 7 is the first instance.

## What E1 built (12 November 2026)

- **`js/engine/nodeRegistry.js`**: one entry per node type, as data: category (`expression` or `statement`), the relation a statement states, where the children live (`none`, `single`, `list`, `named`), meaning fields (`Symbol.name`, `Apply.operator`), notation fields with their allowed values and default (`Multiply.displayStyle`, `Group.bracketStyle`). Helpers: `isRelationNode`, `categoryOf`, `childEntries`, `childrenOf`, `childList`, `mapChildrenInPlace`, `replaceChildAt`.
- **Through the registry now:** tree walking, normalisation, `replaceNodeAtLocation`, node ID reservation, structural equality, the document invariants, the category checks, the division invariant, the semantic container map, the renderer's relation check, the drag source checks, the `sideTerm` field and identity insertion.
- **`js/engine/canonicalText.js`**: `toCanonicalText(node, { notation })` and `fromCanonicalText(text)`, written from the registry alone:

| Typed | Canonical text | With `{ notation: true }` |
|---|---|---|
| `a÷b` | `Multiply(a, Invert(b))` | `Multiply[displayStyle=implicit](a, Invert(b))` |
| `2x-3=y` | `Equal(Add(Multiply(2, x), Negate(3)), y)` | (the same, plus `displayStyle`) |
| `[a+b]c` | `Multiply(Group(Add(a, b)), c)` | `Multiply[displayStyle=implicit](Group[bracketStyle=square](Add(a, b)), c)` |
| `sin(x)` (built, not yet typed) | `Apply[operator=sin](../../02_Architecture/x)` | (the same) |

- **`Apply { operator, arguments }`** replaced `FunctionCall`, which nothing could produce (the parser does not read functions until E2).
- **Structural equality** now compares relations too: `2x = y` equals `2·x = y`. Before, two equations never compared equal.
- **Tests:** `tests/engine/node-registry.test.js`: every expression type has a renderer spec and operator metadata; canonical text round-trips 22 expressions exactly; refusals; every child slot is reached; and a guard that fails if a module outside the `=` rules compares a node type with `'Equal'`, or if `FunctionCall` comes back.
- **Still named directly, on purpose:** the `=` rules (`js/rules/equality/`, `js/rules/both-sides/`, `js/relations/`) are about `=` itself until E4 generalises them; the parser and printer are rewritten in E2; numeric evaluation and MathJSON move to operator definitions in E3.

## What E2 built (12 November 2026)

- **`js/engine/notation.js`, the notation table.** Every written sign is a row:
  - **infix levels**, lowest first, each building one node type: `+` and `-` for `Add` (`-` turns its operand into `Negate`); `×`, `* · ⋅` and `÷ /` for `Multiply` (`÷` turns its operand into `Invert`). The first explicit sign decides the product's `displayStyle`;
  - **juxtaposition** as a row of the product level, with its three rules (`2x`, `a b`, `(a+b)c` multiply; `ab` is one name) and the refusal of `6÷2x`;
  - **prefix** `+` and `-` (a minus before a number makes a negative number);
  - **outfix** `( )`, `[ ]`, `{ }` for `Group`;
  - **relations**: `=` for `Equal`;
  - **reserved** `|`, `<`, `>`;
  - **print rows** for every node type (leaf, infix, prefix, outfix, function, relation), in both modes (editable input and display).

  Each row carries its own error messages.
- **`js/engine/parser.js` is generic.** It reads the table, and names no sign and no node type (a test checks this). Adding notation is adding a row.
- **Proof that nothing changed:** the parser before E2 is kept, frozen, as a test oracle (`tests/helpers/legacyParser.js`). `tests/engine/parser-equivalence.test.js` gives about 6,000 inputs to both (seeded random inputs plus hand-picked edge cases) and requires the same tree or the same error message for each. It runs with associativity on and off, and requires every tree to print identically in both modes. Deliberately breaking one message or one juxtaposition rule makes it fail. The oracle is to be deleted once E3 has settled.
- **Not yet:** function calls such as `sin(x)` are printed but not read (`a(b+c)` still means a times (b+c)). Reading them needs operator definitions, so it comes with E3. Postfix rows (`n!`, `Aᵀ`) wait for their operators.

## What E3 built (12 November 2026)

- **Definition objects, one folder each, listed once in a registry:**

| Kind | Folder | Defined now | Registry |
|---|---|---|---|
| Type | `js/definitions/types/<id>/` | `scalar`: under + and × a field; × distributes over + | `js/definitions/types/types.js` |
| Operator | `js/definitions/operators/<id>/` | `Add`, `Multiply`, `Negate`, `Invert`, `Group`; and `BinaryAdd`, `BinaryMultiply`, `SequentiallyApply` (defined, not stored yet) | `js/definitions/operators/operators.js` |
| Relation | `js/relations/<id>/` | `equal`: reflexive, symmetric, transitive; what each both-sides operation does | `js/definitions/relations/relations.js` |

- **`js/definitions/define.js`:** `defineType`, `defineOperator`, `defineRelation` and `defineRegistry`. They check a definition when it loads (an unknown property, an identity with no name, a bad arity, an id listed twice), then freeze it.
- **Notation lives in its definition.** Each operator holds its own notation rows (infix level, prefix signs, brackets, print row) and its precedence; `=` holds its row. `js/engine/notation.js` only assembles them, and precedence for automatic brackets is read from the same definitions. The parser oracle from E2 still passes unchanged.
- **Properties come from the type.** `js/engine/structures.js` answers `hasProperty('Add', 'commutative')` from the scalar definition. The old flags in `js/engine/operations/addition.js` and `multiplication.js` now ask it, and their setters became a lesson override (`setPropertyOverride`), which axiomatic mode will use.
- **Rules declare what they need,** in `requires`, and the coordinator offers a rule only where `requirementsMet` holds:

| Rule | Requires |
|---|---|
| `addition.rearrange`, `multiplication.rearrange` | the operation is commutative (a list with more than two terms exists only where it is associative) |
| `addition.cancel-opposites` | + has inverses |
| `multiplication.cancel-inverses` | × has inverses |
| `multiplication.distribute`, `factorisation.left/right` | × is distributive |
| `negation.expand/compress` (−b = (−1)·b) | + has inverses, × has an identity |
| `equality.add-opposite` | = allows adding to both sides; + has inverses |
| `equality.apply-function` | = allows applying to both sides |
| `identity.introduce`, `grouping.range`, numeric combination | named exceptions: the operation is chosen per action, so the Engine function asks the type itself |

- **Tests (`tests/definitions/definitions.test.js`):** definitions refuse mistakes; every property is read from the scalar type; every stored operator node has a definition, and the notation table is assembled from them; every rule declares `requires` or is a named exception; switching a required property off makes the coordinator refuse that rule.
- **Not in E3:** reading `sin(x)` as a function call. It changes how `sin(x)` is read today (the symbol `sin` times `x`), and it depends on the open decision about `sin x` without brackets. Refusal messages that name the missing property ("+ is not commutative here") need the interaction definitions (I1).

## What I1 built (12 November 2026)

- **Interaction definitions:** one folder per gesture in `js/definitions/interactions/`, and a registry, `js/definitions/interactions/interactions.js`. There are six gestures: `activate`, `drag` (onto), `drag-between`, `drop-tool`, `command` and `key`. Each definition gives:
  - a description;
  - the declaration fields it needs (`onto` required or not allowed; `key` required);
  - the modules that recognise and preview it;
  - the shared commit path (`ctx.commitTransformation`).

  `defineInteraction` checks it. The input router reads its gesture kinds from the registry and checks each declaration against the gesture's fields; a key gesture needing its key is no longer written into the router. Gestures are shared: `drag` serves five rules, and `drag-between` serves both reorder rules.
- **Presentation in the operator definitions:** `Add` and `Multiply` describe how they are drawn and handled as a row of terms (`presentation.sequence`: container and term classes, labels, the operator class, the combine label, and whether the signs have written forms). The ÷ factor's "draws its own sign inside" comes from `Invert`'s print row. `js/definitions/operators/presentation.js` answers `sequenceOf`, `isTermSequence` and `signDrawnInside`. The renderer, hit testing, drag feedback, the reorder preview, the drag controller, the insertion boundary, the identity request and `partFromElement` ask it instead of naming `Add` or `Multiply`. The reorder preview finds a ÷ factor by the renderer's `data-sign-inside` mark instead of its inner class. Distribution targets are found where the operation is distributive (`hasProperty`), not where it is called `Multiply`.
- **Tests (`tests/definitions/interactions.test.js`):** interaction definitions refuse mistakes; the router's kinds are the definitions, and every module they name exists; every rule declaration names a registered gesture and gives the fields it needs; the sum and product presentation is complete; and a guard fails if code on the interaction side names a node type. The renderer's per-type table, `nodeSpecs.js`, is the only exception.
- **Not moved:** the recognising code itself stays where it was (the ordinary drag pipeline serves `drag` and `drag-between` together). The definitions point to it. A new gesture is a new folder, plus its recognising code in that folder.

## What E4a and E4b built (12 November 2026)

- **E4a, defined functions.** `\sin`, `\cos`, `\tan`, `\ln` and `\exp` are operator definitions, one folder each in `js/definitions/operators/` (`kind: 'function'`, stored as `Apply`). The parser reads `\name(…)` from the definitions' `notation.function` rows. Brackets are always required: `\sin x` is refused with "Write the brackets". An unknown name lists the defined ones. `sin(x)` without the backslash keeps its old meaning. A function after a divisor with no space is refused, like `6÷2x`. Editable text writes the backslash, so it reads back; history labels do not. The renderer draws the name upright, as the function's operator (an activation target), with each argument in its own box inside the function's brackets. The node registry marks `Group` and `Apply` as having their own brackets (`ownBrackets`), so no automatic brackets are added inside them.
- **E4b, identity rules as data.** `defineIdentity({ id, label, lhs, rhs, variables, directions, interaction })` checks an identity; `js/engine/patterns.js` matches one side (variables bind any expression; a repeated variable must match the same expression; no hidden commutativity or regrouping) and rebuilds the other. The first use of a bound expression keeps its node IDs, and copies get fresh ones. One bundle, `js/rules/identities/`, serves every identity: one registry entry each, one `activate` declaration per direction, one install and one preview. Defined now: `sin.addition` and `cos.addition`, each a folder with no code. Tap the name of `sin(x+y)` to preview its expansion (new parts amber), then Confirm. Tap the `+` of the expanded sum to collapse it back. Escape or a click elsewhere cancels.
- **Patterns take their own IDs.** An identity's sides are parsed with `pattern-n` node IDs (`buildPattern`), so defining identities never changes the IDs documents receive (Known Issues, lesson 14).
- **Pressing an operator where an identity applies no longer starts a drag** (the function name always; a `+` only where an identity applies), so the tap arrives. Elsewhere, pressing an operator behaves as before.
- **Tests:** `tests/engine/functions.test.js`, `tests/rules/identities/identity-rules.test.js`, `e2e/engine/functions.spec.js` (drawing, refusal, expand then collapse in the browser, Escape), and a unique-route-name check. `e2e/view/route-order.json` gains the five identity-rule routes at the end of the rules' block; every existing route keeps its place.
- **Not yet:** constants such as `\pi`; functions of several arguments (a comma inside the brackets); matching up to commutativity (`sin(b+a)` does not match `sin(a+b)` until the student reorders).

## What E4c built (12 November 2026)

- **`<` and `>` are relation definitions, one folder each** (`js/definitions/relations/less/`, `js/definitions/relations/greater/`). Each gives its node type (`Less`, `Greater`), its converse, its spoken name ("is less than"), its properties (transitive, irreflexive), its notation row and messages, and what doing the same to both sides does:
  - adding keeps it;
  - multiplying depends on the sign (`{ bySign: { positive: 'same', zero: 'equal', negative: 'converse' } }`);
  - dividing or applying a function is refused.
- **No edit outside the folder,** apart from the registry line, which is the test of E4c. Relations register the node they are stored as (`registerRelationNode`, called by `js/definitions/relations/relations.js`). `<` and `>` stop being reserved signs, because a sign a relation uses is never reserved. MathJSON gives any relation its head (`Less`, `Greater`). The renderer draws each relation's own sign and spoken name. A test checks that `Less` and `Greater` are named only in their own folders.
- **One both-sides rule for every relation:** its requirement is `{ relation: 'acted-on', bothSides: 'add' }`, the relation the statement states, and its engine keeps the statement's own type. Dragging 2 across `<` in `x+2<5` gives `x+2+−2 < 5+−2`.
- **Until E4d,** the `=` operation menu (add, multiply, divide, apply to both sides) is mounted only on equations, because its operations are not yet defined for inequalities.
- **Tests:** `tests/definitions/relations.test.js` and `e2e/engine/inequalities.spec.js`. The parser oracle skips inputs with `<` or `>`, since those were deliberately changed from reserved to relations.

## Stages

**Owner decision (12 November 2026):** stage I1 is added after E3. The Engine stages already replace some hard-coded node names in interaction and view code (E1: `'Equal'`; E3: `'Add'`, `'Multiply'`), with no change in behaviour; I1 completes the interaction side.

| Stage | Work | Test of success |
|---|---|---|
| E1 **(done)** | Node registry and canonical text form; `Apply` replaces `FunctionCall`; relations recognised through the registry | rendered output and saved files unchanged |
| E2 **(done)** | Table-driven parser and printer for the five notation styles | every existing input parses to the same tree |
| E3 **(done)** | Type, operator and relation definitions; scalars and `=` become the first ones; rules declare requirements; `BinaryAdd` and `SequentiallyApply` added | no behaviour change for current documents |
| I1 **(done)** | Interaction definitions: today's gestures (tap, drag onto, drag to reorder, drag across a relation) each become a definition in `js/definitions/interactions/` with `recognise`, `preview` and the shared commit path; each rule names its gesture there; interaction and view code ask the registry instead of naming node types (`'Equal'`, `'Add'`, `'Multiply'`, the ÷ box) | behaviour, browser tests and screenshots unchanged; a new gesture needs no edit outside its folder |
| E4 | Identity rules as data (`sin.addition`); the generic both-sides rule; `<` added as one folder | `<` needs no edit outside its folder |
| E5 | A second type (group or matrices) as one folder | no edit outside its folder |

## Owner decisions for E4 (12 November 2026)

- **Functions:** typed `\sin(x)`, brackets always (decision 1 below).
- **Identities as data** (decision 3 below).
- **Multiplying both sides of an inequality by an expression whose sign is unknown: ask the student.** The choice is c > 0 (the relation is kept), c = 0 (it becomes the equality c·a = c·b) or c < 0 (it flips). The answer is recorded as the step's assumption, as `b ≠ 0` is.
- **Later, statements split into cases** (owner's design). When the AST can represent statements, multiplying a < b by c gives all three cases in one statement, instead of asking:

```
If (c > 0) { c·a < c·b }
If (c = 0) { c·a = c·b }
If (c < 0) { c·a > c·b }
```

  The same applies to a ÷ b (b = 0 or not), square roots and logarithms (the sign of the argument), and so on.
- **Later, undefined values stay in the expression** (owner's design). An undefined result such as ÷0 is kept rather than refused. Well-defined subtrees keep combining around it, but the undefined object itself stops being a scalar: it can no longer combine or interact with anything. This belongs to the type system (an "undefined" type).

## Open decisions (Decide)

1. ~~`sin x` without brackets.~~ **Owner decision (12 November 2026):** a defined function is typed with a backslash, and its brackets are always written: `\sin(x)`. `\sin x` is refused ("write the brackets"); `sin(x)` without the backslash keeps its old meaning (the symbol sin times x).
2. ~~One `Relation` node for every relation, or one node type each.~~ Settled in E1: one stored type per relation, all marked as relations in the registry (see Relations).
3. ~~Identity rules as data, or every rule hand-written.~~ **Owner decision (12 November 2026): identities as data.**
4. When axiomatic mode is offered (above). (Decided: direction, left to right by default and right to left for powers; operators may opt out, and `a×b×c` for vectors is refused.)
5. The second type for E5: a group or matrices.
6. Where types are declared: a declarations panel, a line such as `g, h ∈ G`, or both.
7. The canonical text form: `Multiply(a, Invert(b))` (recommended) or JSON.
