# Icons & Open Graph

All icons come from the spec's `favicon` block; `build.js` writes `favicon.svg` (rounded tile) & `icon-square.svg` (square corners), & `export.js` rasterises them.

| File | Size | Rules | project.json |
| --- | --- | --- | --- |
| `favicon.svg` | 64 master | Rounded tile, one glyph, up to two dashes | `favicon` |
| `favicon.ico` | 16, 32, 48 | PNG entries; linked with `sizes="32x32"` so SVG-capable browsers still pick the SVG | `faviconIco` |
| `apple-touch-icon.png` | 180×180 | Opaque RGB, no alpha, square corners: iOS applies its own mask | `appleTouchIcon` |
| `og.png` | 1200×630 | Light theme, wordmark, tagline, optional URL line & accent bar | `ogImage` |

## Hand-made SVGs

A maintainer's own `wordmark.svg` & `favicon.svg` (no `meta.json` beside them) export & wire too. Both scripts check them first & refuse any that would break as an `<img>`:

| Refused | Why |
| --- | --- |
| `<text>`, `@font-face`, `@import` | An `<img>` SVG loads no fonts; outline the text |
| External `href` | An `<img>` SVG fetches nothing |
| Script or `on…` handlers | They never run & some hosts strip the file |
| No `viewBox`; a favicon that is not square | It cannot scale to the header or icon sizes |

Missing `<title>`, missing dark-mode rules, & embedded raster images are warnings in the output. Without a spec, pass what it would have supplied: `--background` (fills transparent corners on the touch icon; required when there are any), `--accent` (the Open Graph bar; none otherwise), `--font` (the tagline face; system UI otherwise), `--name`, & `--url`. The contrast check needs a spec, so look at the sheet instead: `sheet.js` reads any folder.

## Favicon

- Sizing (`favicon.fit`): `x-height` by default, with lowercase at 48% of the tile (`fill`), so `a` & `s` fill about half the tile & ascenders reach past it. `ink` makes every letter equally full but makes a family uneven; `em` is the old em-box sizing that left short letters small. Any fit shrinks to keep 10% of the tile clear on every side.
- Alignment (`favicon.align`): a single favicon is centred on its letter (`ink`); package families share one baseline (`baseline`, which `family.js` sets) so `d`, `g`, & `a` line up across the set. `lift` raises either by a share of the tile; it is off by default because 2% barely shows at 64 px.
- Judge at 16 px first. The contact sheet shows a magnified 16 px raster: that is what a tab shows, not the scaled SVG.
- Prefer a coloured or gradient tile with a white glyph. Coloured marks on a coloured tile lose contrast (yellow on orange fails).
- An ink or near-black tile disappears in dark tab bars; the sheet shows both tab bars.
- The glyph is usually the first letter; pick another only if it carries the metaphor.
- Two dashes survive at 16 px; three merge.

## Touch icon

- Keep content out of the corners: iOS rounds them away. The default `scale` (0.72) leaves room.
- No transparency: transparent pixels turn black on some launchers. `export.js` writes RGB only.

## Legacy .ico

Modern browsers use the SVG. The .ico covers tools that request `/favicon.ico` directly & older Windows surfaces. It costs a few kilobytes.

## Open Graph image

- One image for both schemes: link previews never follow dark mode, so it uses the light surface.
- The tagline defaults to `project.json` `tagline`; keep it to two lines at 46 px.
- `og.url` is the site address without `https://`.
- Check it scaled down: link previews often show it near 500 px wide, so the wordmark is 180 px tall on the canvas.
- The site head renders `og:image`, its size, & its alt text from `ogImage`; there is no `twitter:card`.
