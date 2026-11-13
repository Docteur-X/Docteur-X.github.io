/**
 * Notation written as text (renderer standard; lesson T7, 14 November 2026).
 *
 * Some views write a part of the tree as a short line of text instead of
 * drawing its boxes: distribution's amber copies, for example. They must
 * follow the same notation contract as the renderer: a letter (a Symbol) is
 * marked `term__label--symbol`, so the chosen font set draws it (italic in
 * the TeX fonts); a function name (an Apply) stays upright. Writing
 * `element.textContent = displayString` skips that mark, which is how the
 * amber copies came to show upright letters.
 *
 * writeNotation(element, node) writes the node's display text with its
 * letters marked from the tree itself, never guessed from the text: a run of
 * letters is a variable only when the tree has a Symbol of that name (or
 * every letter in it is one), and a function name only when the tree has an
 * Apply of that name. A plain string is written as it is.
 */
import { expressionToDisplayString } from "../../engine/parser.js";
import { namesForText as namesIn } from "./nodeSpecs.js";

function piece(doc, text, letter) {
  const span = doc.createElement("span");
  if (letter) span.className = "term__label--symbol";
  span.textContent = text;
  return span;
}

export function writeNotation(element, value, doc = document) {
  if (!value || typeof value !== "object") { element.textContent = value ?? ""; return element; }
  const { symbols, functions } = namesIn(value);
  const pieces = [];
  for (const part of expressionToDisplayString(value).split(/([A-Za-z]+)/).filter(Boolean)) {
    if (!/^[A-Za-z]+$/.test(part) || functions.has(part)) pieces.push(piece(doc, part, false));
    else if (symbols.has(part)) pieces.push(piece(doc, part, true));
    else if ([...part].every(letter => symbols.has(letter))) pieces.push(...[...part].map(letter => piece(doc, letter, true)));
    else pieces.push(piece(doc, part, false));
  }
  element.textContent = "";
  element.append(...pieces);
  return element;
}
