# Site settings

A project records how its site is built under the `oss-docs` key of its own `package.json`. The scaffold writes the key; the maintainer edits it. The key's name lives in this skill's `package.json` (`skill.settingsKey`). Content & brand (accent, copy, fonts) stay in `_data/project.json`, & the facts resolved from `package.json` are in `_data/site.js` (`references/project-layer.md`).

```json
{
  "oss-docs": {
    "site": "docs",
    "flavor": "landing",
    "studio": true,
    "signals": { "nestedDocs": false, "singleAction": true }
  }
}
```

| Setting | Type | Default | Meaning |
| --- | --- | --- | --- |
| `site` | string | `docs` | Site directory, relative to the repository root & inside it |
| `flavor` | `landing`, `docs`, `workspaces` | none | The confirmed flavor, used without asking |
| `studio` | boolean | `true` | `false` opts out of the studio layer. The files stay locked. Resolved into `_data/site.js`: delete it & rerun, or pass `--update`, after changing it |
| `signals.nestedDocs` | boolean | detected | Answers "does each workspace get its own docs page?" so `suggest.js` stops guessing |
| `signals.singleAction` | boolean | detected | Answers "does one page cover install & usage?" |

Existing values are read as written: nothing is validated against the schema. The scripts stop only when something cannot work: an unknown flavor, or a site directory outside the repository.

The scaffold records `site` & `flavor` on its first run & afterward edits only those two keys, keeping the rest of the file's keys, order, & indentation. `studio` & `signals` are the maintainer's to add.

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
| Shared core & studio files | Refreshed as on any rerun: drift kept, locked edits reported |
| Unedited, at a path the new flavor uses | Replaced: `switched (flavor)` |
| Edited, at a path the new flavor uses | Kept as `drift`. `--update` takes the new version |
| New-flavor file with no counterpart | Created |
| Unedited, unused by the new flavor | Left as `orphaned`. `--prune` removes it. Edited files are never touched |
| `project.json` & other project files | Never touched |

`--dry-run` shows all of it & writes nothing.

## JSON Schema

`schema/oss-docs.schema.json` (draft 2020-12) defines the settings. It is hosted here & not shipped into projects: the scaffold reads it to decide what to record (`site` & `flavor`, with the default site), & other tools can validate the `oss-docs` key against its `$id`, the file's URL in the org's `.github` repository. `schema/project.schema.json` does the same for `project.json` (`references/project-layer.md`).
