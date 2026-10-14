# Styling practices

Defaults the core CSS follows, & the rules for anything added to a project site. They come from the studio website.

## Type

- 16px root, `rem` & `em` for everything else. No `px` type sizes: one root value rescales the page.
- One body sans plus one display face, the display face used sparingly (the project name or hero only). The studio pairing is Instrument Sans & Yellowtail; the files are in the org's `assets/fonts/`.
- `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs & list items.
- Headings: tight `line-height`, no margin.

## Spacing

One `gap` per context, not margins on each element. The layout layer makes each stacked context (intro, section, card, footer column) a grid selected by tag, & its children stay margin-free.

```css
:is(main > header, main > section, li > article) { display: grid; gap: var(--space-m); }
li > article { gap: var(--space-xs); }
```

## Layers & hooks

Every sheet sits in a cascade layer, in the order `tokens.css` declares: `reset`, `tokens`, `base`, `layout`, `components`, `studio`, `print`. A later layer wins whatever the specificity; project styles outside a layer beat all of them.

Hook on tags & native attributes, not classes:

| Hook | Used for |
| --- | --- |
| Tag & structure (`main > section`, `li > article`, `figure > button`) | Most components |
| `rel="home"`, `href="#main"` | The brand link, the skip link |
| `role="status"` | The copy button's visually hidden message |
| Inherited custom property + `@container style()` | Variants: `--emphasis: low` on a list item quiets its link, `--title-face: mono` on a list sets its card titles in the mono face |
| `data-studio` | The locked studio layer, which has no native equivalent |

Variants come from a container, not a modifier class: it sets a custom property, descendants inherit it, & a style query reads it. Every element is a style container, so no `container-type` is needed; set the property below `html`, which Safari cannot query. Support: Chrome 111, Safari 18, Firefox 151.

Use a `data-*` attribute only when no tag or native attribute fits.

## Syntax colors

Code is colored with the CSS Custom Highlight API, not token spans. Prism tokenizes at build time & writes character ranges on `<code data-tokens>`; `code-highlight.js` registers them as `tok-<group>` highlights, & `components.css` colors each with `::highlight(tok-<group>)` from the `--tok-*` tokens. The markup stays plain text, so copying code is clean & without the API, or JavaScript, the code simply shows uncolored. Support: Chrome 105, Safari 17.2, Firefox 140. axe cannot see highlight colors, so check new `--tok-*` pairs against `--code-bg` at 4.5:1.

## One motif

Spend the boldness in one place. Build a motif from the structure the content implies: a timeline for a sequence, a matrix for a comparison, nesting for a hierarchy. An accent spread over borders is decoration, not a motif.

## Tokens

Name tokens by role (`--accent`, `--fg`, `--fg-muted`, `--bg`), never by hue, so a palette swap changes a few lines.

## Components

- Chips & tags are pill-shaped (`border-radius: 999px`), quiet, & small.
- Tables use hairline rules only: `border-block` on the table, a bottom border per row, a tinted header, no vertical lines or box. Split a dense table into focused ones; put chips in cells for tags.
- Contact details: an icon-led grid beats an inline string, when icons are available.
- Icons: [Font Awesome Free](https://fontawesome.com) 7, inlined as SVG at build time (`<fa-icon @name="brands/github">`, solid by default, or `regular/name`), so they paint with the first frame & nothing blocks render. They are decorative (`aria-hidden`), sized & colored by the text around them: put one before link text, never in place of it. Cards take an optional `icon` in `project.json`.
- Terminal chrome: a container sets `--chrome: terminal`; code samples inside it get the title bar. The home hero sets it.
- Card accents cycle `--feature-1` to `--feature-4`: the project accent, then the studio orange, teal, & yellow. Override them in `project.css`.

## Font loading

- Variable fonts, subset with `unicode-range`, `font-display: swap`.
- A metric-matched fallback `@font-face` (`size-adjust`, `ascent-override`, `descent-override`) so text does not reflow when the font arrives. Compute the values with Capsize or Fontaine.

## Print

Design for screen, then retune print in the `print` layer: a smaller root size, tighter gaps, hidden controls (nav, copy buttons, actions), & no page breaks inside cards or code. The core CSS ships one.
