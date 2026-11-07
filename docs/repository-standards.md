# Repository standards

Configuration & settings every studio code repository carries, from toolchain pins to
CI. The rules assume a Yarn monorepo; a single-package repository follows the same files
with one `package.json`. Testing rules live in [testing.md](testing.md).

## Where each file comes from

This repository holds the baseline. Copy these files unchanged, adding only what a row's
note allows.

| File                     | Baseline in this repo        | Note                                             |
| ------------------------ | ---------------------------- | ------------------------------------------------ |
| `.nvmrc`                 | `.nvmrc`                     | Node major only                                  |
| `.yarnrc.yml`            | `.yarnrc.yml`                | Points at the committed Yarn release             |
| `.prettierrc`            | `.prettierrc`                | Tabs, width 4, print width 500                   |
| `.opx/config.json`       | `.opx/config.json`           | Routes JS, JSON, & Markdown to one ESLint config; `opx enable release` adds `"release": true` |
| `.husky/post-commit`     | `.husky/post-commit`         | Runs `opx` hooks & lint; never blocks a commit. A repository with its own hooks (`pre-commit`, `commit-msg`) keeps them |
| `.env.example`           | `.env.example`               | Lists every variable the repo reads; required only where it reads some |
| `.github/CODEOWNERS`     | `.github/CODEOWNERS`         | One line, `* @castastrophe`; the ruleset requires code owner review |
| `.github/renovate.json`  | `renovate.json`              | One-month release age, monthly lockfile refresh, & `@changesets/cli` held below 3 |
| `.github/release.yml`    | `release.yml`                | Changelog categories keyed on `type:` labels     |
| `.gitignore`             | `.gitignore`                 | Add `_site` for repos that build an Eleventy site, & `coverage` for every repo with tests |

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
| Tests             | Vitest for web & TypeScript packages, AVA for lightweight plain-JS plugins & CLIs; the host ecosystem's technique wins when it has one | [testing.md](testing.md) |
| Lint & format     | `opx` with the `opx-lint-*` presets       | `eslint.config.js`, `.prettierrc`                  |
| Build             | `@allons-y/opx-build-*` if one exists, else `tsc` for unbundled TypeScript or esbuild for bundling | [Build](#build) |
| CSS               | PostCSS with autoprefixer and/or cssnano  | [CSS](#css)                                        |
| Releases          | `opx release`, which wraps Changesets     | [Releases](#releases)                              |
| Browserslist      | `defaults and fully supports es6-module`, `maintained node versions`, `not dead` | root `package.json` |

`.nvmrc` is the version used for development & deploys, & equals the newest Node major in the
CI matrix. `engines.node` is the oldest version still supported, & CI must pass on it.

## Root `package.json`

| Field             | Rule                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- |
| `private`         | `true` for a monorepo root                                                            |
| `name`            | The repository name, unscoped: only published packages use the `@allons-y/` npm scope. The one exception is this repo's `@allons-y/core`, kept as the signal that it is the foundation for the others & because it may be published later |
| `workspaces`      | `packages/*`, `plugins/*`, & `site` as the repo needs                                 |
| `license`         | Per the [licensing rules](../AGENTS.md#licensing)                                     |
| `repository`      | `git+https://github.com/allonsy-studio/<repo>.git`                                    |
| `devDependencies` | Shared tooling lives here, not in each package. Include `typescript` even in a JS-only repo: `opx-lint-js` lists it as an optional peer, but `typescript-eslint` needs it, & lint fails in a clean install without it |
| `lint-staged`     | Keep only if a hook runs it, & only with scripts that exist      |

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
| `changeset` | `opx release add`                                      | Record a change for the next release         |
| `version`   | `opx release version && yarn install --mode update-lockfile` | Bump versions & refresh the lockfile   |
| `release`   | `yarn build && opx release publish`                    | Publish                                      |

A repository that does not publish drops the last three. A single-package repository drops
the `foreach` wrappers & points `build`, `ci`, & `test` at the tool directly.

Contributors run the aliases, never `opx` directly. `yarn version` is Yarn's own command
and ignores a script of that name, so the `version` script runs as `yarn run version`.

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
| `tsconfig.test.json`  | At the root: `extends` the base, `noEmit`, `include` every package's `src` & `test`; `yarn typecheck` runs it |

Imports keep the `.js` extension. Type-only imports use `import type`.

## Build

| Order | Tool                       | Use when                                                                    |
| ----- | -------------------------- | --------------------------------------------------------------------------- |
| 1     | `@allons-y/opx-build-*`    | A plugin exists for the language. None is published yet; check npm under `@allons-y` |
| 2     | `tsc`                      | No opx plugin exists & the TypeScript package ships unbundled: emits JS & declarations file for file |
| 3     | [esbuild](https://esbuild.github.io) | No opx plugin exists & the package is bundled, in TypeScript or JS |

Output goes to `dist/`, & `files` publishes only `dist`. A bundled TypeScript package that
ships types still runs `tsc` for the declaration files, because esbuild does not emit them.

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
`version: yarn run version` & `publish: yarn release`, plus `GITHUB_TOKEN` & `NPM_TOKEN`.
The workflow's token must be allowed to create pull requests (Settings → Actions → General).

A config that names `@changesets/changelog-github` needs that package as a dev dependency &
a `GITHUB_TOKEN` wherever `yarn run version` runs. The starter config uses the default
generator instead; [opx#41](https://github.com/allonsy-studio/opx/issues/41) tracks an
opt-in for the custom format.

Changesets CLI 3 & `changesets/action@v1` do not work together: the action reads `New tag:`
lines that CLI 3 no longer prints, so a release gets no git tag or GitHub release. The baseline
Renovate config holds `@changesets/cli` below 3. Move the CLI & the action to v2 together, in
one pull request, then drop the rule in that repository.

`opx release` is in beta (`0.1.0-beta.2` at the last check). Plain Changesets commands work
on the same files where it is not adopted yet.

## CI & automation

| File                          | Rule                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`    | On `pull_request`, `merge_group`, & pushes to `main`. `permissions: contents: read`. Steps: checkout with `persist-credentials: false`, `corepack enable`, `setup-node` with `node-version: ${{ matrix.node }}` & `cache: yarn`, `yarn install --immutable`, `yarn lint`, `yarn build`, `yarn typecheck`, `yarn test` (`yarn coverage` on the Node 26 job, with the coverage steps below). `permissions` add `pull-requests: write` for the coverage comment. One job named `CI (node${{ matrix.node }})` over `node: [26, 24]`, so the checks are `CI (node26)` & `CI (node24)`; both are required |
| `.github/workflows/pages.yml` | Calls the org's reusable `pages.yml@main` with `output-dir`; grants `contents: write` & `pull-requests: write` |
| `.github/renovate.json`       | The baseline above, with `reviewers` naming the maintainer                                   |

Order in CI is lint, build, typecheck, test: a style break or a type error fails fast, &
CLI tests need the build. A repository with nothing to build drops `build` & `typecheck`.

Every repository names its jobs the same way, so a required-check list reads the same
across the org. CI never reads `.nvmrc`: explicit versions keep a job name true to the Node
it runs.

```yaml
jobs:
  check:
    name: CI (node${{ matrix.node }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [26, 24]
    steps:
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node }}
          cache: yarn
```

Coverage steps replace the single test step. They run on pull requests from the Node 26
job only; see [Coverage](testing.md#coverage) for the tools & the floor.

```yaml
      - name: Test
        if: matrix.node != 26
        run: yarn test

      - name: Test with coverage
        if: matrix.node == 26
        run: yarn coverage

      - name: Coverage summary
        uses: irongut/CodeCoverageSummary@v1.3.0
        if: matrix.node == 26 && github.event_name == 'pull_request'
        with:
          filename: coverage/cobertura-coverage.xml
          badge: true
          fail_below_min: true
          format: markdown
          output: both

      - name: Coverage comment
        uses: marocchino/sticky-pull-request-comment@v3.0.4
        if: matrix.node == 26 && github.event_name == 'pull_request'
        with:
          recreate: true
          path: code-coverage-results.md
```

## Documentation

| File         | Rule                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`  | Opens by linking the org file, then: Stack, Commands, Layout, Testing, Source conventions, Commits & attribution      |
| `README.md`  | Weaver-managed header, contribution, license, funding, & footer blocks; hand-written body between them                |
| `LICENSE`    | MPL-2.0 or Apache-2.0 per the org licensing rules                                                                     |

The Commands table in `AGENTS.md` lists only commands that run from the repository root &
that have been run.

## Branch protection

Every repository carries one repository-level ruleset, named `Default`, that targets the
default branch. Org-level rulesets are not used: the merge queue is available only on
repository rulesets. Import it from the repository's Settings → Rules → Rulesets.

| Rule                     | Setting                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Deletion, force push     | Blocked (`deletion`, `non_fast_forward`)                                                |
| Creation                 | Restricted to the bypass actors (`creation`)                                            |
| History                  | Linear (`required_linear_history`)                                                      |
| Commit signatures        | Required (`required_signatures`); queue & bot commits show "Verified"                   |
| Pull request             | 1 approval, code owner review, stale approvals dismissed on push, last push approved, threads resolved, squash merge only |
| Required status checks   | `CI (node26)` & `CI (node24)`, plus any check the repository's own workflows add; checks are not strict, so a branch need not be current |
| Merge queue              | Squash, all green, up to 5 entries, 60 minute check timeout                             |
| Bypass                   | Organization admins, for pull requests only                                             |

The merge queue runs each required check on a `gh-readonly-queue/*` branch, so every
workflow that provides a required check lists `merge_group:` under `on:`. Without it, a
queued pull request waits for checks that never start. A workflow that provides no
required check, such as a release or a Pages workflow, leaves it out.

Changing a job's name changes the check's name: rename the job in a pull request, then
update the ruleset's required checks, never the reverse, or the queue waits on a check
that no longer exists.

The ruleset & the secrets are GitHub settings, not files, so the matrix tracks them as
manual rows. Pages source & merge options outside the ruleset are not covered yet.

## Adopting the standard

1. Copy the baseline files from the table above.
2. Set `.nvmrc` to `26`, `engines.node` to `>=24`, & `packageManager`, then run `corepack enable` & `yarn install`.
3. TypeScript packages only: add `tsconfig.base.json` & a `tsconfig.json` per package.
4. Add `eslint.config.js` with the license-header rule, & `.license-header.js`.
5. Add the root scripts & the workspace scripts.
6. If the repo publishes, add `@allons-y/opx-release` & run `opx enable release`.
7. Add `ci.yml` from the snippet above, which gives the `CI (node26)` & `CI (node24)` jobs, & `pages.yml`.
8. Add `AGENTS.md` & link [testing.md](testing.md) from its Testing section.
9. Add `.github/CODEOWNERS` & `merge_group:` to every workflow that provides a required check.
10. Run `yarn lint`, `yarn build`, `yarn typecheck`, & `yarn test`.
11. Import the `Default` ruleset, then set `CI (node26)` & `CI (node24)` as required checks.
