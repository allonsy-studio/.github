# Project layer

Everything a maintainer owns about their site is `docs/_data/project.json` (copy), `docs/content/assets/styles/project.css` (accent & fonts), & the logo & favicon files `project.json` names. The scaffold creates the files once & never overwrites them.

`schema/project.schema.json` in this skill (draft 2020-12) defines the fields: types, defaults, & what each does. It is hosted here & not shipped into projects. Nothing is required.

Settings (flavor, site directory, studio opt-out) live in `package.json`, not here (`references/site-config.md`). Name, license, repository, node range, & links are resolved from `package.json` into `_data/site.js` the first time the scaffold runs, never written here. That file is then the project's to edit; after `package.json` changes, delete it & rerun, or pass `--update`. The scaffold checks the file once when it runs & lists every problem; the built site does not recheck it, so the project can deviate afterward.

Copy: lead with what the project does for the reader, keep `features` to three to six (each may name a Font Awesome Free `icon`, such as `plug` or `brands/github`), & keep `usage` to one copy-pasteable snippet: the landing hero shows it, or the install command when there is none.

Icons: `favicon` takes an svg, png, ico, or webp; `appleTouchIcon` is an optional 180px png; `faviconIco` is an optional legacy .ico linked beside the SVG; `ogImage` is an optional 1200×630 png for link previews. All live in `content/assets/img/`. The `brand-assets` skill makes & sets every one of them.
