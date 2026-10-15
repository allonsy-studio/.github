# Package icons

For Workspaces projects (`agent-skills` is the model): one icon per workspace package, all from the project's own spec, so the family shares a font, tile shape, skew, & palette. A package gets its own wordmark only when the maintainer asks for one.

## Contents

- [Workflow](#workflow)
- [The family file](#the-family-file)
- [Choosing glyphs & tiles](#choosing-glyphs--tiles)
- [On the site](#on-the-site)

## Workflow

```text
- [ ] 1. The project spec exists (Wordmark mode, or <site>/brand.json)
- [ ] 2. Propose: family.js init
- [ ] 3. Review the proposals with the maintainer
- [ ] 4. Build & sheet
- [ ] 5. Wire & check
```

1. **Spec.** The family inherits everything from the project spec. Without one, run Wordmark or Icons mode first.
2. **Propose.** `node scripts/family.js init --repo <repo> --spec <site>/brand.json --out family.json` lists the workspaces (the same globs the site reads) & proposes a glyph & tile for each.
3. **Review.** Show the proposals as a short table (package, glyph, tile). Ask which packages, if any, should also get a wordmark (`"wordmark": true`, with `text` when the slug is not what readers call it).
4. **Build.** `node scripts/family.js build family.json --out out/packages`, then `node scripts/sheet.js out/packages`. The sheet opens with a "Together" strip: every icon side by side & in both tab bars, where look-alikes show. The build output lists `clashes` & per-package contrast failures.
5. **Wire.** `node scripts/wire.js --packages out/packages --repo <repo> --family family.json --dry-run`, then without `--dry-run`. Report any `unmatched` slugs: those icons never show, because no workspace has that slug. Then build & audit the site.

## The family file

`schema/family.schema.json` defines it. `base` is the project spec relative to the family file; each package needs only `slug`.

```json
{
	"base": "brand.json",
	"packages": [
		{ "slug": "skill-design-system", "glyph": "ds", "tile": "orange", "wordmark": true, "text": "design-system" },
		{ "slug": "skill-structured-data", "glyph": "s", "tile": "teal" }
	]
}
```

`patch` takes any other spec change for one package, deep-merged last. `wire.js --family` saves the file as `<site>/brand.packages.json`, pointing at `brand.json` when that is wired too.

## Choosing glyphs & tiles

- `init` drops a leading word most packages share (`skill-` in agent-skills), then tries the first letter, the initials of two words, & the first two letters, keeping glyphs distinct across the family.
- Distinct glyphs first: a tile colour alone is a weak signal, & none at all for some colour vision.
- Tiles cycle through palette colours & gradients that read in both tab strips with the favicon ink; ink-dark tiles are left out.
- One to three letters fit; wider glyphs shrink to keep a margin inside the tile.
- Every package icon sits on one shared baseline (`favicon.align: "baseline"`), so `a`, `d`, & `g` line up across the strip; a package `patch` can set `align: "ink"` to centre one on its letter instead.
- The slug is the last segment of the package name: the site's URL & the icon's file name.

## On the site

| File | Shows |
| --- | --- |
| `content/assets/img/packages/<slug>.svg` | The package card on the home page & beside the package page heading |
| `content/assets/img/packages/<slug>-wordmark.svg` | In place of the package page heading text, with the package name as alt text |

No `project.json` fields: the Workspaces flavor finds the files by slug. Remove a package wordmark by rebuilding without `"wordmark": true` & rewiring; `wire.js` deletes the stale file. A package wordmark should spell what readers call the package, since the heading's visible text becomes the image.
