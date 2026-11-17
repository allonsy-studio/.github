# Typography & color

A project may bring its own font families, but the monospace is the same everywhere.

## Fonts

| Token | Rule |
| --- | --- |
| `--norn-font-body` | Default: Instrument Sans, set by the OSS site theme (the system UI stack without it). A project may put its own family in front of it |
| `--norn-font-heading` | Headings & the brand link; follows `--norn-font-body` until set |
| `--norn-font-mono` | Locked: PT Mono, then the platform monospace fonts, set by the studio tokens. Do not override it |

Yellowtail is the studio's signature face. It is a flourish only, a limited use: never headings, tag lines, or running text. Its uses are the studio layer's: the "Allons-y" wordmark in the banner, the studio name the call to action signs, & the "Allons-y!" sign-off in the footer credit.

`@allons-y/webc-oss-site` self-hosts the fonts & declares them, each with a metric-matched fallback face. Instrument Sans (regular & italic, 400 to 700) & PT Mono are both preloaded in the head, plus Yellowtail. The theme sets Instrument Sans as the body face. A project that wants another family loads it in `content/assets/styles/project.css` and puts it first: `--norn-font-body: "Your Sans", "Instrument Sans", "Instrument Sans Fallback", system-ui, sans-serif;`. No font request goes to another host. The project does not copy font files into the site, & a copy at `content/assets/fonts/` collides with the packaged one & fails the build.

## Accent

Set one `--norn-ui-accent` in `content/assets/styles/project.css` (any CSS color; the scaffold's `--accent` option seeds it). The patterns package derives the rest in CSS, so there is no per-project color math:

- `--norn-text-accent`: the accent darkened on light surfaces & lightened on dark ones, with its lightness bounded, so one expression gives readable text & links on either. A bright accent such as yellow or orange still reads on white.
- `--norn-text-on-accent`: black or white, chosen from the accent's lightness, for text on an accent surface such as a primary button.

A project can set either one directly to override the derived value. A mid-tone accent near the switch point can still leave button text under 4.5:1: the Cypress audit reports it, & the fix is a slightly different accent. The footer's npm badges take their color from the accent: `accentHex` reads `--norn-ui-accent` as a hex value from `project.css`, so set it as `#rrggbb` to color them.

## Contrast

Surfaces & text are the package's. The targets are 4.5:1 for normal text & 3:1 for large text (24 px, or 18.66 px bold) & UI such as the focus ring. The Cypress audit measures rendered text in light & dark (`references/testing.md`); axe does not check non-text contrast.
