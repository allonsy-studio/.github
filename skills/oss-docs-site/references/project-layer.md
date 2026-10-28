# Project layer

Everything a maintainer owns about their site is `docs/_data/project.json` (copy), `docs/content/assets/styles/project.css` (accent & fonts), the Markdown pages in `docs/content/`, & the logo & favicon files `project.json` names. The scaffold creates them once & never overwrites them, with any flag.

The schema for `project.json` (draft 2020-12) is `@allons-y/webc-patterns/schema/project.schema.json`. It defines the fields: types, defaults, & what each does. It ships in the package & is not copied into projects, so a new `project.json` links it with `$schema` for editors. Nothing is required.

Settings (flavor, site directory, studio opt-out) live in `package.json`, not here (`references/site-config.md`). A `flavor`, `site`, `oss`, or `studio` key in `project.json` is reported as misplaced. Name, license, repository, node range, & links are read from `package.json` by `buildSite` in `_data/site.js` each time Eleventy runs, never written here. To change them, change `package.json`.

The scaffold checks `project.json` once per run & lists every problem. The check needs the schema, which is read from the project's `node_modules`: before `yarn install` it reports that the file was not checked. The built site does not recheck it, so the project can deviate afterward.

Copy: lead with what the project does for the reader, keep `features` to three to six, & keep `usage` to one copy-pasteable snippet: the landing hero shows it, or the install command when there is none. Cards take no icon: the Norn cards render none, so a `features[].icon` from the older scaffold is reported & can go.

Icons: `favicon` takes an svg, png, ico, or webp; `appleTouchIcon` is an optional 180px png; `ogImage` is an optional 1200×630 png for link previews. All live in `content/assets/img/`, & the config passes `ogImage` on as the page's `og:image`. `faviconIco` is no longer linked: the Norn layouts take one icon & the touch icon. The `brand-assets` skill makes & sets these files.
