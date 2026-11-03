# Repository standards

Configuration & settings every studio code repository carries. The reference
implementation is [webc-docs](https://github.com/allonsy-studio/webc-docs), a Yarn
monorepo; a single-package repository follows the same files with one `package.json`.
Testing rules live in [testing.md](testing.md).

## Where each file comes from

This repository holds the baseline. Copy these files unchanged. webc-docs matches them
byte for byte (checked 2026-11-03), except `.gitignore`, which adds `_site`.

| File                     | Baseline in this repo        | Note                                             |
| ------------------------ | ---------------------------- | ------------------------------------------------ |
| `.nvmrc`                 | `.nvmrc`                     | Node major only                                  |
| `.yarnrc.yml`            | `.yarnrc.yml`                | Points at the committed Yarn release             |
| `.prettierrc`            | `.prettierrc`                | Tabs, width 4, print width 500                   |
| `.opx/config.json`       | `.opx/config.json`           | Routes JS, JSON, & Markdown to one ESLint config |
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
| Node              | 24                                        | `.nvmrc`, & `engines.node` as `>=24`               |
| Package manager   | Yarn 4 through Corepack                   | `packageManager`, & `.yarn/releases/` committed    |
| Linker            | `nodeLinker: node-modules`                | `.yarnrc.yml`                                      |
| Module format     | ESM only                                  | `"type": "module"`                                 |
| TypeScript        | 5, strict, `NodeNext`                     | `tsconfig.base.json`                               |
| Tests             | Vitest                                    | [testing.md](testing.md)                           |
| Lint & format     | `opx` with the `opx-lint-*` presets       | `eslint.config.js`, `.prettierrc`                  |
| Releases          | Changesets                                | `.changeset/`                                      |
| Browserslist      | `defaults and fully supports es6-module`, `maintained node versions`, `not dead` | root `package.json` |

Bump Node in `.nvmrc` & `engines` together.

## Root `package.json`

| Field             | Rule                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- |
| `private`         | `true` for a monorepo root                                                            |
| `name`            | The repository name                                                                   |
| `workspaces`      | `packages/*`, `plugins/*`, & `site` as the repo needs                                 |
| `license`         | Per the [licensing rules](../AGENTS.md#licensing)                                     |
| `repository`      | `git+https://github.com/allonsy-studio/<repo>.git`                                    |
| `devDependencies` | Shared tooling lives here, not in each package                                        |
| `lint-staged`     | Keep only if a hook runs it, & only with scripts that exist. Neither baseline repo uses it      |

Root scripts:

| Script      | Value                                                  | Purpose                                      |
| ----------- | ------------------------------------------------------ | -------------------------------------------- |
| `build`     | `yarn workspaces foreach -A --topological run build`   | Build in dependency order                    |
| `ci`        | `yarn workspaces foreach -A --topological run ci`      | Everything a Pages build needs               |
| `test`      | `yarn workspaces foreach -A run test`                  | Every workspace's tests                      |
| `typecheck` | `tsc -p tsconfig.test.json`                            | Type-check `src` & `test`; TypeScript repos  |
| `lint`      | `opx lint`                                             | JS, TS, JSON, & Markdown                     |
| `format`    | `opx lint --fix`                                       | Apply lint fixes                             |
| `prepare`   | `husky`                                                | Install hooks                                |
| `changeset` | `changeset`                                            | Add a release note                           |
| `version`   | `changeset version && yarn install --mode update-lockfile` | Bump versions                            |
| `release`   | `yarn build && changeset publish`                      | Publish                                      |

A repository without Changesets drops the last three. A single-package repository drops the
`foreach` wrappers & points `build`, `ci`, & `test` at the tool directly.

## Workspace `package.json`

Keep fields in this order.

| Field          | Rule                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------- |
| `name`         | `@allons-y/<name>`                                                                       |
| `version`      | Starts at `0.1.0-beta.0`, as in webc-docs; changesets bump it afterward                  |
| `description`  | One sentence, ending with a period                                                       |
| `license`      | `MPL-2.0` unless the licensing rules say Apache-2.0                                      |
| `author`       | `Cassondra Roberts <1840295+castastrophe@users.noreply.github.com> (https://allons-y.studio)` |
| `repository`   | Same URL as the root, plus `directory`                                                   |
| `type`         | `module`                                                                                 |
| `exports`      | `types` before `default`: `{ ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }` |
| `types`, `bin` | `./dist/index.d.ts`; `bin` only for a CLI, pointing into `dist/`                         |
| `files`        | `["dist"]`                                                                               |
| `publishConfig`| `{ "access": "public" }`                                                                 |
| `scripts`      | `build` (`tsc -p tsconfig.json`), `ci` (`yarn build`), `test` (`vitest run`)             |
| `dependencies` | Sibling packages as `workspace:^`                                                        |

A private workspace (the docs site) sets `"private": true`, omits `exports`, `files`, &
`publishConfig`, & is listed in `.changeset/config.json` under `ignore`.

## TypeScript

| File                  | Rule                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `tsconfig.base.json`  | `target: ES2022`, `module` & `moduleResolution: NodeNext`, `strict`, `declaration`, `declarationMap`, `sourceMap`, `isolatedModules`, `verbatimModuleSyntax` |
| `<package>/tsconfig.json` | `extends` the base; set `rootDir: src` & `outDir: dist`; `include: ["src"]`                           |
| `tsconfig.test.json`  | At the root: `extends` the base, `noEmit`, `include` every package's `src` & `test`; `yarn typecheck` runs it |

Imports keep the `.js` extension. Type-only imports use `import type`.

## Lint, format, & headers

| File                  | Rule                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `eslint.config.js`    | Spread the three `opx-lint-*` presets, then add repo rules. Nothing else is configured by hand            |
| `.license-header.js`  | The SPDX block with the year & `Allons-y Studio`                                                          |
| License header rule   | `eslint-plugin-license-header` on `**/src/**`, `**/test/**`, `**/bin/**`                                  |
| Code comments         | Short JSDoc; explanations belong in the PR or docs                                                        |

## Releases

| File                       | Rule                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `.changeset/config.json`   | `@changesets/changelog-github` with `repo`, `access: public`, `baseBranch: main`, `updateInternalDependencies: patch` |
| `.changeset/README.md`     | One paragraph: add a changeset for any change a consumer would notice; docs, tests, CI, & internal refactors need none |
| `.github/release.yml`      | The baseline above                                                                                |

## CI & automation

| File                          | Rule                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`    | On `pull_request` & pushes to `main`. `permissions: contents: read`. Steps: checkout with `persist-credentials: false`, `corepack enable`, `setup-node` with `node-version-file: .nvmrc` & `cache: yarn`, `yarn install --immutable`, `yarn lint`, `yarn build`, `yarn typecheck`, `yarn test` |
| `.github/workflows/pages.yml` | Calls the org's reusable `pages.yml@main` with `output-dir`; grants `contents: write` & `pull-requests: write` |
| `.github/renovate.json`       | The baseline above, with `reviewers` naming the maintainer                                   |

Order in CI is lint, build, typecheck, test: a style break or a type error fails fast, &
CLI tests need the build. A repository with nothing to build drops `build` & `typecheck`,
as this one does.

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
are not files, so the reference repository does not show them. Add them here once
confirmed.

## Adopting the standard

1. Copy the baseline files from the table above.
2. Set `.nvmrc`, `engines.node`, & `packageManager`, then run `corepack enable` & `yarn install`.
3. Add `tsconfig.base.json` & a `tsconfig.json` per package.
4. Add `eslint.config.js` with the license-header rule, & `.license-header.js`.
5. Add the root scripts & the workspace scripts.
6. Add `.changeset/` if the repo publishes.
7. Add `ci.yml` & `pages.yml`.
8. Add `AGENTS.md` & link [testing.md](testing.md) from its Testing section.
9. Run `yarn lint`, `yarn build`, `yarn typecheck`, & `yarn test`.
