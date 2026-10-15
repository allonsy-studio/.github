---
name: brand-assets
description: "Designs an Allons-y Studio open source project's wordmark & icon set from outlined font glyphs: three concepts on a light & dark contact sheet, one change per round until the maintainer picks, then the favicon, 180px touch icon, legacy .ico, & 1200×630 Open Graph image, contrast-checked & wired into the oss-docs-site project.json; also one icon per package for Workspaces sites, & rasters from a maintainer's own hand-made SVGs. Use whenever the user asks for a wordmark, logo, favicon, touch icon, package icons, social or Open Graph image for an allonsy-studio project, says a project needs a mark, wants accent or brand color options for an existing logo, has an SVG logo that needs the icon set, or when oss-docs-site reports the project has no wordmark. Do not trigger for mascots or illustration, raster-only logos, trademark questions, the studio's own locked marks (banner, footer credit, mark.svg), or brands outside Allons-y Studio."
---

# Brand assets

Turns a project name into an outlined SVG wordmark & a matching icon set. The maintainer steers; scripts do every repeatable step. The loop "show three, pick, refine one change" is the product: budget for 4 to 8 rounds.

Needs Node 24+ & `touch yarn.lock && yarn install` in this directory (the empty, gitignored lock keeps Yarn from treating the skill as part of the org repo), plus Chromium for Playwright (`npx playwright install chromium`, or an existing `PLAYWRIGHT_BROWSERS_PATH`). Run scripts as `node <skill-path>/scripts/<name>.js`. Work in a scratch folder; only `wire.js` writes into the project.

## Modes

| Ask | Mode | Steps |
| --- | --- | --- |
| "Design a wordmark / logo", no mark yet | Wordmark | All of the workflow |
| Has a logo, needs favicon, touch icon, .ico, or OG image | Icons | 1, 2, then a spec with only `favicon` tuned; steps 6 to 9; `wire.js --icons-only` |
| Has hand-made `wordmark.svg` & `favicon.svg`, needs rasters | Hand-made | Copy them into one folder, then steps 7 to 9; `export.js` checks them first (`references/icons.md`) |
| "Try other colors", "update the brand colors" | Color | Load `<site>/brand.json`, then steps 5, 6, 8, 9 |
| Workspaces project: "icons for each package" | Packages | Needs the project's spec first; then `references/packages.md` |

## Workflow

```text
- [ ] 1. Constraints
- [ ] 2. Fonts
- [ ] 3. Three concepts & a contact sheet
- [ ] 4. Steer, one change per round
- [ ] 5. Color options & contrast
- [ ] 6. Final build
- [ ] 7. Rasters
- [ ] 8. Wire
- [ ] 9. Check & report
```

1. **Constraints.** Ask, don't assume: what the project does in one line, & where the mark renders (header at 32 px, README, social previews). Read the accent from `<site>/content/assets/styles/project.css` & the studio palette in the org `AGENTS.md` (Brand & design). For the metaphor, use one the maintainer already has (dashly: the pipe in `{{ x | filter }}`, "dash" as speed); otherwise draw two or three from the project description (`package.json`, the README, `project.json`), or ask the maintainer when the description is too thin to suggest one. `references/design-rules.md` (Finding a metaphor) has the method & the Font Awesome search. With none accepted, fall back to a clean, strong type-only wordmark.
2. **Fonts.** `node scripts/fonts.js <site>/content/assets/fonts` lists each family, its axes, & flags forbidden ones. Space Grotesk (`assets/fonts/space-grotesk-var.woff2` in the org repo, weight 700) is the first choice for wordmarks; start from `templates/starter.json`. Instrument Sans, the site's own sans, is the second. Put only listed axes in `font.axes`; the build ignores & reports others. Never a forbidden family: Yellowtail is for signatures only.
3. **Concepts.** Write three specs (`concepts/a.json`, `b.json`, `c.json`), each a different idea with a one-line `concept`. Spec fields: `references/spec.md`; start from `templates/starter.json`, or `tests/fixtures/dashly.json` for a fuller example. Then `node scripts/build.js concepts/*.json --out out/concepts` & `node scripts/sheet.js out/concepts`. Show `sheet-light.png` & `sheet-dark.png` (Read them first) & ask which to keep, combine, or drop.
4. **Steer.** Each round edits one idea (motion, weight, skew, which letters carry the accent), rebuilds, & re-renders the sheet. Keep earlier rounds in their own folders so the maintainer can go back. Design rules & ideas that failed before: `references/design-rules.md`.
5. **Color.** For accent options: `node scripts/variants.js --spec final.json --token <name> --accents "#d22d6f,#1f91ad,…" --out out/color`; it deepens any color that misses its target in light mode. For other changes, a `variants.json` of patches. `node scripts/contrast.js final.json` prints the table. Roles & targets: `references/color.md`.
6. **Final build.** `node scripts/build.js final.json --out out/final --flat`. Re-render the sheet with `--forced-colors` & judge the favicon at 16 px first: the magnified raster on the sheet is what a tab shows.
7. **Rasters.** `node scripts/export.js out/final --og --project <repo>` writes `apple-touch-icon.png`, `favicon.ico`, & `og.png`. Read `og.png` before moving on. Icon rules: `references/icons.md`.
8. **Wire.** `node scripts/wire.js out/final --repo <repo> --dry-run`, show the plan, then run it without `--dry-run`. It copies to `<site>/content/assets/img/`, sets `logo`, `favicon`, `faviconIco`, `appleTouchIcon`, & `ogImage` in `project.json`, & saves the spec as `<site>/brand.json`.
9. **Check & report.** `node scripts/wire.js out/final --repo <repo> --audit` (or `yarn docs:build && yarn docs:test` in the project). Report: the chosen concept & its metaphor, the contrast table with any decorative paints named, file sizes, the fields set, & the audit result. Fix failures in the spec, never in the site's test config.

## Hard rules

- Real glyphs only: outline the font's own letters; never draw a letter by hand. Decorations (lines, rectangles) sit beside the letters.
- One SVG per asset: dark mode lives inside the wordmark, never a second file. No `<text>` & no web font reference: an `<img>` SVG cannot load fonts.
- Never change the studio layer (banner, footer credit, studio `mark.svg`) or borrow it: each project has its own identity.
- Text & graphic paints meet their target in both schemes. Decorative paints may miss it, & the report says so.
- Show the sheet before every decision; never pick a concept or color for the maintainer.
- Run builders & redirect output to a file if it is long; never pipe a builder into `head` or `tail`, which can kill it before it writes.

## Reference

| Need | Read |
| --- | --- |
| Every spec field, with the dashly spec annotated | `references/spec.md` |
| Metaphors from Font Awesome, concept ideas, motion, skew, gradients, what failed before | `references/design-rules.md` |
| Contrast roles, deepening, the logotype exemption | `references/color.md` |
| Favicon, touch icon, .ico, & Open Graph rules; hand-made SVGs | `references/icons.md` |
| One icon per Workspaces package, optional package wordmarks | `references/packages.md` |
| Script errors & fixes | `references/troubleshooting.md` |
| Field definitions | `schema/brand.schema.json`, `schema/family.schema.json` |
