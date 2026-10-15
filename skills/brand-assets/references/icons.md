# Icons & Open Graph

All icons come from the spec's `favicon` block; `build.js` writes `favicon.svg` (rounded tile) & `icon-square.svg` (square corners), & `export.js` rasterises them.

| File | Size | Rules | project.json |
| --- | --- | --- | --- |
| `favicon.svg` | 64 master | Rounded tile, one glyph, up to two dashes | `favicon` |
| `favicon.ico` | 16, 32, 48 | PNG entries; linked with `sizes="32x32"` so SVG-capable browsers still pick the SVG | `faviconIco` |
| `apple-touch-icon.png` | 180×180 | Opaque RGB, no alpha, square corners: iOS applies its own mask | `appleTouchIcon` |
| `og.png` | 1200×630 | Light theme, wordmark, tagline, optional URL line & accent bar | `ogImage` |

## Favicon

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
