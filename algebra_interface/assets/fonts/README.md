# Bundled fonts

The app works offline, so its fonts are files here rather than downloads. Each folder keeps its licence beside the font.

| Folder | Font | Source | Licence |
|---|---|---|---|
| `katex/` | KaTeX Main (regular, italic), KaTeX Math italic, KaTeX Size1 | the `katex@0.16.11` npm package (`dist/fonts`) | MIT, `katex/LICENSE` |
| `latin-modern/` | Latin Modern Math (`latinmodern-math.otf`) | CTAN, `fonts/lm-math` | GUST Font License (an LPPL variant), `latin-modern/LICENSE.txt` |
| `mlmodern/` | MLModern Math (`mlmodern-math.otf`), a darker Latin Modern | CTAN, `fonts/mlmodern` | LPPL 1.3c, `mlmodern/LICENSE.txt` |

All three licences allow redistribution with the app. The LPPL fonts must not be modified under the same name; they are used unchanged.

The OpenType maths fonts draw italic letters from the Unicode mathematical italic block (U+1D434 onward, with `ℎ` at U+210E), as TeX does; the renderer maps letters there. KaTeX instead puts its maths italic at the ordinary letters, in the KaTeX_Math family.
