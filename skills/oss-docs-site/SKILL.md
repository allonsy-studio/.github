---
name: oss-docs-site
description: "Scaffold, rework, or migrate a project site for an Allons-y Studio open source repository on the published Norn packages: a flavor (Landing, Docs, or Workspaces), the project's own accent & fonts, & the locked studio banner, call to action, & footer credit that the packages provide. Use whenever the user asks to build, rework, migrate, brand, or audit a site, landing page, or GitHub Pages docs for an allonsy-studio project, to change its flavor, to pick which flavor fits a repo, to move a site made with the older copied templates onto the packages, or to check the studio brand, contrast, or accessibility baseline. Do not trigger for general web design, other brands, or sites that are not Allons-y Studio open source projects."
---

# OSS site brand

Builds a project site on three published packages. The skill writes only what the project owns: the Eleventy config, the data files, the pages, the accessibility check, & the Pages workflow. The layouts, components, styles, fonts, highlighted code, & the locked studio layer (banner, call to action, footer credit) come from the packages.

| Package | Provides |
| --- | --- |
| `@allons-y/webc-patterns` | Components, the six `norn-*` layouts, the Eleventy plugin, Markdown add-ons, the data builders, & the `project.json` schema |
| `@allons-y/webc-oss-site` | The Allons-y Studio tokens & fonts, the locked `oss-bar`, `oss-cta`, & `oss-credit`, & the `oss-docs` settings schema |
| `@allons-y/webc-code-sample` | Code highlighted at build time with Shiki |

The scripts need Node 24+ & `yarn install` in this directory. Sites need Node 22 or later. Run the scripts from the project root: `node <skill-path>/scripts/<name>.js`. Voice, style, licensing, & brand colors are in the studio [`AGENTS.md`](../../AGENTS.md).

## Situations

`scripts/suggest.js --repo <repo-root>` reports `scenario` (`new` or `migrate`) &, for `new`, an `existingSiteQuestion`: ask it. For `migrate` it reports `legacySite`. Detail: `references/scenarios.md`.

| Situation | `scenario` | What to do |
| --- | --- | --- |
| New project, no website | `new` | The workflow below |
| Existing website that isn't built with 11ty | `new`, & the answer is yes | Build beside the old site in a new directory, move the content over, retire the old one. The scaffold refuses to write into the old site without `--adopt` |
| Site built with this skill, moving to another flavor | `migrate` | Change the flavor, preview with `--dry-run`, & rerun |
| Site built with the older copied templates (`legacySite: true`) | `migrate` | `--dry-run`, then `--update --prune`, then work through the review list. The old copies must go: the build fails while they stay |
| Project outside the org | none | The scripts decline before writing anything: stop & say why |

## Workflow

```text
- [ ] 1. Suggest a flavor & tooling, then confirm
- [ ] 2. Scaffold
- [ ] 3. Fill the project layer
- [ ] 4. Note the wordmark
- [ ] 5. Install
- [ ] 6. Build & check accessibility
- [ ] 7. Report
```

1. **Suggest, then confirm.** `node scripts/suggest.js --repo <repo-root>` prints a suggestion & applies nothing. A recorded flavor is used without asking or scanning (`--reconsider` scans & asks again). Ask the maintainer to confirm or pick another, then rerun with `--choose <flavor>`. With nobody to ask, use `--unattended` & list the suggestion in the report. For a judgment call (nested docs pages, single action), read the README & pass `--nested-docs yes|no` or `--single-action yes|no`. Detail: `references/flavors.md`.
2. **Scaffold.** `node scripts/scaffold.js --flavor landing`. It writes the site into `docs/`, records the site & flavor in `package.json`, adds the devDependencies & scripts the site needs, reports drift, & never overwrites the project layer. Changing flavors, previews (`--dry-run`), & cleanup (`--prune`): `references/site-config.md`. What is written & who owns it: `references/architecture.md`.
3. **Project layer.** Edit `docs/_data/project.json` for the copy & `docs/content/assets/styles/project.css` for the accent & fonts; ask for the accent if the project has none. Fields: `references/project-layer.md`; rerunning the scaffold checks the file once the packages are installed. Color & fonts: `references/typography-and-color.md`.
4. **Wordmark.** This skill does not make marks. When the project has none, offer the [`brand-assets`](../brand-assets/SKILL.md) skill, which designs the wordmark, favicon, touch icon, legacy icon, & Open Graph image & sets them in `project.json`; for Workspaces it also makes one icon per package. Never block on this: without a mark the header shows the name.
5. **Install.** Run `yarn install`. The scaffold already added the three Norn packages at `^0.1.0-beta.1`, Eleventy, the WebC plugin, & the accessibility tools, plus the `docs:*` scripts. It prints the repository tooling every project carries. Remove the packages the older scaffold added that the project does not use itself (`prismjs`, `@fortawesome/fontawesome-free`, `@11ty/eleventy-fetch`, `markdown-it`).
6. **Build & check.** `yarn docs:build`, then `yarn docs:test`: Cypress runs axe (WCAG 2.2 AA) on every built page in light, dark, & forced-colors. Fix every failure; never loosen the config or edit a package file to pass. Detail: `references/testing.md`.
7. **Report.** The flavor & whether it was confirmed or applied unattended, the tooling suggestions (typedoc for TypeScript, jsdoc for JavaScript), whether the project still needs a wordmark (& that `brand-assets` can make one), any drift, orphans, or review items, & the Cypress result.

## Hard rules

- Studio layer: locked by the packages. A project file named `oss-bar.webc`, `oss-cta.webc`, or `oss-credit.webc` fails the build. A project may opt out whole with `"oss": false` under `oss-docs` in `package.json`; the config reads it with `ossEnabled`. Never copy or patch the locked components.
- Never edit files in `node_modules`. To change a layout, copy it into the project & leave the packaged one out (the Norn plugin's `layouts` option).
- Contacts: the sales address appears only in the call to action above the footer; conduct & security links come from the project's own `CODE_OF_CONDUCT.md` & `SECURITY.md`, else the org's. Never a personal, hey, Gmail, or iCloud address, the `.llc` domain, or a `twitter:card` tag by hand.
- Licenses are read from `package.json` by `buildSite` at build time; which license a project takes is set in `AGENTS.md` (Licensing). Never write a license, license URL, or contact address into a page by hand.
- Theme follows the system (light & dark). No theme switcher.
- Monospace is locked (PT Mono, `--norn-font-mono`). Projects set `--norn-font-body` & `--norn-font-heading` only.
- The accent is one value, `--norn-ui-accent`. The package derives the link color & the text on the accent from it. Never assume white text on it: the Cypress audit catches a failing pair.
- Never overwrite a project's `project.json`, `project.css`, or pages. The scaffold never does, with any flag.

## Reference

| Need | Read |
| --- | --- |
| What the scaffold writes, the packages, studio rules, contacts, licensing | `references/architecture.md` |
| Flavor & tooling suggestion rules, unattended runs | `references/flavors.md` |
| `project.json` fields | `references/project-layer.md` |
| New, rework, migrate, move off the copied templates, outside the org | `references/scenarios.md` |
| `package.json` settings, changing the flavor, drift, pruning | `references/site-config.md` |
| Fonts, accent, contrast | `references/typography-and-color.md` |
| Type, spacing, layers, hooks, print: rules for the project's own CSS | `references/styling.md` |
| Accessibility check | `references/testing.md` |
