# Mathematical engine and teaching policy

Pure AST construction/traversal/parsing live mainly in `js/core/`; mathematical rules in `js/engine/operations/` and `js/relations/`. Implemented families include numerical addition/multiplication, rearrangement, grouping, distribution, factorisation, identity insertion, equality symmetry and limited equality function application. These do **not** amount to a general symbolic solver.

Numbers are exact: `js/engine/rational.js` does all arithmetic with fractions of `BigInt` integers and never rounds. A result over 1000 digits is refused rather than approximated. A rule that declines for a reason worth telling the student reports it through `js/engine/ruleRejections.js`: a stable `reason` code and a plain `message` (for example "Number is too large"), via a separate `explain…Rejection` function so that existing callers are unaffected. A future hint system can show these.

Engine rules must preserve unchanged occurrence IDs, allocate fresh IDs for new occurrences, respect operand order for noncommutative operations, and never derive mathematical validity from CSS, hitbox location or student intention. Some existing rule helpers mutate their **input**; their proposal adapters therefore operate on detached trees. Do not assume all helpers are pure without inspecting them.

`js/engine/teaching/factorisationPolicy.js` and `js/engine/teaching/equalityGroupingPolicy.js` govern pedagogical choices distinct from mathematical validity. Optional brackets around newly copied compound operands may be policy-controlled; mandatory precedence parentheses must always remain mathematically correct.

Current scalar/type checks are not a full domain/assumption solver. General function monotonicity, division-by-zero reasoning, matrix dimensions and arbitrary logical-context substitution are future work.
