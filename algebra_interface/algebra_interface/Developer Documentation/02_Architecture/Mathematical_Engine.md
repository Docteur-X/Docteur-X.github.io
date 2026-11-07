# Mathematical engine and teaching policy

Pure AST construction/traversal/parsing live mainly in `js/core/`; mathematical rules in `js/operations/` and `js/relations/`. Implemented families include numerical addition/multiplication, rearrangement, grouping, distribution, factorisation, identity insertion, equality symmetry and limited equality function application. These do **not** amount to a general symbolic solver.

Engine rules must preserve unchanged occurrence IDs, allocate fresh IDs for new occurrences, respect operand order for noncommutative operations, and never derive mathematical validity from CSS, hitbox location or student intention. Some existing rule helpers mutate their **input**; their proposal adapters therefore operate on detached trees. Do not assume all helpers are pure without inspecting them.

`js/teaching/factorisationPolicy.js` and `js/teaching/equalityGroupingPolicy.js` govern pedagogical choices distinct from mathematical validity. Optional brackets around newly copied compound operands may be policy-controlled; mandatory precedence parentheses must always remain mathematically correct.

Current scalar/type checks are not a full domain/assumption solver. General function monotonicity, division-by-zero reasoning, matrix dimensions and arbitrary logical-context substitution are future work.
