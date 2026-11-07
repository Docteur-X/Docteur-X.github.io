# Adding a mathematical transformation

1. Define the mathematical rule, assumptions, allowed domains/types, node-ID preservation and forward-implication versus equivalence semantics. Put it in the Engine, not UI.
2. Add a DOM-free gesture request adapter; keep pointer geometry and arming state in the interaction layer.
3. Register a stable rule ID and proposal function in `js/composition/transformationFeatureAssembly.js`, with optional feedback and visual adapters and `preview`/`immediate` confirmation policy.
4. Return an eligibility plan or detached candidate as appropriate; do not clone whole trees on every hover. Check current source code for mutating rule helpers.
5. For confirmation, use the shared source-stamped single-use lifecycle, detached history preparation and `publishPreparedTransformation`. Render/notify/save afterward, keeping durability separate.
6. Add mathematical rule tests (invalid cases, noncommutative order, ID/provenance), lifecycle tests (stale, cancel, double confirm, injected failure), and browser tests (real gesture, visible eligibility, preview, history).
7. Update current reference/status and handover; preserve one verified rollback ZIP.

Do not infer mathematical validity from UI appearance. Do not silently substitute an invalid targeted gesture with a different rule. For details see [Transformation framework](../02_Architecture/Transformation_Framework.md) and [Contract reference](../04_Reference/Transformation_Contracts.md).
