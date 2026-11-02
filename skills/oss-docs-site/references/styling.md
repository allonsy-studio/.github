# Styling practices

Defaults the Norn packages follow, & the rules for anything a project adds. They come from the studio website. A project changes the look with tokens in `project.css`; the components, layouts, & their CSS stay in the packages.

## Type

- 16px root, `rem` & `em` for everything else. No `px` type sizes: one root value rescales the page.
- One body sans; `--norn-font-heading` follows it until set. Instrument Sans & Yellowtail are self-hosted by `@allons-y/webc-oss-site`; Yellowtail is a signature face for signing a name, never for headings (`references/typography-and-color.md`).
- `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs & list items.
- Headings: tight `line-height`, no margin.

## Spacing

One `gap` per context, not margins on each element. The layouts make each stacked context (intro, section, card, footer column) a grid, & its children stay margin-free. A `<section>` directly in `main` is a centered column at `--norn-layout-width`; give it an `id` for the anchor.

```css
main > section.mine { display: grid; gap: var(--norn-space-m, 1.25rem); }
```

## Layers & tokens

Every packaged layer sits inside one `norn` layer, in this order: `norn.reset`, `norn.base`, `norn.layout`, `norn.components`, `norn.oss`, `norn.print`. A later layer wins whatever the specificity. Project styles outside a layer beat all of them without `!important`, so `project.css` needs no layer & no specificity tricks.

A shared token is a custom property named for its path: `ui.border.color` is `--norn-ui-border-color`. Every component reads its tokens with the default compiled in as the fallback, so set a token in `project.css` & every component follows. To read one in the project's own CSS, give it the default as the fallback, as the components do: `var(--norn-space-m, 1.25rem)`. Name the project's own tokens by role (`--brand-surface`), never by hue, so a palette swap changes a few lines.

A project that uses its own layers, or a framework such as Tailwind, orders the whole package with one name: `@layer norn, base, components, utilities;`.

## Loading the styles

Each component carries its own CSS, & a page ships only the styles of the components it uses, bundled by Eleventy. The config's `head` hook adds the reset inline & links `/assets/styles/project.css` after it. Project CSS is a plain file: `@import` & `@font-face` rules in it keep working.

| Goal | Do |
| --- | --- |
| Override a token or component | Edit `project.css` |
| Drop the reset | Remove the reset from the `head` fill in `eleventy.config.js`: the components look the same without it |
| Fewer requests | Run a post processor (Lightning CSS, esbuild, PostCSS) over the output; leave `project.css` unbundled so its `@import` & font rules keep working |

Hook on tags & native attributes, not classes:

| Hook | Used for |
| --- | --- |
| The component's tag (`norn-card`, `norn-hero`) & structure (`main > section`, `li > article`) | Most project rules |
| `rel="home"`, `href="#main"` | The brand link, the skip link |
| `role="status"`, `aria-current` | Status text, the current page |
| Inherited custom property + `@container style()` | Variants: `--norn-chrome: terminal` on an ancestor gives code samples inside it a title bar |

Variants come from a container, not a modifier class: it sets a custom property, descendants inherit it, & a style query reads it. Every element is a style container, so no `container-type` is needed; set the property below `html`, which Safari cannot query. Support: Chrome 111, Safari 18, Firefox 151.

Use a `data-*` attribute only when no tag or native attribute fits.

## Syntax colors

Code is colored with the CSS Custom Highlight API, not token spans. Shiki tokenizes at build time & `norn-code-block` writes character ranges; its script registers them as highlights, & the component colors each group with `::highlight()` from the `--norn-code-comment`, `--norn-code-string`, `--norn-code-keyword`, `--norn-code-function`, `--norn-code-number`, & `--norn-code-flag` tokens. The markup stays plain text, so copying code is clean & without the API, or JavaScript, the code simply shows uncolored. Support: Chrome 105, Safari 17.2, Firefox 140. axe cannot see highlight colors, so check a changed token against `--norn-surface-code` at 4.5:1.

## One motif

Spend the boldness in one place. Build a motif from the structure the content implies: a timeline for a sequence, a matrix for a comparison, nesting for a hierarchy. An accent spread over borders is decoration, not a motif.

## Components

- Facts (the row under the hero actions) are an icon & a few words: no border, no fill.
- Tables use hairline rules only. A wide table scrolls sideways inside `norn-simple-table`; the Markdown add-on wraps Markdown tables, so wrap a hand-written one yourself. Split a dense table into focused ones.
- Footer: the name & tagline, npm version & weekly-download badges (shields.io, in the project accent), link columns, & the studio credit. The badges render only when the registry has a release (`npmRelease`, checked at build & cached an hour); with no release, or no network, they are left out.
- Focus rings: 2px, & 1px on links in running text. Bold or large text & controls keep 2px.
- Icons: `norn-icon` draws a built-in set inline as SVG, & a project adds its own with the plugin's `icons` option. They are decorative (`aria-hidden`), sized & colored by the text around them: put one before link text, never in place of it.
- Cards: a heading link covers the whole card; `--norn-card-accent` draws a 2px line along the top.

## Font loading

- Set the line measure in `em`, never `ch`: `ch` is the width of a zero, which differs between a font & its fallback, so a swap would rewrap every paragraph.
- Self-host `woff2`: variable fonts, subset (`unicode-range` for any family that is not Latin), `font-display: swap`.
- A metric-matched fallback `@font-face` (`size-adjust`, `ascent-override`, `descent-override`) so text does not reflow when the font arrives. Compute the values with Capsize or Fontaine; the bundled ones use Capsize's method against Arial (Courier New for PT Mono).

## Print

Design for screen, then retune print: the packages ship a `norn.print` layer with a smaller root size, tighter gaps, hidden controls (nav, copy buttons, actions), & no page breaks inside cards or code. Add project rules in an unlayered `@media print` block.
