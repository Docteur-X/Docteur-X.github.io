# Rendering, hit-testing and interaction

`js/rendering/domRenderer.js` renders ASTs into mathematical notation, explicit Group brackets, precedence-required parentheses and node-ID hitboxes. `js/interaction/` owns browser-specific selection, hit testing, drag feedback, preview DOM and extracted equality/clipboard controllers. `js/manipulator/*Visual.js` supplies semantic transformation-specific descriptions.

Existing `*Gesture.js` adapters (conceptually **Interaction Recognizers**) describe DOM-free candidate intentions. The Interaction Interpreter should arbitrate competing recognitions; the Mathematical Engine checks applicability of the student-requested rule, not a subjective preference. The Visual Feedback Controller communicates targets and the Transformation Visualiser optionally shows candidate mathematics. Renderer-owned presentation roles are preferable to application code manually painting arbitrary DOM ancestors.

Keep hitbox geometry stable during drag, avoid second post-drop rearrangement animations, preserve cancellation and exact DOM restoration, and distinguish transient hitbox outlines from actual mathematical brackets. Distribution's amber, grouping's blue and numerical eligibility's green are current visual conventions, not mathematical semantics.

Known UI follow-ups: equality insertion amber should have a dashed resting border; optional grouping around atomic factors may be overly broad; crowded factorisation extraction zones can be unavailable even when toolbar Preview Extraction succeeds. Resizable windows and intelligent line breaking are future work, not implemented.

For the distinction between physical input, interaction recognition, mathematical intent, rule application and visual feedback, see [terminology](../04_Reference/Interaction_Intent_and_Rule_Application_Terminology.md).
