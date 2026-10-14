# Project layer

Everything a maintainer owns about their site is `docs/_data/project.json` plus the logo & favicon files it names. The scaffold creates the file once & never overwrites it.

`schema/project.schema.json` in this skill (draft 2020-12) defines the fields: types, defaults, & what each does. It is hosted here & not shipped into projects. Only `accent` is required.

Settings (flavor, site directory, studio opt-out) live in `package.json`, not here (`references/site-config.md`). Name, license, repository, node range, & links are derived from `package.json`, never written here. The scaffold checks the file once when it runs & lists every problem; the built site does not recheck it, so the project can deviate afterward.

Copy: lead with what the project does for the reader, keep `features` to three to six, & keep `usage` to one copy-pasteable snippet.
