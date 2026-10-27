# Typography & color

A project may bring its own font families, but the monospace is the same everywhere.

## Fonts

| Token | Rule |
| --- | --- |
| `--norn-font-body` | Default: the system UI stack from the patterns package. A project may put its own family in front of it |
| `--norn-font-heading` | Headings & the brand link; follows `--norn-font-body` until set |
| `--norn-font-mono` | Locked: PT Mono, then the platform monospace fonts, set by the studio tokens. Do not override it |

Yellowtail is the studio's signature face. It is a flourish only, a limited use: never headings, tag lines, or running text. The one use is the studio layer, which signs the studio name in the call to action title.

`@allons-y/webc-oss-site` self-hosts the fonts & declares them, each with a metric-matched fallback face: PT Mono (preloaded in the head), Instrument Sans (regular & italic, 400 to 700), & Yellowtail. The plugin copies the files to `assets/fonts`, & a face downloads only when text uses it, so unused ones cost nothing. A project sets its fonts in `content/assets/styles/project.css`: put the bundled family first, as `--norn-font-body: "Instrument Sans", "Instrument Sans Fallback", ui-sans-serif, system-ui, sans-serif;`, or load another family there (`@font-face` or `@import`, with `font-display: swap`). No font request goes to another host. The project does not copy font files into the site, & a copy at `content/assets/fonts/` collides with the packaged one & fails the build.

## Accent

Set one `--norn-ui-accent` in `content/assets/styles/project.css` (any CSS color; the scaffold's `--accent` option seeds it). The patterns package derives the rest in CSS, so there is no per-project color math:

- `--norn-text-accent`: the accent darkened on light surfaces & lightened on dark ones, with its lightness bounded, so one expression gives readable text & links on either. A bright accent such as yellow or orange still reads on white.
- `--norn-text-on-accent`: black or white, chosen from the accent's lightness, for text on an accent surface such as a primary button.

A project can set either one directly to override the derived value. A mid-tone accent near the switch point can still leave button text under 4.5:1: the Cypress audit reports it, & the fix is a slightly different accent. The footer's npm badges take their color from the accent: `accentHex` reads `--norn-ui-accent` as a hex value from `project.css`, so set it as `#rrggbb` to color them.

## Contrast

Surfaces & text are the package's. The targets are 4.5:1 for normal text & 3:1 for large text (24 px, or 18.66 px bold) & UI such as the focus ring. The Cypress audit measures rendered text in light & dark (`references/testing.md`); axe does not check non-text contrast.
