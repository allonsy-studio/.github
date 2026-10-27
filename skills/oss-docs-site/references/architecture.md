# Architecture

A site is the Norn packages plus a few files the project owns. Nothing from the packages is copied into the project, so updates arrive with `yarn upgrade`.

## Layers

| Layer | Owner | Contents | Project can change it? |
| --- | --- | --- | --- |
| Patterns | `@allons-y/webc-patterns` | Components, the six `norn-*` layouts on `norn-base`, the Eleventy plugin, Markdown add-ons, the data builders (`buildSite`, `buildWorkspaces`), the `project.json` schema | Tokens & hooks; copy a layout to change it |
| Code samples | `@allons-y/webc-code-sample` | `norn-code-block`: Shiki at build time, token ranges for the CSS Custom Highlight API, the copy button | Syntax color tokens |
| Studio | `@allons-y/webc-oss-site` (locked) | The brand tokens, the self-hosted fonts, `oss-bar`, `oss-cta`, `oss-credit`, & the `oss-docs` settings schema | Opt out only |
| Scaffold | This skill | The config, data files, accessibility check, Pages workflow, `package.json` wiring | Edit; drift is reported |
| Flavor | This skill | The pages for Landing, Docs, or Workspaces, suggested from the repo & confirmed by the maintainer | Pick one |
| Project | Maintainer | Accent & fonts (`project.css`), copy (`project.json`), logo & favicon, the Markdown pages | Yes. Never overwritten |

`REPO_DEV_DEPENDENCIES` in `scripts/lib/layers.js` lists the tooling every repository carries. The scaffold prints it & does not add it.

## What the scaffold writes

| File | Owner after the first run |
| --- | --- |
| `eleventy.config.js` | Scaffold. Adds the OSS site plugin, the head hook (the reset & `project.css`), & the props mapping |
| `_data/site.js` | Scaffold. `buildSite` with the OSS site `host`, plus the npm release check & badge color for the footer |
| `_data/workspaces.js` | Scaffold (Workspaces). `buildWorkspaces` over the repository root |
| `content/index.11tydata.js`, `content/workspaces.11tydata.js`, `content/workspaces.md` | Scaffold. The directory layout for Docs, & the one page per workspace |
| `cypress.config.js`, `cypress/` | Scaffold. The accessibility check (`references/testing.md`) |
| `.github/workflows/pages.yml` | Scaffold |
| `_data/project.json` | Project |
| `content/assets/styles/project.css` | Project |
| `content/*.md` | Project. An unedited page switches with its flavor |
| `package.json` | Settings under `oss-docs`, & the devDependencies & scripts the site needs. Existing entries are never changed |

Nothing else is written: no layouts, includes, styles, scripts, fonts, icons, highlight helper, or studio files. A site made with the older scaffold has them; `references/scenarios.md` covers the move.

## The config

One config per flavor, shaped like the Norn fixtures. It adds the OSS site plugin (or the plain Norn plugin when the project opts out), which owns the one WebC registration. Do not add `@11ty/eleventy-plugin-webc` again, or add the Norn plugin beside the OSS site plugin: both fail the build. The `props` mapping turns the data (`site`, `project`, the docs collection, the workspaces) into the layout props. Projects add their own components in `_includes/`, with a prefix other than `norn-` & `oss-`.

## Studio layer

Locked by the packages: a project file named `oss-bar.webc`, `oss-cta.webc`, or `oss-credit.webc` collides with the packaged one & fails the build, & no page data removes the hook fills. The scaffold lists such a file under `lockedEdits` & exits with an error. Opting out is a setting: `"oss": false` under `oss-docs` in `package.json`. The config reads it with `ossEnabled` & passes `oss: false` to `ossProps`, so no banner, call to action, credit, studio CSS, or studio link is left.

The banner comes before the header, with a four-color stripe on the header bar. The call to action closes `main`, directly above the footer, which holds the project lock-up (name, link columns, & the studio credit). Their SVGs & text are inlined into the packaged components when the package is built, so a site needs no network & no org checkout for them. `consulting@allons-y.studio` appears only in the call to action. Conduct & security links use the project's own `CODE_OF_CONDUCT.md` & `SECURITY.md` when it keeps them, & the org's otherwise.

Brand colors, voice, & style: `AGENTS.md`.

## Licensing

Which license a project takes is set in `AGENTS.md` (Licensing). Sites never hard-code one: `buildSite` reads it from `package.json` when Eleventy runs, so a change in `package.json` shows on the next build.
