---
name: oss-docs-site
description: "Scaffold, rework, or migrate a project site for an Allons-y Studio open source repository: a shared core, a flavor (Landing, Docs, or Workspaces), the project's own accent & fonts, and a locked studio banner, call to action, & footer credit. Use whenever the user asks to build, rework, migrate, brand, or audit a site, landing page, or GitHub Pages docs for an allonsy-studio project, to change its flavor, to pick which flavor fits a repo, or to check the studio brand, contrast, or accessibility baseline. Do not trigger for general web design, other brands, or sites that are not Allons-y Studio open source projects."
---

# OSS site brand

Builds a project site from one shared core. Each project keeps its own accent & type; the studio layer (banner, call to action, footer credit) is locked & identical everywhere.

Needs Node 24+ & `yarn install` in this directory. Run the scripts from the project root: `node <skill-path>/scripts/<name>.js`. Voice, style, licensing, & brand colors are in the studio [`AGENTS.md`](../../AGENTS.md).

## Situations

`scripts/suggest.js --repo <repo-root>` reports `scenario` (`new` or `migrate`) &, for `new`, an `existingSiteQuestion`: ask it. Detail: `references/scenarios.md`.

| Situation | `scenario` | What to do |
| --- | --- | --- |
| New project, no website | `new` | The workflow below |
| Existing website that isn't built with 11ty | `new`, & the answer is yes | Build beside the old site in a new directory, move the content over, retire the old one. The scaffold refuses to write into the old site without `--adopt` |
| Site built with this skill, moving to another flavor or newer templates | `migrate` | Change the flavor or rerun with `--update`: unedited files are replaced, edited ones kept |
| Project outside the org | none | The scripts decline before writing anything: stop & say why |

## Workflow

```text
- [ ] 1. Suggest a flavor & tooling, then confirm
- [ ] 2. Scaffold
- [ ] 3. Fill the project layer
- [ ] 4. Note the wordmark
- [ ] 5. Wire package.json
- [ ] 6. Build & check accessibility
- [ ] 7. Report
```

1. **Suggest, then confirm.** `node scripts/suggest.js --repo <repo-root>` prints a suggestion & applies nothing. A recorded flavor is used without asking or scanning (`--reconsider` scans & asks again). Ask the maintainer to confirm or pick another, then rerun with `--choose <flavor>`. With nobody to ask, use `--unattended` & list the suggestion in the report. For a judgment call (nested docs pages, single action), read the README & pass `--nested-docs yes|no` or `--single-action yes|no`. Detail: `references/flavors.md`.
2. **Scaffold.** `node scripts/scaffold.js --target docs --flavor landing`. It records the site & flavor in `package.json`, reports drift, never overwrites the project layer, & flags edits to studio files: fix those with `--update`, never keep them. Changing flavors, previews (`--dry-run`), & cleanup (`--prune`): `references/site-config.md`. Layer rules: `references/architecture.md`.
3. **Project layer.** Edit `docs/_data/project.json` for the copy & `docs/content/assets/styles/project.css` for the accent & fonts; ask for the accent if the project has none. Fields: `references/project-layer.md`; rerunning the scaffold checks the file once. Color & fonts: `references/typography-and-color.md`.
4. **Wordmark.** The skill does not make marks: tell the maintainer the project needs its own wordmark (logo) & favicon in `docs/content/assets/img/`, set as `logo` & `favicon` in `project.json`. Never block on this.
5. **Wire package.json.** Add the devDependencies & scripts the scaffold prints. Never write a license, license URL, or contact address into a template by hand: the scaffold resolves the license from `package.json` into `_data/site.js`.
6. **Build & check.** `yarn docs:build`, then `yarn docs:test`: Cypress runs axe (WCAG 2.2 AA) on every built page in light, dark, & forced-colors. Fix every failure; never loosen the config or edit a locked file to pass. Detail: `references/testing.md`.
7. **Report.** The flavor & whether it was confirmed or applied unattended, the tooling suggestions (typedoc for TypeScript, jsdoc for JavaScript), that the project still needs a wordmark, any drift or locked-file edits, & the Cypress result.

## Hard rules

- Studio layer: locked. A project may opt out whole with `"studio": false` under `oss-docs` in `package.json`, never edit it.
- Contacts: the sales address appears only in the call to action above the footer; conduct & security contacts live in the org's `CODE_OF_CONDUCT.md` & `SECURITY.md`, which the footer links. Never a personal, hey, Gmail, or iCloud address, the `.llc` domain, or a `twitter:card` tag.
- Licenses are resolved from `package.json` by the scaffold; which license a project takes is set in `AGENTS.md` (Licensing).
- Theme follows the system (light & dark). No theme switcher.
- Monospace is locked (PT Mono). Projects override sans & display only.
- Accent shades & the on-accent color are CSS derived from the accent. Never assume white text on it: the Cypress audit catches a failing pair.

## Reference

| Need | Read |
| --- | --- |
| Layers, core contents, studio rules, contacts, licensing | `references/architecture.md` |
| Flavor & tooling suggestion rules, unattended runs | `references/flavors.md` |
| `project.json` fields | `references/project-layer.md` |
| New, rework, migrate, outside the org | `references/scenarios.md` |
| `package.json` settings, changing the flavor | `references/site-config.md` |
| Fonts, accent, contrast | `references/typography-and-color.md` |
| Type, spacing, layers, components, print | `references/styling.md` |
| Accessibility check | `references/testing.md` |
