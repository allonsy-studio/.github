# Color & contrast

`scripts/contrast.js` measures every palette color on the light (`#ffffff`) & dark (`#101216`) surfaces, the favicon glyph on each tile stop, & the tile's strongest stop on Chrome's light (`#dee1e6`) & dark (`#202124`) tab strips, which catches a near-black tile that vanishes in dark mode. It exits 1 when a text or graphic paint misses its target.

## Roles

| Role | Target | Use for |
| --- | --- | --- |
| `text` (default) | 4.5:1 | Letters |
| `graphic` | 3:1 | Shapes that carry the mark, such as a gradient end or a main speed line |
| `decorative` | none, reported | Accents the mark reads without, such as the third speed line |

WCAG 2.2 exempts logotypes from text contrast ([1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum)), so 4.5:1 for letters is a studio choice, not a legal floor: the wordmark doubles as the site's home link & its only name. Non-text contrast ([1.4.11](https://www.w3.org/TR/WCAG22/#non-text-contrast)) sets the 3:1 for graphics.

## Tint, don't reuse

Brand colors tuned for dark surfaces fail on white. Measured on `#ffffff`:

| Brand color | Ratio | Passing light value |
| --- | --- | --- |
| `#d22d6f` magenta | 4.83:1 | as is; dark counterpart `#ff7aa8` |
| `#ff944d` orange | 2.19:1 | `#c4510a` |
| `#1f91ad` teal | 3.68:1 | `#177a93` |
| `#ffd36b` yellow | 1.42:1 | decorative only, or a deep gold |

Keep the brand value for dark mode & deepen only the light value.

## Deepening

`variants.js --deepen` (implied by `--accents`) & `contrast.js` both use the same rule: hold the OKLCH hue, move lightness away from the surface until the color meets its target, & reduce chroma only when the color leaves sRGB. The result is the lightest passing shade, so the accent stays as close to the brand as contrast allows. `contrast.js` prints the suggested values; it never edits the spec.

## Reporting

The final report includes the contrast table & names every decorative paint that misses 3:1, for example "the yellow speed line is 2.05:1 on white: decorative". Never round a failing ratio up.
