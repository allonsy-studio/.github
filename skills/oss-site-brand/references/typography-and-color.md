# Typography & color

A project may bring its own font families, but the monospace is the same everywhere.

## Fonts

| Token | Rule |
| --- | --- |
| `--font-sans` | Default: `--sans-stack`, the system UI stack from `tokens.css`. A project may put its own family in front of it |
| `--font-display` | Optional; unset inherits `--font-sans` |
| `--font-mono` | Locked: PT Mono, then the platform monospace fonts. Not overridable |

Self-hostable `woff2` files for PT Mono, Instrument Sans, & Yellowtail are in the org's `assets/fonts/`; load them per `references/styling.md`. Set project fonts in `project.json` (`fonts.sans`, `fonts.display`): the build puts them ahead of the default stack & builds the Google Fonts URL with `display=swap`. It always loads PT Mono & never redeclares `--font-mono`.

## Accent

Set one hex `accent`. The build writes it as `--accent` & `tokens.css` derives the rest in CSS, so there is no per-project color math:

- `--accent-text`: `color-mix(in oklab, var(--accent) 45%, var(--fg))`. `--fg` is dark in light mode & light in dark mode, so one expression pulls the accent toward readable text on either surface.
- `--on-accent`: `oklab(from var(--accent) clamp(0, calc((0.58 - l) * 1000), 1) 0 0)`. Relative color syntax turns the accent's lightness into black or white; `color-mix()` alone cannot choose between two colors.

The 45% mix & the 0.58 threshold are the two knobs. A bright yellow gets dark button text & a darker text shade in light mode, as intended. A mid-tone accent near the threshold can still leave button text under 4.5:1: the Cypress audit reports it, & the fix is a slightly different accent.

## Contrast

Surfaces & text are fixed in `tokens.css`. The targets are 4.5:1 for normal text & 3:1 for large text (24 px, or 18.66 px bold) & UI such as the focus ring. The Cypress audit measures rendered text in light & dark (`references/testing.md`); axe does not check non-text contrast.
