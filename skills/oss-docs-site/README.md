# oss-site-brand

A skill that scaffolds, reworks, & checks project sites for Allons-y Studio open source repositories. Each site is built with Eleventy & WebC from one shared core: the project keeps its own accent, fonts, & copy, while a small locked studio layer (banner, call to action, footer credit) stays identical everywhere.

`SKILL.md` is written for agents. This file is for people: what the skill does, how to run it, & how it is laid out.

## Requirements

Node 24+ & `yarn install` in this directory. Run the scripts from the project being built, & from a checkout of the org's `.github` repository: the studio SVGs are read from its `assets/svg/`.

## Usage

```text
node scripts/suggest.js --repo .                  # suggest a flavor & tooling, apply nothing
node scripts/scaffold.js --flavor landing         # scaffold the site into docs/
node scripts/scaffold.js --flavor docs --dry-run  # preview a flavor switch
```

The scaffold records the site directory & flavor under `oss-docs` in the project's `package.json`, so later runs need no arguments. Options & behavior: `references/site-config.md`.

## Flavors

| Flavor | Pages | Content comes from |
| --- | --- | --- |
| Landing | One page: hero, install, usage, features | `project.json` |
| Docs | A home page plus a sidebar & pager over Markdown | `src/docs/*.md` |
| Workspaces | A home page indexing the packages, plus one page per workspace | Each workspace's `SKILL.md` or `README.md` |

## Layout

| Path | Contents |
| --- | --- |
| `SKILL.md`, `references/` | Agent instructions & the detail behind them |
| `scripts/` | `suggest.js` & `scaffold.js`, with helpers in `lib/` |
| `templates/shared/` | The core copied into every site: CSS, JS, components, Eleventy config, Cypress audit |
| `templates/<flavor>/` | Page templates for each flavor |
| `templates/workflows/` | The Pages workflow |
| `oss-docs.schema.json` | Schema for the `oss-docs` settings in `package.json` |
| `project.schema.json` | Schema for a site's `project.json` |
| `evals/` | Task evals & trigger queries |

The schemas are hosted here & not shipped into projects.

## Contributing

Changes follow the org's [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Run `yarn lint` at the repository root before committing; studio voice & style are in [`AGENTS.md`](../../AGENTS.md).

## License

> [MPL-2.0](../../LICENSE): use freely, modify as needed; changes to MPL-licensed files
> should be shared back under the same license.

## TODO

- Evaluate adding a test suite for the scaffold, flavor switching, scope check, & a built fixture site.
- Evaluate shipping the shared & studio resources as a package that projects install, so updates & changes flow down to them instead of being copied by the scaffold.
- Package the highlight range output & the `::highlight()` runtime as a Prism plugin or companion package, so other projects can use the Custom Highlight API with Prism.
- Evaluate a neutral build for projects outside the org: studio layer opted out, the project's own contacts, URL, & hosting.
