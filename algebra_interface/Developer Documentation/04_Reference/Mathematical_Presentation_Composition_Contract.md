# Mathematical Presentation Composition Contract v1

**Status: accepted design contract; incremental implementation required.** Adopted 7 November 2026. **Scope:** mathematical AST-to-presentation composition, semantic targeting, structure navigation, visual feedback ownership, and future target proxies. **Not an assertion that all of these interfaces exist in code today.** The existing renderer, mathematical rules, history and persistence remain authoritative for currently implemented behaviour.

## Purpose and non-negotiable principle

The AST is the authoritative representation of the written mathematics. A mathematical presentation must faithfully express its structure and allow a student to deliberately address the meaning of its subexpressions, even when notation is visually compact. Students choose actions; the Mathematical Engine applies requested rules subject to their mathematical conditions. Presentation and access aids must not change mathematical truth or history.

**Nesting denotes mathematical scope and structural dependency, not necessarily chronological evaluation order.** In particular, n-ary associative `Add`/`Multiply` nodes do not imply a unique evaluation sequence. An explicit `Group` is a mathematical occurrence even if its brackets are redundant in scalar algebra.

## Vocabulary and identity

| Term | Definition | Example |
|---|---|---|
| Mathematical Object (MOb) | Document-owned mathematical entity with authoritative expression and history | One equation object |
| AST occurrence | One specific node in a mathematical representation, identified by its node ID | First `a` in `a+a` |
| Mathematical container | Semantic presentation boundary associated with an AST occurrence | `Add(b,c)` as a whole |
| Operator target | Addressable operator glyph/region owned by an AST occurrence; not automatically another AST node | The `+` owned by `Add(b,c)` |
| Layout container | Visual-only arrangement wrapper, with no independent mathematical identity | Spacing/alignment wrapper |
| Hitbox | Physical interaction region resolving to a semantic occurrence or operator target | Small `+` drop region |
| Target proxy | Optional external interaction handle to an existing occurrence/operator; never a new AST occurrence | Pinned `+` tile |
| Provenance | Relationship between a result and the rule/source occurrences that produced it | Two distributed copies from one factor |

**Do not conflate:** mathematical variable identity, AST occurrence identity, DOM element identity, proxy identity, and provenance. A node ID is an occurrence identifier, not a mathematical proof or a variable binding ID. Repeated symbols can share variable meaning but have distinct occurrence IDs.

## Rendering input and recursive composition

The current `js/view/rendering/domRenderer.js` entry point is `renderExpression(root, options = {})`: the `root` is a hierarchical AST, **not a flattened string**. Current options combine presentation and some legacy transient concerns; future separation is an architectural goal.

1. **Top-down context:** parent passes necessary notation context (precedence, grouping, position, presentation preferences, e.g. exponent/numerator context in future).
2. **Recursive child construction:** node-specific presentation rules request child presentations. Leaves use glyph/text primitives; compound nodes compose child presentations and operator glyphs.
3. **Bottom-up composition:** parent arranges completed children in a sequence, grouping or positioned layout. Browser CSS may perform physical measurement; do not mandate a custom layout engine.
4. **Semantic exposure:** record a stable mapping from each AST occurrence to a meaningful presentation container/target; separately expose operator targets. Extra DOM layout wrappers have no mathematical identity.
5. **Decoration:** transient feedback is applied to semantic targets without rewriting the AST or causing mathematical layout shifts.

A future presentation-specification registry may group `Number`, `Symbol`, `Add`, `Multiply`, `Group`, `Negate`, `Equal`, and later fraction/power/matrix specifications. **Do not create a separate JS/CSS file per node by default.** Specifications own notation/composition; shared CSS tokens and feedback infrastructure own appearance of semantic states. The Mathematical Engine alone owns rule applicability.

### Worked structures

- `Number(3)`: one atomic occurrence container containing numeric glyph(s).
- `Add(a,b,c)`: one meaningful `Add` container, three child occurrences and two plus operator targets owned by that `Add`; neither plus is automatically a separate AST node. Existing DOM may not yet expose the `Add` container as an independently selectable hitbox.
- `Group(Group(Number(3)))`: three nested mathematical occurrences, each separately addressable; explicit brackets belong to their `Group` occurrences.
- `Negate(Group(Add(a,b)))`: `Negate` occurrence, minus operator target owned by it, nested `Group`, inner `Add`, and leaf occurrences. Automatic precedence parentheses do **not** create extra `Group` nodes.
- `Equal(a,b)`: relation occurrence and operator target, with left/right operand scopes; relation operations remain mathematical-rule dependent.
- Future `Divide(Add(a,b),Add(c,d))`: fraction, numerator and denominator each semantically addressable; fraction bar is an operator target, not merely a text glyph. This is a design example, not a supported AST type.

## Semantic container and hitbox obligations

**Design target:** every AST occurrence has a meaningful, addressable mathematical container, whether or not its boundary is visibly outlined. An occurrence need not always be directly clickable/draggable: permitted interactions depend on the current context and mathematical rules. Every operator used as an interaction target must be addressable through its owning occurrence and a disambiguating operator reference.

- Distinguish semantic addressability from a direct pointer hitbox. A narrow glyph must remain reachable through structural navigation and, eventually, a target proxy.
- The rendered DOM need not mirror the AST one-to-one: layout wrappers, bracket glyphs and other decorations may be additional elements.
- The visual outline must not be the only way to access or understand an occurrence; keyboard focus, labels and target navigation matter.
- Ordinary hover/selection/drag feedback must not reflow or resize mathematical notation. An external palette can provide larger targets without enlarging the equation.
- `Add(a,b,c)` has multiple visible plus glyphs owned by one node. Operator slot positions are **not** assumed to be stable identities after structural changes; do not silently retarget a proxy using a stale index.

**Current implementation gap:** `domRenderer.js` exposes nested `Group`/literal hitboxes and operator metadata but does not provide a complete independent hitbox for every `Add`/`Multiply` occurrence. This contract specifies the desired direction; completing the mapping requires a bounded migration and browser tests, not a silent renderer rewrite.

## Interaction, navigation and visual feedback ownership

| Owner | Responsibility | Must not do |
|---|---|---|
| Mathematical Engine | AST, rule conditions and candidate result | Interpret CSS, pointer coordinates or proxy tiles |
| Renderer/presentation specifications | Mathematical notation, semantic containers, operator target metadata, layout | Decide student intent or mathematical applicability |
| Input controller | Receive pointer, touch, focus and keyboard events | Decide mathematical validity |
| Hit-testing | Resolve physical pointer/focus target to semantic target | Treat every layout wrapper as an AST node |
| Structure navigator (future) | Move through AST parent/child/sibling/operator targets by mathematical meaning | Navigate arbitrary DOM ancestors as mathematics |
| Interaction recognizers/interpreter | Propose and arbitrate student intent using semantic targets and window state | Commit mathematics without rule checks |
| Visual Feedback Controller | Own transient highlight, hint and feedback lifecycle | Mutate AST or choose a rule |
| Candidate visualiser | Show candidate notation/provenance, coordinate feedback targets | Publish history directly |
| Rule application/commit lifecycle | Validate, confirm, publish exactly once | Depend on a particular DOM hitbox size |

A plus operator may be hover/drop-targetable for distribution without being independently draggable or clickable. Eligibility feedback (e.g. green numerical-factor combination) and preview provenance (e.g. amber newly introduced occurrence) communicate different things. Shared semantic feedback styles should override neutral hitbox hiding modes, with keyboard-visible focus and non-colour cues.

## Structural navigation and external target proxies (design only)

Students should be able to navigate mathematically by parent/child/sibling (and operator targets), then **pin** a target into a translucent, document-associated palette outside the equation. The proxy can be a compact coloured tile, an optional name or just an operator glyph; it need not duplicate a long expression. Its physical area may be generous without displacing the equation.

A target proxy has its own **interface ID**, optional label/colour and locate-original toggle, but resolves to an authoritative target reference (MOb ID + occurrence ID + target kind, and for an operator, a disambiguating owner-relative anchor). It is not another mathematical node, does not grant new rule permissions, and must not create mathematical history events. A proxy drop should resolve to the same semantic target as a direct drop, then undergo normal intent arbitration, eligibility checks, preview and commit. The original expression should show feedback; the proxy is only an alternate access point.

**Persistence:** pinning, unpinning, recolouring, renaming, moving and locate toggling are document-owned interface state saved across sessions, **outside the mathematical history graph**. Active hover, drag and candidate preview remain transient. Do not store raw DOM references or physical coordinates as authoritative target identity.

### Staleness and continuity policy

- On every interaction and on history/document changes, re-resolve the proxy against the current MOb and AST; a cached DOM element is never authoritative.
- If the exact occurrence still exists with the same identity, it remains the target even if moved.
- If missing, ambiguous or belonging to a different MOb, mark the proxy unavailable; do not silently retarget based on matching symbols, visual position or mathematical equivalence.
- Returning to a history state where the exact occurrence exists can reactivate it. A cancelled preview does not change the committed target.
- Operator targets must also validate their owner and anchor; an `operatorSlot` alone is insufficient evidence of identity after edits.

**Explicit future extension point — rule-following proxy continuity:** a rule application may eventually provide *optional, typed continuity/provenance mappings* between source and resulting occurrences/operators. The proxy resolver may later consult such mappings to **offer** retargeting, with an ambiguity policy and student control. **No automatic provenance-based following in v1.** Example: after `ab+ac -> a(b+c)`, the original `Add` proxy must not automatically choose either the resulting product or the inner sum. This is deferred to a dedicated identity/provenance design, not a blocker for presentation composition.

Suggested *future* boundary (illustrative, not an implemented API):

```js
{
  ruleApplicationId: 'application-7',
  continuity: [
    { from: { mobId: 'mob-1', nodeId: 'old-add' },
      to: { mobId: 'mob-1', nodeId: 'new-multiply' },
      relationship: 'replacement', confidence: 'explicit-rule-declared' }
  ]
}
```

A future schema must define scope, history-state provenance, one-to-many/many-to-one ambiguity, deleted nodes, copied operands and validation. **Do not add this sketch to persisted document data or mathematical history yet.**

## Geometry metadata (future)

Parent layouts may eventually consume measured child width/height, baseline and attachment anchors (superscripts, fraction bars, matrix columns). Measurements are *derived presentation data*, not AST or mathematical history. Current browser layout remains the implementation; introduce explicit geometry metadata only when real fraction/power/matrix requirements justify it.

## Implementation stages and verification

1. **This increment:** adopt the contract, document current gaps, keep all runtime behaviour unchanged.
2. **Renderer transparency:** inspectable mapping from AST occurrences/operator targets to rendered elements; add structural tests without changing mathematical semantics.
3. **Structure navigator:** parent/child/sibling/operator traversal by AST identity; accessible keyboard and on-screen controls; no layout reflow.
4. **Target palette:** document-owned, history-independent proxy state and stale-reference validation; direct and proxy interactions must have identical rule eligibility.
5. **Future continuity:** optional rule-declared mappings, explicit ambiguity handling and provenance design after a separate mathematical review.

Required future tests: `a+a` distinct occurrence IDs; nested `Group` targets; whole `Add` addressability; two plus glyphs in n-ary `Add`; pointer vs proxy distribution equivalence; proxy persistence without history; stale proxy across history and MObs; cancelled preview; keyboard navigation; light/dark feedback; stable geometry; source ID preservation. Do not claim these future tests are currently implemented.

## Compatibility and relationship to maintained references

This document extends the [Nested Mathematical Hitbox Visual Contract](Nested_Mathematical_Hitbox_Visual_Contract.md), not supersedes its current implementation details. See [Rendering and Interaction](../06_Historical_Records/Superseded_2026-11-12/Rendering_and_Interaction.md), [Mathematical Data Model](Mathematical_Data_Model.md), [Terminology](Interaction_Intent_and_Rule_Application_Terminology.md), and [Design-first workflow](../03_Developer_Guides/Design_First_Development_Workflow.md). The present release is **documentation-only**; no new proxies, navigator, provenance schema, layout engine or runtime semantic-container wrappers have been implemented.
