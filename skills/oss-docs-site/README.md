# oss-docs-site

A skill that scaffolds, reworks, migrates, & checks project sites for Allons-y Studio open source repositories. Each site is built with Eleventy & WebC on the published Norn packages: the project keeps its own accent, fonts, & copy, while a small locked studio layer (banner, call to action, footer credit) comes from the packages & stays identical everywhere.

`SKILL.md` is written for agents. This file is for people: what the skill does, how to run it, & how it is laid out.

## Requirements

Node 24+ & `yarn install` in this directory. Run the scripts from the project being built, & from a checkout of the org's `.github` repository: the org that owns the checkout decides which projects are in scope. A built site needs Node 22 or later.

## The packages

| Package | Provides |
| --- | --- |
| [`@allons-y/webc-patterns`](https://github.com/allonsy-studio/webc-resources/tree/main/packages/webc-patterns#readme) | Components, the layouts (`norn-landing`, `norn-docs-home`, `norn-docs`, `norn-workspaces-home`, `norn-workspace`), the plugin, Markdown add-ons, data builders, & the `project.json` schema |
| [`@allons-y/webc-oss-site`](https://github.com/allonsy-studio/webc-resources/tree/main/packages/webc-oss-site#readme) | The brand tokens, fonts, & the locked `oss-bar`, `oss-cta`, & `oss-credit`, & the `oss-docs` settings schema |
| [`@allons-y/webc-code-sample`](https://github.com/allonsy-studio/webc-resources/tree/main/packages/webc-code-sample#readme) | Code highlighted at build time with Shiki |

The scaffold pins all three at `^0.1.0-beta.1`.

## Usage

```text
node scripts/suggest.js --repo .                  # suggest a flavor & tooling, apply nothing
node scripts/scaffold.js --flavor landing         # scaffold the site into docs/
node scripts/scaffold.js --flavor docs --dry-run  # preview a flavor switch
node scripts/scaffold.js --update --prune         # move a site off the copied templates
```

The scaffold records the site directory & flavor under `oss-docs` in the project's `package.json`, so later runs need no arguments. It also adds the devDependencies & scripts the site needs. Options & behavior: `references/site-config.md`.

## What it writes

| File | What it is |
| --- | --- |
| `docs/eleventy.config.js` | Adds the OSS site plugin & maps the data to the layout props |
| `docs/_data/site.js` | The site facts from `package.json`, through `buildSite` |
| `docs/_data/project.json`, `docs/content/assets/styles/project.css` | The project's copy, accent, & fonts. Never overwritten |
| `docs/content/*.md` | The pages for the flavor, each with a `layout: norn-*.webc`. Never overwritten |
| `docs/cypress.config.js`, `docs/cypress/` | The accessibility check |
| `.github/workflows/pages.yml` | Pages deploy & PR previews |

## Flavors

| Flavor | Pages | Content comes from |
| --- | --- | --- |
| Landing | One page: hero, install, usage, features | `project.json` |
| Docs | A home page plus a sidebar & pager over Markdown | `content/*.md` |
| Workspaces | A home page indexing the packages, plus one page per workspace | Each workspace's `SKILL.md` or `README.md` |

## Moving off the copied templates

An earlier version of this skill copied the layouts, components, styles, scripts, fonts, & studio files into each site. The scaffold finds those files & reports them as orphans, lists the project files that still point at them, & removes the copies with `--prune`. Steps: `references/scenarios.md`.

## Layout

| Path | Contents |
| --- | --- |
| `SKILL.md`, `references/` | Agent instructions & the detail behind them |
| `scripts/` | `suggest.js` & `scaffold.js`, with helpers in `lib/` |
| `templates/shared/` | Files every flavor writes: the site data, starter styles, & the Cypress audit |
| `templates/<flavor>/` | The Eleventy config & pages for each flavor |
| `templates/workflows/` | The Pages workflow |
| `tests/` | The `node:test` suite |
| `evals/` | Task evals & trigger queries |

The schemas are not here: they ship in the packages.

## Tests

```text
node --test "tests/**/*.test.js"
```

## Contributing

Changes follow the org's [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Run `yarn lint` at the repository root before committing; studio voice & style are in [`AGENTS.md`](../../AGENTS.md).

## License

> [MPL-2.0](../../LICENSE): use freely, modify as needed; changes to MPL-licensed files
> should be shared back under the same license.

## TODO

- Add a test that builds a scaffolded site per flavor on the published packages & runs the accessibility check. The suite covers the scaffold, flavor switching, scope check, & migration, but not a built site.
