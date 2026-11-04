# Project terminology and naming (proposed vocabulary)

**Status:** Agreed conceptual terminology for future development; it does **not** imply that all components exist as separate modules today. Product name remains undecided. The descriptive phrase **Visual Mathematical Manipulation Environment** is provisional; alternatives include **Visual Mathematics Manipulator** and **Interactive Mathematical Transformation Environment**. The project aims to let learners construct, manipulate, and explore mathematics through visible, justified transformations, rather than functioning only as a typographical editor or opaque CAS.

## Mathematical content and organisation

| Term | Meaning |
| --- | --- |
| **Mathematical AST** | General nested mathematical representation; nodes have stable occurrence IDs. |
| **Expression Tree** | An AST/subtree representing a mathematical value (e.g. `a*(b+c)`). |
| **Statement Tree** | A relation or a logical combination of statements; relations are themselves statements. |
| **Mathematical Engine** | Type validation, mathematical rules, evaluation, and proposed transformations, independent of DOM and gestures. |
| **Teaching Policy** | Pedagogical permission/guidance layered on mathematical validity; does not invent new mathematical laws. |
| **Mathematical Document** | One evolving root AST (expression or statement), metadata, and transformation history/provenance. A compound statement may contain many relations. |
| **Workspace** | Organises multiple Mathematical Documents and, eventually, cross-document operations and persistence. |

## On-screen components and interaction

| Term | Meaning |
| --- | --- |
| **Mathematical Window** | Visible container presenting a document, subtree, or historical state. It need not be a separate operating-system window. |
| **Mathematical View** | The rendered mathematical content within a Window; potentially read-only. |
| **Mathematical Editor** | Free typographical/structural input and edits; not inherently a justified transformation. |
| **Mathematical Manipulator** | **Umbrella interaction/presentation subsystem** that coordinates gesture interpretation, requests to the Engine and Teaching Policy, previews, confirmation, and display. Not a single giant `app.js` module. |
| **Gesture Interpreter** | Converts pointer, touch, keyboard, selection, or other gestures and hit-test zones into *proposed mathematical intentions*, without deciding mathematical validity. The longer name *Visual/Gesture Interpreter* is acceptable in discussions. |
| **Transformation Coordinator** | Routes action requests to mathematical rules and teaching policies; manages preview/confirm/cancel lifecycle. Also accepts non-gesture requests (menus, future macros). |
| **Mathematical Renderer** | Converts AST/presentation metadata into layout, notation and hitboxes; does not decide whether transformations are legal. |
| **Transformation Visualiser** | Explains proposed changes with fading, amber new occurrences, arrows and other pedagogical previews; does not validate mathematics. |

## Interaction boundary

**Gesture -> proposed intention -> Engine validation + Teaching Policy -> visual explanation -> confirmed mathematical state -> history event.** A preview does not modify the committed tree or history. Rendering and visualisation may consult measured layout geometry but must not own mathematical truth. The Mathematical Manipulator *coordinates* independently maintained components; the Mathematical Engine remains callable from tests, menus, future macros, and cross-document substitution.

**Examples of current module responsibilities:** `js/app.js` currently coordinates interaction; `js/interaction/hitTesting.js` handles target geometry; `js/interaction/rearrangementPreview.js` and `transformationPreview.js` handle previews; `js/rendering/domRenderer.js` renders mathematical content; `js/operations/` and `js/relations/` own mathematical rules; `js/core/documentHistory.js` manages history. These conceptual names are **not** instructions to rename working files immediately.

**Future UI note:** a Window may display an active manipulable document, a read-only history state, or one view of a compound statement. One document need not equal one visible window, and a workspace is not the same as a window.
