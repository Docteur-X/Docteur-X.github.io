# Equality Function Application v1.3.1 — Shared Amber Glow

## Scope and motivation

The student reported that v1.3 highlighted inserted operands with flat amber boxes, unlike the luminous dashed insertion affordance in distribution. This is a **presentation-only correction** on top of the v1.3 grouping and renderer-owned visual-role implementation. It does **not** implement the Transformation Feature Contract or architectural consolidation.

## Actual implementation

- `js/rendering/domRenderer.js` remains the authority for which outermost copied operand IDs receive `equality-inserted-operand` via `options.visualRoles.insertedOperandIds`. No new DOM search, engine change or alternate preview path was introduced.
- `styles.css` now groups `.distribution-preview__copy` and `.equality-inline-preview .equality-inserted-operand` under the **same** normal/hover/focus visual declarations: dashed amber border, soft amber background, 3px halo, and stronger halo on hover/focus. The colours come from the existing light/dark `--distribution-*` tokens. Avoid duplicating these declarations in a later equality-only block.
- The `.term--compound:not(.equality-inserted-operand)` preview selector remains deliberately neutral, because structural Add/Multiply wrappers contain existing mathematical content. Only the two *new* operand occurrence roots glow. Compound operands retain their inner hitboxes and explicit brackets without nested amber treatment.
- The renderer still controls AST notation, explicit and mandatory brackets, hitbox geometry and semantic roles. The preview remains non-committing until confirmed. Existing `app.js` integration is deliberately untouched pending the separate architecture milestone.

## Regression contract

The existing Playwright compound-operand test now checks that each inserted operand has a dashed border, a nonempty halo and a nontransparent background, while preserving exactly two highlighted outermost nodes and no highlighted descendants. Existing equality tests cover cancellation, commit, grouping and history. Distribution tests remain unchanged and must still pass.

Run `node --test tests/*.test.js` and `npm run test:e2e` on a machine with Playwright Chromium installed. Compare distribution and equality preview visually in **both light and dark themes**, including compound copied expressions. A browser screenshot review is still necessary: computed-style checks do not prove visual attractiveness or accessibility.

## Future handover

Do not apply amber styling to every new AST node: structural wrappers are new but contain old mathematical occurrences. Reuse semantic visual roles and renderer-owned hitboxes. A future Transformation Feature Contract may centralise visual-role naming; this release deliberately avoids that architectural migration. Preserve student agency, pure mathematical rules, stable node IDs, low-end hardware compatibility, and explanatory previews.
