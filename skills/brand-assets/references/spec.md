# The spec

One JSON file per design direction. `scripts/build.js` reads it; `schema/brand.schema.json` defines every field with its default. Lengths are in em of `size` (so `0.08` at `size: 100` is 8 px) unless noted.

## Contents

- [The dashly spec, annotated](#the-dashly-spec-annotated)
- [Fields](#fields)
- [Paint references](#paint-references)
- [Concept recipes](#concept-recipes)
- [Variant patches](#variant-patches)

## The dashly spec, annotated

`tests/fixtures/dashly.json` rebuilds the shipped dashly mark. Copy it as a starting point.

| Field | dashly value | Why |
| --- | --- | --- |
| `font` | Instrument Sans, `wght` 700 | The studio sans, bold enough to hold at 32 px |
| `skew` | `11` | Forward lean for speed |
| `paint` | `{ "*": "ink", "4-5": "@sunrise" }` | Letters 4 & 5 (`l`, `y`) share one gradient |
| `motion.lines` | lengths `0.56`, `0.92`, `0.40` | Three speed lines, longest in the middle |
| `favicon` | `d` on the `@tile` gradient, white, two dashes | Two dashes survive at 16 px; three do not |

## Fields

| Field | What it does |
| --- | --- |
| `name` | SVG `<title>` & alt text |
| `text` | Letters drawn; defaults to `name` |
| `concept` | One line shown on the contact sheet |
| `font.file`, `font.axes` | The font, relative to the spec; axes from `fonts.js` only |
| `size` | Master font size in px (100) |
| `tracking` | Extra letter space in em; negative tightens |
| `skew` | Forward lean in degrees; 8 to 12 reads as motion, past 14 looks broken |
| `padding` | Space around the drawing in em |
| `surfaces` | Light & dark page backgrounds; defaults match oss-docs-site |
| `palette.<name>` | `light`, `dark`, `role` (`text`, `graphic`, `decorative`); each becomes a class |
| `gradients.<name>` | `stops` (palette names or colours) & `direction` |
| `paint` | Which paint each letter takes |
| `motion` | Speed lines behind the leading letter: `lines`, `thickness`, `gap`, `inset` |
| `decorations` | Rectangles relative to the baseline origin for stripes, cursors, or bars; `skew` makes them lean with the letters |
| `favicon` | `glyph`, `tile`, `ink`, `radius`, `scale`, `dashes` |
| `og` | `tagline`, `url`, `accent` for the Open Graph image |

The origin for `decorations` is the pen position at the baseline: `y` is negative above it. The x-height band runs from `-xHeight` to `0`; `fonts.js` prints the x-height per 1000 units (Instrument Sans: 510, so `-0.51`).

## Paint references

- A palette name: `"hot"`. Swaps in dark mode.
- A gradient: `"@sunrise"`. Its stops swap in dark mode when they are palette names.
- A literal colour (`favicon`, gradient stops, `og.accent` only): `"#ffffff"`, `"white"`.

`paint` keys: `"*"` for every letter, `"3"` for one letter (0-based), `"4-5"` for an inclusive range. Single letters override ranges, ranges override `*`.

## Concept recipes

| Idea | Spec shape |
| --- | --- |
| Accent letters | `paint` a range with an accent or gradient |
| Speed | `skew` 10 to 12 plus `motion` |
| Stripe or underline | a `decorations` bar below the baseline; check it clears descenders |
| Cursor | a narrow `decorations` bar after the last letter, `layer: "front"` |
| Heavier or lighter | `font.axes.wght` within the listed range |
| Mono | the studio mono (PT Mono) works; fixed-width cells leave gaps around narrow letters such as `l` & `i` |
| True italic | point `font.file` at the italic file & set `skew` to 0 |

## Variant patches

`variants.json` is an array of `{ "id", "label", "patch" }`. A patch deep-merges into the spec; `null` deletes a key.

```json
[
	{ "id": "teal", "label": "Teal accent", "patch": { "palette": { "hot": { "light": "#1f91ad", "dark": "#5cc8e0" } } } },
	{ "id": "no-motion", "label": "Without speed lines", "patch": { "motion": null } }
]
```
