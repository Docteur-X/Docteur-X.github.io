# Engine: statements, numbers and logic (draft)

**Status: draft for owner review, 9 November 2026. Nothing here is implemented, and only sections marked "owner decision" are decided.** It records the owner's goals, and the assistant's proposals for meeting them. Items marked **Decide** need the owner. The [blueprint](Architecture_Blueprint.md) remains the overall target.

## Guiding principle (owner decision)

The Engine encodes what a student is trying to do in a concrete form the computer understands. That form has a purely mathematical component, and the Engine only ever applies mathematically justified rules to it. The encoding should be **natural**: close to how people think, which often differs from the axiomatic method (for example, a sum of many terms versus binary addition).

Natural and axiomatic forms do not compete. They are joined by proofs:

| Layer | Holds | Example |
|---|---|---|
| Natural | The forms students think and write in | `a+b+c` as one sum; "move `b` across" |
| Bridge | Definitions and theorems linking the layers | A many-term sum defined from binary addition; the associativity theorem |
| Axiomatic core | A small set of axioms; the only code that changes the AST | Binary addition, commutativity, inverse |

- A natural form must be **defined** in terms of the core.
- A natural move must be a **theorem** that unfolds into axioms.
- **Notation** (`a·b`, `a×b`, `ab`) is presentation metadata, outside both layers. It may change how something looks, never what it means.
- **Test for any feature:** can it be stated naturally, and does it unfold into the core?
- What is natural depends on the student, so the natural layer may grow with them; the core does not change. (Assistant's note: this is the same pattern as proof assistants, whose small trusted core checks everything a larger friendly layer produces.)

Still being considered by the owner: whether many-term addition is a separate defined function ("Student-Add"), and gathering notation metadata into one field on each node.

## Prototype scope (owner, 10 November 2026)

The owner judged the wider ideas too complex for now, and returned the focus to a basic prototype and the stated Engine goals below. **Parked, not abandoned:** Questions with givens, deductions and sources; inference rules; Questions; quantifiers, sets and counting; a CAS adapter; ratios; and the guiding principle's layers beyond what the goals need. They stay in this draft for later.

## Goals (owner)

1. A true Engine module that stands alone, and could later be converted to a standard CAS form.
2. Relations, such as inequalities, that the Engine can evaluate as TRUE or FALSE.
3. True variables kept separate from their typography, with variable types.
4. Statements that can be TRUE, FALSE or UNKNOWN, with the answer optionally HIDDEN by the Interaction layer.
5. AND, OR, NOT and IMPLIES, with simple evaluation such as `(T and F) = F`.
6. Basic logical rules, such as De Morgan's laws.
7. Exact rationals, with room for roots, complex numbers, `π` and `e`, and warnings when numbers grow too large.
8. Support for how students work: start from given information, combine it to deduce something, and add new information partway through.

**Set aside for later (owner):** calculating and comparing ratios.

## How a student works through a problem

| Student's step | Example | What the Engine needs |
|---|---|---|
| Reads the given information | `x+y=3`, `x=1` | Statements with the role *given* |
| Rewrites one statement | `x+y=3` becomes `y+x=3` | A rule, recorded in that statement's history |
| Combines information | Using `x=1` in `x+y=3` gives `1+y=3` | A rule that records which statements it relied on |
| Adds information midway | "Also, `y>0`" | A new *given*, recorded as added, never as deduced |
| Tests a guess | Try `y=2` | A trial that leaves no mark on the mathematics |

## Proposed model

```
Document
└─ Question                shared variables; givens are assumed together
   ├─ Variables            identity, type, how each is written
   └─ Statements (ordered)
      ├─ AST               the statement itself
      ├─ Role              given or deduced
      ├─ Sources           which statements a deduced statement relied on
      └─ History           how this statement changed
```

- **Statement + History** replaces "one equation object" as the central idea.
- **Givens stay separate statements,** rather than one growing `And`. A student can always see what was given, deductions can cite exactly what they used, and adding a given cannot disturb earlier work. An `And` is still available when a student wants one, and joining statements into an `And` is itself a rule.
- **A new given never invalidates a deduction,** since each deduction records its sources. Removing a given is different: everything that relied on it must be flagged.
- **Across Questions, statements assert nothing about each other.** This refines the assistant's earlier suggestion about separate Objects: the Question now provides the shared context.
- **Trial values are not history.** Assigned values and assumptions are.

**Decided (owner, 10 November 2026):**
- **Names must mean something to a student, not to a software designer.** "Problem" is dropped because it was confusing. The unit between Document and the mathematics is a **Question**, as defined in the Questions section below. In one Question a student manipulates several distinct equations.
- **Expressions and statements are both supported.** Creating expressions is useful, and a unit that evaluates to true or false is essential. The word "statement" must not box the design in; what this project really needs here is not yet well understood.
- **Undo belongs to a well-developed history layer.** Each manipulation of each equation can be undone. Undoing moves backwards in that equation's history branch, and later actions branch off from there.

## Truth

Truth is calculated, never stored: `evaluate(statement, context) → { status, reason }`. Stored truth could go stale. `evaluateEquality` in `js/engine/relations/equality.js` already works this way, and returns a result rather than marking a node.

| Context for `2x+1=3` | Meaning | Result |
|---|---|---|
| Role *given*; `x` is a scalar | "`x` satisfies this" | Taken as assumed |
| `x` assigned the value 1 | "Is it true?" | TRUE |
| `x` given the trial value 5 | "Is my guess right?" | FALSE, for this trial |

**Statuses:** TRUE, FALSE, UNKNOWN (not determined, which may mean it depends on a variable or that the Engine cannot tell) and UNDEFINED (for example, dividing by zero). The result's `reason` says which.

**HIDDEN is not a status.** The Engine always answers, and the Interaction layer decides whether to show it. The current `evaluateEquality` deliberately avoids calculating arithmetic so as not to reveal a student's answer. Under this design, that choice moves to the Interaction layer.

**Combining statuses** follows standard three-valued logic: `F AND U = F`, `T AND U = U`, `T OR U = T`, `NOT U = U`.

**Owner's design idea (10 November 2026), to be fleshed out with good examples:** reaching an UNDEFINED operation, such as dividing by zero or taking the square root of a negative number in real algebra mode, means the student is stuck, and the whole expression is UNDEFINED. UNDEFINED stops there and does not combine with anything.

## Variables and types

Three separate things:

| Concept | Holds | Example |
|---|---|---|
| Variable | Identity and type | "variable 7, a real scalar" |
| Symbol | How it is written | italic `x`, `θ` |
| Context | What is assumed, assigned or tried | `x = 1` |

- Symbol nodes refer to a variable's identity rather than only a name. Renaming or restyling changes no mathematics, and `structuralEquality.js` compares identity.
- **Constants are not variables.** Imaginary `i`, `π` and `e` are constants with fixed meaning, even when `i` looks like a variable.
- **Type has two parts:** a shape (scalar now; vector and matrix later) and a number system (natural, integer, rational, real, complex).
- Types decide what makes sense: `x<y` needs real values, and matrix multiplication will need non-commuting rules.

**Window modes (owner's direction, 10 November 2026):** each window will have its own expression entry and a fixed mode chosen by the student, such as algebra, vectors and matrices, or groups. The mode sets the default types. The student deliberately chooses what they want to do mathematically, without ambiguity; the software's responsibility is to make mathematically justified manipulations.

## Types and operators (owner decision)

- **Every variable has an explicitly declared type,** such as scalar, vector, matrix or group element. The interface may pre-fill a type, but the Engine never guesses.
- **People can define their own types and rules,** for example the axioms and multiplication table of a finite group.
- **An AST operator names its exact operation.** `Multiply-Matrices(A, B)` calls the rules for multiplying two matrices, which accept compatible sizes and reject others. Scalar-matrix and scalar-scalar multiplication are different operations with different rules, and each owns properties such as commutativity.

**Proposed, not yet decided:**
- Rules are shared through structures, so `a*0=0` is written once for all rings, while each type adds only what is unique to it. An operator declares its role in a structure, for example "the multiplication of this ring".
- Variable types live in the Question's variable table. A node stores the operation's name, and the operation states which types it accepts and what it returns, so the type is not stored twice.
- A finite table can be checked completely by the Engine. Axioms of an infinite type are declared, clearly marked, and limited to Questions that use that type.
- Build real numbers as a type first, then a small finite group as the second test, then matrices.

### How operator properties shape notation (proposed)

An operation declares its properties, and the AST and interaction follow from them:

| Associative | Commutative | Example | AST | Display and interaction |
|---|---|---|---|---|
| Yes | Yes | Scalar `+` | One flat node with many parts | No brackets needed; parts reorder freely |
| Yes | No | Matrix product | One flat node with many parts | No brackets needed; parts keep their order |
| No | Yes | Average of two numbers | Two parts only | Brackets when nested; the two parts can swap |
| No | No | Cross product | Two parts only | Brackets when nested; no reordering |

- **A flat node is a claim that the operation is associative,** so the constructor and invariants refuse a flat node for any other operation.
- **Brackets required by non-associativity need no `Group` node.** The renderer adds them from the operation's properties, as it does now for precedence.
- **Gestures stay generic.** The Interaction layer asks; the Engine refuses to reorder a non-commutative product, and feedback can say why.
- **A named convention,** such as reading `a-b-c` from the left, is declared by the operation and affects only parsing and display.

## Assumptions (owner's idea)

**Owner decision:** an additional panel details the assumptions required. If they are later violated, for example by multiplying incompatible matrices, the student gets a warning.

**Proposed, not yet decided:**

- **Engine:** a rule declares what it requires. If that is not yet known, the step proceeds and records an assumption: the condition as a statement, and the rule or step it came from. Examples: `columns(A) = rows(B)` for `AB`, and `x≠0` for dividing by `x`.
- **Status is calculated,** so a warning appears by itself when later information breaks an assumption:

| Status | Panel shows |
|---|---|
| TRUE | Satisfied |
| UNKNOWN | Assumed; the result depends on it |
| FALSE | Warning: violated, pointing to the step and the information involved |
| UNDEFINED | Warning: needs attention |

- **Panel:** it belongs to the Interaction layer and only displays what the Engine reports. Unresolved and violated assumptions come first; satisfied ones collapse.
- **Known violations are refused.** If `A` is known to be 2×3 and `B` 2×2, `AB` is rejected. The assumption path is only for what is not yet known.
- **After a violation,** warn and mark the dependent steps, without deleting or undoing anything. The student decides how to fix it.
- **Origins are labelled.** A student's own "assume `x>0`" and a rule's requirement are stored the same way, but shown apart.
- **Conclusions carry their assumptions,** so a student can see when a result holds only if, say, `x≠0`.
- **History** records assumptions as they change.

## Numbers

**Decided for the first version (owner, 10 November 2026):**
- The `Divide` node waits for later. With only addition and multiplication, every result is a finishing decimal.
- The owner has no saved documents in the old format, so no cleaning is needed. Old-format numbers, if ever met, load as their exact decimal value.
- Proposed storage: the tree holds plain strings for numerator and denominator, so history, clipboard and serialization keep copying ordinary JSON; one new module, `js/engine/rational.js`, does all exact arithmetic.

**Principle: the Engine never silently rounds.** This addresses defects D3 and D4 in [Known Issues](../05_Roadmap/Known_Issues.md).

| Layer | Now | Later |
|---|---|---|
| Exact value | Rational: an integer numerator and denominator, using `BigInt` | |
| Written form | How it was entered: `0.1` stays displayed as a decimal, though its value is 1/10 | |
| Exact expressions | `Divide` for fractions | Roots, powers, constants such as `π`, and `a+bi` |
| Approximations | None | A separately marked "approximate" kind, never mixed silently with exact values |

- **Irrational numbers stay as expressions.** `√2` and `π` are nodes, not values, so nothing gets rounded. Comparing `π<4` will need a later method based on approximate bounds, reported honestly as such.
- **A written fraction stays as written.** `2/4` is `Divide(2,4)` and does not become `1/2` until a student applies a rule. Its value can still be calculated for checking truth.
- **Dividing by zero** is UNDEFINED, not an error or a number.
- **Too-large numbers:** `BigInt` does not overflow, but numbers can become too large to work with. Above a set size, a rule declines and gives a reason, so a student gets a warning rather than a wrong answer.
- **Saved files:** `BigInt` cannot be stored directly in JSON, so values are saved as strings. This needs a new schema version and a migration of older documents.
- **Display:** drawing fractions on screen is Window and Renderer work, and comes later.

`.value` appears about 41 times across 14 files, so the change needs a helper layer rather than edits at each site.

## Statement nodes

| Group | Nodes |
|---|---|
| Relations | `Equal`, `NotEqual`, `Less`, `LessEqual`, `Greater`, `GreaterEqual` |
| Connectors | `And`, `Or` (any number of parts), `Not`, `Implies` (two ordered parts) |
| Truth constants | `True`, `False` |

- Relations contain expressions, and connectors contain statements. `Equal` is no longer limited to the root.
- A chain such as `a<b<c` is left for later.
- `Implies` follows the standard definition, so `FALSE IMPLIES anything` is TRUE. This often surprises students, so teaching material may need to explain it.

## Relation modules (owner decision)

Each relation is a module holding its properties, the rules they justify, and theorems derived from them. Example for `<`: transitive, asymmetric, irreflexive, and trichotomy (exactly one of `a<b`, `a=b`, `b<a`). Shared properties, such as transitivity, should be written once and declared by each relation that has them.

**Proposed, not yet decided:** `>` is `<` with its sides swapped, displayed as written. Rules linking a relation to an operation, such as `a<b` gives `a+c<b+c`, live outside the relation's module.

## Axioms and theorems (owner decision)

Three layers, each using only those below it:

| Layer | What it is | May change the AST? |
|---|---|---|
| Axioms | The basic rules | Yes, these are the only code that may |
| Basic theorems | Useful properties, such as `a*0=0`, derived from axioms | Only by invoking rules |
| Higher theorems | Student-level moves, invoking basic theorems and axioms | Only by invoking rules |

**A theorem is a derivation.** It lets a student work at a higher level without doing each step. Moving `+b` across `a+b=c+d` means: add `-b` to both sides, apply `b+(-b)=0`, then `a+0=a`. The student sees one step, and can eventually open its elementary steps from a dropdown in the history page.

**Why this is sound (assistant's reasoning):** every result comes from running real rules, so a faulty theorem can fail but cannot produce a false result, and conditions such as `b≠0` are enforced by the step that needs them. A test should enforce that theorems only invoke rules.

### Proposed axioms

| Group | Axioms |
|---|---|
| Equality | Reflexive, symmetric, transitive, substitution |
| Addition | Associative, commutative, identity, inverse |
| Multiplication | Associative, commutative, identity, inverse (needs `a≠0`) |
| Both | Distributive, `0≠1` |
| Order (reals) | Trichotomy, transitive, adding preserves `<`, multiplying by a positive preserves `<` |

### Proposed test set

`a*0=0`, `-(-a)=a`, `(-1)*a=-a`, distribution used in reverse, moving `+b` across an equation, cancelling (`a+c=b+c` gives `a=b`), and `a<b` gives `-b<-a`.

### Proposed details, not yet decided

- **Structures:** axioms are grouped by structure (ring, field, ordered field), and each theorem declares what it needs. Variable types say which structure applies. `a*0=0` needs only a ring, so it would also hold for matrices.
- **Trusted arithmetic:** exact calculation on literal numbers, such as `2+3=5`, is one clearly named rule rather than a derivation.
- **Many-part nodes:** axioms speak of `a+b`, but `Add(a,b,c)` is one flat node, so "commutative" means swapping neighbours and "associative" means grouping or ungrouping.
- **Existing rules** keep working and are replaced one at a time, each giving the same results under the existing tests.
- **History:** undo removes a whole theorem. The dropdown starts as view-only; branching from inside one may come later.

## Authoring theorems (owner's idea, future)

Adding a file to the Engine's rule suite makes a new theorem appear in a theorems toolbar. A developer mode in the interface could offer "do derivation": the author works through the steps, which are drafted, finalised and recorded along with a chosen interaction. The suite's language should be easy for people to read, and a script converts it into a computer-readable format.

Proposed points to settle when this is designed:
- **Data, not code.** Shared files should be data that cannot run arbitrary code, which also keeps a faulty or hostile file from bypassing rules.
- **Theorems and axioms differ.** A theorem cannot break soundness; a new axiom can, so adding one needs a deliberate, clearly marked step.
- **Generalising a recording.** A derivation worked on `a+b=c+d` must become a pattern, and the author should confirm it.
- **Loading.** A browser cannot simply watch a folder, so offline use needs a build step, a list of files, or an import button.
- **First-party rules** should eventually use the same language, once it is proven.

## Rules

| Kind | Meaning | First examples |
|---|---|---|
| Evaluation | Calculates a status | `T AND F` gives `F` |
| Equivalence | Rewrites without changing meaning | De Morgan's laws, `NOT NOT A`, `A AND A` becomes `A`, swapping parts of `And` and `Or`, `A IMPLIES B` becomes `(NOT A) OR B` |
| Inference | Derives something from sources | Joining givens with `And`, taking a part of an `And`, `A` and `A IMPLIES B` gives `B`, substituting using an equation |

Each applied rule records:
- what it replaced (provenance, which also solves the [navigator marker](../05_Roadmap/Future_Features.md) problem);
- its relationship to the earlier form: *equivalent* or *implies*;
- the statements it relied on.

**Position matters.** Inside a `Not`, or on the left of an `Implies`, a one-way step would be logically wrong, because the direction reverses. So equivalences may apply anywhere, while one-way steps apply only at the top of a statement or to a part of a top-level `And`. Substituting from one part of an `Or` into another is not valid, and the rule must decline.

Rearranging inequalities, which needs sign knowledge, comes after evaluating them.

## The Engine module

- **One folder and one public entry point,** with no DOM, no browser storage and no teaching policy inside. The Interaction layer asks; it never reaches in.
- **The dependency test** gains this boundary, and the existing leaks noted in the [audit](Architecture_Blueprint.md#architecture-audit-9-november-2026) get closed.
- **The Engine owns** statements, variables, context, rules and evaluation. Moving the live AST out of `state` in `app.js` is part of this. Moving gesture and view state is later, separate work.
- **Teaching policy stays outside,** consulted by the flow rather than called by rules.

## Standard CAS form

Every new node must export through `js/engine/mathJson.js`. A later adapter could then use another CAS, with three limits:
- it would not keep occurrence IDs or provenance, so its results cannot simply replace the AST;
- it may check or suggest, but the student's own steps remain the point;
- it must work offline and stay small.

The MathJSON names for the new nodes need confirming against its specification during implementation.

## Suggested order

Each stage is tested in Node. Stages 2 to 6 stay unreachable from the app until display work begins.

| Stage | Work | Finished when |
|---|---|---|
| 0 | Engine folder and entry point; check which rules assume they sit at the root or directly under `Equal` | Behaviour unchanged, boundary tested |
| 1 | Exact rationals | **Done 10 November 2026.** D3 and D4 fixed; older documents load without migration |
| 2 | Variables, types, Question and context model | The three `2x+1=3` scenarios work |
| 3 | Relations and evaluation | Inequalities evaluate on exact numbers |
| 4 | Connectors and combined evaluation | `(x=1 AND y=2) OR (x=2 AND y=1)` evaluates under any context |
| 5 | Equivalence rules with provenance | De Morgan's laws apply, including in nested positions |
| 6 | Inference, givens and sources | `x+y=3` and `x=1` give `y=2`, with sources recorded, and a given can be added midway |

**Then:** the Window and Renderer design, using paper sketches of these structures before any interface code. Moving view and gesture state out of `app.js` is designed with it.

**Order (owner, 10 November 2026):** audit the grouping preview first, then the Engine work.

## Questions (owner's idea, under consideration)

**Not a decision.** A Question mimics what a mathematical problem feels like, and has a definite, testable answer. The software provides the sandbox and framework for students to reach it. Questions can be stacked, so one question's answer feeds the next.

| Owner's example | Kind | Stacked form |
|---|---|---|
| For what values of `k` does `kx²+x+1=0` have distinct real roots? | Find a set | First: how many roots for a fixed `k`? Then: all `k` giving two distinct roots |
| Show that `n²=2026+m²` has no integer solutions | Show that | First: what are the integer solutions? Then: how many pairs `(n,m)`? |

Assistant's notes on how this fits the model:
- **Place:** the Question is the unit itself (owner, 10 November 2026): it holds the givens, variables and equations, plus a goal and the kind of answer expected.
- **Testing a "show that" answer:** if every step is checked by the Engine and records its sources, the derivation itself is the proof. The software need not know the answer in advance.
- **Testing a "find" answer:** checking that each value works is easy. Checking that no others exist needs every step marked *equivalent*, so the final set matches the original. The draft's equivalent/implies marking makes this possible.
- **Stacking:** a sub-question's answer becomes a source for the next, using the sources already planned for deductions.
- **What it adds:** variable roles beyond assigned, assumed and trial, such as a parameter (`k`, fixed but arbitrary) versus an unknown (`x`, sought); quantifiers ("for what values", "no solutions"), which this draft had left out; sets and counting; and integer reasoning such as remainders, which the second example needs.
- **Open:** who writes a Question and its expected answer, the teacher or the Engine; and how HIDDEN applies to an answer.

## Not in this draft

Ratios, simplifying or solving automatically, quantifiers (`for all`, `there exists`), chained inequalities, teaching-policy design, and all display work.
