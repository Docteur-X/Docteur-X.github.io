# Identity overlay containing-block regression (625)

The browser regression `e2e/identity-presentation-layout.spec.js` previously compared the identity overlay border box with the outer border box of `.equation-panel`. That assumption was incorrect: `css/previews.css` defines `position:absolute; inset:0`, while `css/interface.css` gives the positioned panel a 1px border. The overlay fills the panel padding box, not the border box. The reported failure therefore does not establish a production positioning defect.

The regression now verifies the actual containing-block contract: the panel is positioned, the overlay uses absolute zero insets, its measured rectangle matches the panel's padding box (accounting for `clientLeft/clientTop/clientWidth/clientHeight`), and the source hitbox remains inside the equation. It continues checking preview non-commit and cancellation cleanup. No production change was made. Browser verification is pending.
