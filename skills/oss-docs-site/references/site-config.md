# Site settings

A project records how its site is built under the `oss-docs` key of its own `package.json`. The scaffold writes `site` & `flavor`; the maintainer edits the rest. The key's name lives in this skill's `package.json` (`skill.settingsKey`). Content & brand (accent, copy, fonts) stay in `_data/project.json`, & the facts (name, license, links) are read from `package.json` by `_data/site.js` (`references/project-layer.md`).

```json
{
  "oss-docs": {
    "site": "docs",
    "flavor": "landing",
    "oss": true,
    "signals": { "nestedDocs": false, "singleAction": true }
  }
}
```

| Setting | Type | Default | Meaning |
| --- | --- | --- | --- |
| `site` | string | `docs` | Site directory, relative to the repository root & inside it |
| `flavor` | `landing`, `docs`, `workspaces` | none | The confirmed flavor, used without asking |
| `oss` | boolean | `true` | `false` opts out of the studio layer: the config adds the plain Norn plugin, & no banner, call to action, or footer credit is built. Read at build time by `ossEnabled` |
| `signals.nestedDocs` | boolean | detected | Answers "does each workspace get its own docs page?" so `suggest.js` stops guessing |
| `signals.singleAction` | boolean | detected | Answers "does one page cover install & usage?" |

The older `studio` setting is now `oss`. The scaffold moves it: `studio: false` becomes `oss: false`, & `studio: true` is dropped, since on is the default.

The scripts stop only when something cannot work: an unknown flavor, or a site directory outside the repository. When the project has installed `@allons-y/webc-oss-site`, the scaffold also checks the settings against its schema & lists problems in the report.

The scaffold records `site` & `flavor` on its first run & afterward edits only those two keys (& the `studio` move), keeping the rest of the file's keys, order, & indentation. It also adds the devDependencies & scripts the site needs, & never changes one the project already has.

## Options

| Option | Does |
| --- | --- |
| `--target <dir>` | The site directory. Default: the recorded one, else `docs` |
| `--flavor <name>` | The flavor. Default: the recorded one, else `landing` |
| `--accent <color>` | The starter accent for a new `project.css` |
| `--dry-run` | Plan everything, write nothing |
| `--update` | Replace edited files the scaffold owns; rename old layout names in pages. Never touches `project.json`, `project.css`, or page content |
| `--prune` | Remove unedited files from the previous flavor & the copies the older scaffold made |
| `--adopt` | Scaffold into a directory that has files the scaffold did not make. Differing files are kept as drift |
| `--json` | Print the result as JSON |

The JSON result has `flavor`, `site`, `actions` (`path` & `status`), `lockedEdits`, `drift`, `orphans`, `legacy`, `review` (`path` & `note`), & `next`. The exit code is 1 when `lockedEdits` is not empty.

## Drift

The scaffold owns a few files: the config, `_data/site.js`, `_data/workspaces.js`, the directory data, `content/workspaces.md`, the Cypress files, & the Pages workflow. A file that differs from its template is reported as `drift`, & `--update` takes the template version. The project's files, `project.json`, `project.css`, & the Markdown pages, are created once & kept: a rerun reports `kept (project file)` & changes nothing.

## Changing the flavor

Set `flavor` in `package.json` or pass `--flavor <name>`, then rerun. Nothing else is needed.

```text
node scripts/suggest.js --repo .                   # uses the recorded flavor, with no repository scan
node scripts/suggest.js --repo . --reconsider      # scans & asks again
node scripts/scaffold.js --flavor docs --dry-run   # plan the switch
node scripts/scaffold.js --flavor docs             # apply it
```

A file that still matches any flavor's template byte for byte was never edited, so replacing or pruning it loses nothing. This needs no record of the old flavor, so it holds after hand edits & repeated switches.

| File | Result |
| --- | --- |
| Unedited, at a path the new flavor uses (the config, `index.md`) | Replaced: `switched (flavor)` |
| Edited config | Kept as `drift`. `--update` takes the new version |
| Edited page | Kept as the project's. A layout the new flavor does not use is listed for review |
| New-flavor file with no counterpart | Created |
| Unedited, unused by the new flavor | Left as `orphaned`. `--prune` removes it. Edited files are never touched |
| `project.json`, `project.css`, & edited pages | Never touched |

`--dry-run` shows all of it & writes nothing.

## JSON Schema

The `oss-docs` settings schema (draft 2020-12) is `@allons-y/webc-oss-site/schema/oss-docs.schema.json`, & the `project.json` schema is `@allons-y/webc-patterns/schema/project.schema.json` (`references/project-layer.md`). Both ship in their packages, so this skill holds none: the scaffold reads them from the project's `node_modules`, & other tools can validate against their `$id`, the file's URL in the `webc-resources` repository. The keys the scaffold records, `site` & `flavor`, are set in `scripts/lib/settings.js`.
