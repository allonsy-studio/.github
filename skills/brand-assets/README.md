# brand-assets

A skill that designs a wordmark & icon set for an Allons-y Studio open source project & installs them into its oss-docs-site. Letters are outlined from the project's font, so the SVGs need no font at render time; light & dark colours swap inside one file.

`SKILL.md` is written for agents. This file is for people: what the skill makes, how to run it, & how it is laid out.

## What it makes

| File | Use |
| --- | --- |
| `wordmark.svg` | Site header logo & README image, with dark mode inside the SVG |
| `favicon.svg` | Browser tab icon |
| `favicon.ico` | 16, 32, & 48 px legacy icon |
| `apple-touch-icon.png` | 180 px opaque home-screen icon |
| `og.png` | 1200×630 link preview |
| `brand.json` | The spec, kept beside the site for later changes |

## Requirements

Node 24+, `yarn install` in this directory, & Chromium for Playwright (`npx playwright install chromium`, or point `PLAYWRIGHT_BROWSERS_PATH` at an existing install).

## Usage

```text
node scripts/fonts.js docs/content/assets/fonts                 # families, axes, forbidden faces
node scripts/build.js concepts/*.json --out out/concepts         # one folder of SVGs per spec
node scripts/sheet.js out/concepts                               # light & dark contact sheets
node scripts/variants.js --spec final.json --token hot \
  --accents "#d22d6f,#1f91ad" --out out/colour                   # accent options, deepened to pass
node scripts/contrast.js final.json                              # WCAG table; exits 1 on a miss
node scripts/build.js final.json --out out/final --flat
node scripts/export.js out/final --og --project .                # touch icon, .ico, Open Graph
node scripts/wire.js out/final --repo . --dry-run                # then without --dry-run
```

## Layout

| Path | Contents |
| --- | --- |
| `SKILL.md`, `references/` | Agent instructions & the detail behind them |
| `scripts/` | One CLI per step, with shared code in `lib/` |
| `schema/brand.schema.json` | The spec format |
| `tests/` | `node --test` suite; `fixtures/dashly.json` rebuilds the dashly mark |
| `evals/` | Task evals & trigger queries |

## Contributing

Changes follow the org's [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Run `yarn test` here & `yarn lint` at the repository root before committing; studio voice & style are in [`AGENTS.md`](../../AGENTS.md).

## License

> [MPL-2.0](../../LICENSE): use freely, modify as needed; changes to MPL-licensed files
> should be shared back under the same license.
