# Repository standards

Configuration & settings every studio code repository carries, from toolchain pins to
CI. The rules assume a Yarn monorepo; a single-package repository follows the same files
with one `package.json`. Testing rules live in [testing.md](testing.md).

## Where each file comes from

This repository holds the baseline. Copy these files unchanged, adding only what a row's
note allows.

| File                     | Baseline in this repo        | Note                                             |
| ------------------------ | ---------------------------- | ------------------------------------------------ |
| `.nvmrc`                 | `.nvmrc`                     | Node major only; `26` under this standard        |
| `.yarnrc.yml`            | `.yarnrc.yml`                | Points at the committed Yarn release             |
| `.prettierrc`            | `.prettierrc`                | Tabs, width 4, print width 500                   |
| `.opx/config.json`       | `.opx/config.json`           | Routes JS, JSON, & Markdown to one ESLint config; `opx enable release` adds `"release": true` |
| `.husky/post-commit`     | `.husky/post-commit`         | Runs `opx` hooks & lint; never blocks a commit   |
| `.env.example`           | `.env.example`               | Lists every variable the repo reads              |
| `.github/renovate.json`  | `renovate.json`              | One-month release age, monthly lockfile refresh  |
| `.github/release.yml`    | `release.yml`                | Changelog categories keyed on `type:` labels     |
| `.gitignore`             | `.gitignore`                 | Add `_site` for repos that build an Eleventy site |

Nothing syncs these files. The Weaver workflow ([`sync.yaml`](../.github/workflows/sync.yaml))
updates only the README sections from `templates/`, so a config change here needs a PR in
each repository.

## Toolchain

| Setting           | Value                                     | Where                                              |
| ----------------- | ----------------------------------------- | -------------------------------------------------- |
| Node              | 26 (LTS), tested on 24 too                | `.nvmrc` as `26`, & `engines.node` as `>=24`       |
| Package manager   | Yarn 4 through Corepack                   | `packageManager`, & `.yarn/releases/` committed    |
| Linker            | `nodeLinker: node-modules`                | `.yarnrc.yml`                                      |
| Module format     | ESM only; config & source files end in `.js`, never `.mjs` | `"type": "module"`                |
| TypeScript        | 5, strict, `NodeNext`, only for packages that benefit from strong typing; everything else is vanilla JS | `tsconfig.base.json` |
| Tests             | Vitest for web packages, AVA for lightweight plugins & CLIs; the host ecosystem's technique wins when it has one | [testing.md](testing.md) |
| Lint & format     | `opx` with the `opx-lint-*` presets       | `eslint.config.js`, `.prettierrc`                  |
| Build             | `@allons-y/opx-build-*` if one exists, else esbuild | [Build](#build)                          |
| CSS               | PostCSS with autoprefixer and/or cssnano  | [CSS](#css)                                        |
| Releases          | `opx release`, which wraps Changesets     | [Releases](#releases)                              |
| Browserslist      | `defaults and fully supports es6-module`, `maintained node versions`, `not dead` | root `package.json` |

`.nvmrc` is the version used for development, CI, & deploys. `engines.node` is the oldest
version still supported, & CI must pass on it.

## Root `package.json`

| Field             | Rule                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- |
| `private`         | `true` for a monorepo root                                                            |
| `name`            | The repository name, unscoped: only published packages use the `@allons-y/` npm scope |
| `workspaces`      | `packages/*`, `plugins/*`, & `site` as the repo needs                                 |
| `license`         | Per the [licensing rules](../AGENTS.md#licensing)                                     |
| `repository`      | `git+https://github.com/allonsy-studio/<repo>.git`                                    |
| `devDependencies` | Shared tooling lives here, not in each package                                        |
| `lint-staged`     | Keep only if a hook runs it, & only with scripts that exist (see the gaps below)      |

Root scripts:

| Script      | Value                                                  | Purpose                                      |
| ----------- | ------------------------------------------------------ | -------------------------------------------- |
| `build`     | `yarn workspaces foreach -A --topological run build`   | Build in dependency order                    |
| `ci`        | `yarn workspaces foreach -A --topological run ci`      | Everything a Pages build needs               |
| `test`      | `yarn workspaces foreach -A run test`                  | Every workspace's tests                      |
| `lint`      | `opx lint`                                             | JS, TS, JSON, & Markdown                     |
| `format`    | `opx lint --fix`                                       | Apply lint fixes                             |
| `prepare`   | `husky`                                                | Install hooks                                |
| `version-packages` | `opx release version && yarn install --mode update-lockfile` | Bump versions & refresh the lockfile |
| `release`   | `yarn build && opx release publish`                    | Publish                                      |

A repository that does not publish drops the last two. A single-package repository drops
the `foreach` wrappers & points `build`, `ci`, & `test` at the tool directly.

## Workspace `package.json`

Keep fields in this order.

| Field          | Rule                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------- |
| `name`         | `@allons-y/<name>`                                                                       |
| `version`      | Starts at `0.1.0-beta.0`; `opx release version` bumps it afterward                       |
| `description`  | One sentence, ending with a period                                                       |
| `license`      | `MPL-2.0` unless the licensing rules say Apache-2.0                                      |
| `author`       | `Cassondra Roberts <1840295+castastrophe@users.noreply.github.com> (https://allons-y.studio)` |
| `repository`   | Same URL as the root, plus `directory`                                                   |
| `type`         | `module`                                                                                 |
| `exports`      | `types` before `default`: `{ ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }` |
| `types`, `bin` | `./dist/index.d.ts`; `bin` only for a CLI, pointing into `dist/`                         |
| `files`        | `["dist"]`                                                                               |
| `publishConfig`| `{ "access": "public" }`                                                                 |
| `scripts`      | `build` (the tool from [Build](#build)), `ci` (`yarn build`), `test` (`vitest run` or `ava`) |
| `dependencies` | Sibling packages with a real semver range such as `^0.1.0`, not `workspace:^`: `opx release` publishes with `npm publish`, which would ship the `workspace:` range as written. Yarn still links the local package |

A private workspace (the docs site) sets `"private": true`, omits `exports`, `files`, &
`publishConfig`, & is listed in `.changeset/config.json` under `ignore`.

## TypeScript

| File                  | Rule                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `tsconfig.base.json`  | `target: ES2022`, `module` & `moduleResolution: NodeNext`, `strict`, `declaration`, `declarationMap`, `sourceMap`, `isolatedModules`, `verbatimModuleSyntax` |
| `<package>/tsconfig.json` | `extends` the base; set `rootDir: src` & `outDir: dist`; `include: ["src"]`                           |

Imports keep the `.js` extension. Type-only imports use `import type`.

## Build

| Order | Tool                       | Use when                                                                    |
| ----- | -------------------------- | --------------------------------------------------------------------------- |
| 1     | `@allons-y/opx-build-*`    | A plugin exists for the language. None is published yet; check npm under `@allons-y` |
| 2     | [esbuild](https://esbuild.github.io) | No opx plugin exists: bundling & transpiling JS and TypeScript    |

Output goes to `dist/`, & `files` publishes only `dist`. A TypeScript package that ships
types still runs `tsc` for the declaration files, because esbuild does not emit them.

## CSS

Write plain CSS & compile it with [PostCSS](https://postcss.org) (`postcss` &
`postcss-cli`), configured in `postcss.config.js`.

| Plugin                                           | Use for                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| [autoprefixer](https://github.com/postcss/autoprefixer) | Vendor prefixes, driven by the `browserslist` in `package.json` |
| [cssnano](https://cssnano.github.io/cssnano/)    | Minifying production output                                          |

Use either or both, as the output needs. Site styling rules live in the
[`oss-docs-site` styling reference](../skills/oss-docs-site/references/styling.md).

## Lint, format, & headers

| File                  | Rule                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `eslint.config.js`    | Spread the three `opx-lint-*` presets, then add repo rules. Nothing else is configured by hand            |
| `.license-header.js`  | The SPDX block with the year & `Allons-y Studio`                                                          |
| License header rule   | `eslint-plugin-license-header` on `**/src/**`, `**/test/**`, `**/bin/**`                                  |
| Code comments         | Short JSDoc; explanations belong in the PR or docs                                                        |

## Releases

[`@allons-y/opx-release`](https://www.npmjs.com/package/@allons-y/opx-release) wraps
[Changesets](https://github.com/changesets/changesets) behind `opx release`. Install it
with `opx init`, or with `yarn add --dev @allons-y/opx-release` & `opx enable release`,
which sets `"release": true` in `.opx/config.json`.

| Command               | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `opx release add`     | Record a change; `--type`, `--pkg`, & `--summary` skip prompts |
| `opx release version` | Bump versions & write changelogs                              |
| `opx release publish` | Publish packages not yet on the registry                      |
| `opx release status`  | Show pending changes                                          |

| File                       | Rule                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `.changeset/config.json`   | Written by the first `opx release` command; edit only to `ignore` private packages                |
| `.changeset/README.md`     | One paragraph: add a changeset for any change a consumer would notice; docs, tests, CI, & internal refactors need none |
| `.github/release.yml`      | The baseline above                                                                                |

Continuous delivery uses [`changesets/action`](https://github.com/changesets/action) with
`version: yarn version-packages` & `publish: yarn release`, plus `GITHUB_TOKEN` & `NPM_TOKEN`.
The workflow's token must be allowed to create pull requests (Settings → Actions → General).

`opx release` is at `0.1.0-beta.0`. Plain Changesets commands work on the same files where
it is not adopted yet.

## CI & automation

| File                          | Rule                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`    | On `pull_request` & pushes to `main`. `permissions: contents: read`. Steps: checkout with `persist-credentials: false`, `corepack enable`, `setup-node` with `node-version-file: .nvmrc` & `cache: yarn`, `yarn install --immutable`, `yarn lint`, `yarn build`, `yarn test`. Runs on the `.nvmrc` version & again on Node 24, as a matrix or two jobs; both are required checks |
| `.github/workflows/pages.yml` | Calls the org's reusable `pages.yml@main` with `output-dir`; grants `contents: write` & `pull-requests: write` |
| `.github/renovate.json`       | The baseline above, with `reviewers` naming the maintainer                                   |

Order in CI is lint, build, test: a type error or a style break fails fast, & CLI tests
need the build.

## Documentation

| File         | Rule                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`  | Opens by linking the org file, then: Stack, Commands, Layout, Testing, Source conventions, Commits & attribution      |
| `README.md`  | Weaver-managed header, contribution, license, funding, & footer blocks; hand-written body between them                |
| `LICENSE`    | MPL-2.0 or Apache-2.0 per the org licensing rules                                                                     |

The Commands table in `AGENTS.md` lists only commands that run from the repository root &
that have been run.

## Not covered

GitHub-side settings (branch protection, required checks, merge options, Pages source)
are not files. The one rule that depends on them: both Node jobs in `ci.yml` are required
status checks. Add the rest here once confirmed.

## Adopting the standard

1. Copy the baseline files from the table above.
2. Set `.nvmrc` to `26`, `engines.node` to `>=24`, & `packageManager`, then run `corepack enable` & `yarn install`.
3. TypeScript packages only: add `tsconfig.base.json` & a `tsconfig.json` per package.
4. Add `eslint.config.js` with the license-header rule, & `.license-header.js`.
5. Add the root scripts & the workspace scripts.
6. If the repo publishes, add `@allons-y/opx-release` & run `opx enable release`.
7. Add `ci.yml` with the Node 26 & Node 24 jobs, & `pages.yml`.
8. Add `AGENTS.md` & link [testing.md](testing.md) from its Testing section.
9. Run `yarn lint`, `yarn build`, & `yarn test`.

## Known gaps

| Where                       | Gap                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| This repo                   | `lint-staged` runs `yarn g:lint` & `g:lint:styles`, which no `package.json` defines; no pre-commit hook calls it |
| This repo                   | No `ci.yml`: lint & the skills' tests run nowhere in CI                                      |
| This repo                   | `.nvmrc` says `24`, & no CI job runs Node 26 and 24 side by side                             |
| This repo                   | The root `package.json` is named `@allons-y/core`, a scoped name for an unpublished package  |
| `templates/contribution.md` | Links `.github/CONTRIBUTING.md` & `.github/CODE_OF_CONDUCT.md`; repos without local copies get dead links |
