# Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `ignoredAxes: ["wdth"]` in the build output | The font has no `wdth` axis (the studio subset has only `wght`) | Run `fonts.js` & use only listed axes |
| `clampedAxes` in the build output | An axis value is outside the font's range | Use a value inside the range `fonts.js` prints |
| `… is reserved for signatures` | A forbidden family such as Yellowtail | Pick the project's sans or display face |
| `… has no glyph for "x"` | The subset lacks a letter | Use the full font file, or a family that covers the name |
| `Spec is invalid` | A field fails `schema/brand.schema.json` | The message lists each path; fix those fields |
| `"x" is not a palette name` | A paint refers to a missing palette entry or gradient | Add it, or prefix gradients with `@` |
| `Chromium for Playwright is missing` | No browser for `sheet.js` or `export.js` | `npx playwright install chromium`, or set `PLAYWRIGHT_BROWSERS_PATH` |
| Builder output cut off, files missing | Output piped into `head` or `tail` closed the pipe early | Redirect to a file instead: `node scripts/build.js … > build.log` |
| `No wordmark.svg or favicon.svg under …` | `sheet.js` ran on a folder the build never wrote | Rerun `build.js` & check its JSON output for errors |
| `project.json is missing` from `wire.js` | The site was never scaffolded | Run oss-docs-site first |
| `… cannot ship as an <img>` | A hand-made SVG has text, external files, script, or no viewBox | Fix the SVG; `references/icons.md` lists each check |
| `has transparent pixels … Pass --background` | A hand-made favicon with rounded corners, exported without a spec | Pass the tile colour as `--background` |
| `share "x" on the same tile` from `family.js build` | Two packages would look the same | Change one glyph or tile in the family file |
| `unmatched` slugs from `wire.js --packages` | A family slug matches no workspace | Use the last segment of the package name |
| `Usage Error: The nearest package directory … doesn't seem to be part of the project` | `yarn install` inside the org repo without a local lock | `touch yarn.lock` in this skill's folder first; it is gitignored |
| Cypress fails on contrast after wiring | A wordmark colour or the accent misses a target | Fix the spec (`contrast.js`), rebuild, & rewire; never loosen the audit |
