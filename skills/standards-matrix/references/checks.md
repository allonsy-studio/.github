# Checks & data formats

Each row of the matrix comes from one check in `scripts/lib/checks.js`. A check reads a checkout & returns a status (`ok`, `gap`, or `na`) & one sentence of state. The checks mirror [`docs/testing.md`](../../../docs/testing.md) & [`docs/repository-standards.md`](../../../docs/repository-standards.md); change them together.

## Checks

| Id | Tooling | Gap when | Not applicable when |
| --- | --- | --- | --- |
| `node` | Node | `.nvmrc` is not 26, `engines.node` is not `>=24` (`>=24.0.0` counts), or CI has no Node 24 job | never |
| `yarn` | Yarn | `packageManager` is not Yarn 4, or `.yarnrc.yml` lacks the node-modules linker | never |
| `esm` | ESM | The root `package.json` is not `"type": "module"`, or a `.mjs` file exists outside samples | never |
| `typescript` | TypeScript | A TypeScript package's `tsconfig.json`, after following `extends`, is not strict on NodeNext | never (no TypeScript is `ok`) |
| `root-name` | Root package name | A private root is scoped, except `@allons-y/core` in `.github`; a published root may carry the scope | never |
| `internal-ranges` | Internal dependency ranges | A package depends on another local package with a `workspace:` range | No package depends on another |
| `test-runner` | Test runner | A package runs `node:test`, or a TypeScript package does not run Vitest | No package defines a test script |
| `test-layout` | Test layout | A folder is named `tests/` outside samples | No test folders |
| `license-header` | License header | A file under `src/`, `test/`, or `bin/` lacks an SPDX line in its first 400 characters, or nothing enforces it | No such files |
| `typecheck` | Typecheck | TypeScript exists without `tsconfig.test.json`, a `typecheck` script, or a CI step | No TypeScript |
| `a11y` | Accessibility audit | A `site/` or `docs/eleventy.config.js` exists without `cypress-axe` or a Cypress audit | No site |
| `build-tool` | Build tool | TypeScript packages have no `tsc` or `esbuild` build script | No TypeScript & no build script |
| `css` | CSS pipeline | never | No `postcss.config.js` |
| `lint` | opx lint | `eslint.config.js` skips the `opx-lint-*` presets, or `typescript` is not a dev dependency | never |
| `lint-staged` | lint-staged | It is configured & no `.husky/pre-commit` runs it | never |
| `husky` | Husky | The repository has no `.husky` hooks. The baseline `post-commit` & a repository's own hooks both pass; the state names which | never |
| `opx-release` | opx release | A publishing repository lacks the plugin, `"release": true`, or the `changeset`, `version`, & `release` scripts | Nothing is published |
| `ci` | ci.yml | There is no workflow that runs tests, the workflow is not named `ci.yml`, no workflow runs lint, test, (build & typecheck for TypeScript), or the CI workflow lacks node 26 & node 24 jobs named `CI (node26)` & `CI (node24)` | never |
| `pages` | Pages | A site exists & `pages.yml` does not call the shared workflow | It hosts the workflow, or there is no site |
| `renovate` | Renovate | `renovate.json` is missing or differs from the baseline | never |
| `agents` | AGENTS.md | Missing (a lone `CLAUDE.md` is noted), or (outside `.github`) missing the org link or a standard section | never |
| `readme` | README & Weaver blocks | A relative contribution link has no target file | No Weaver blocks |
| `env-example` | `.env.example` | It is missing, or lacks a variable read under `src/`, `test/`, or `bin/` (ambient ones such as `CI` are skipped) | never |

Samples are paths under `templates/`, `evals/`, `fixtures/`, or `golden/`. They are skipped everywhere.

## Manual rows

`data/manual.json` holds what no file shows. Each item: `area`, `tool`, `std`, optional `src`, `repos`: a map from repository name to `{ "status", "state", "verified", "links" }`, & an optional `default` entry that applies to every repository not named. `status` is `you` unless the maintainer has settled it. `verified` is the date the maintainer last confirmed the row.

## Exemptions

`data/exemptions.json` is an array of `{ "repo", "tool", "reason", "decided" }`. `tool` is a tool name from the table above (or a manual row) or `*` for every tool. The matching row becomes `na` with the state `Exempt: <reason>`. An entry that matches no row is listed in the scan as `unusedExemptions` & warned about.

## `prs.json`

An array, newest first:

```json
[{ "repo": "webc-docs", "n": 10, "what": "chore: run CI on Node 26 and 24", "state": "Open · CI green" }]
```

`state` is `Open · CI green`, `Open · CI red`, `Open`, `Merged`, or `Closed, not merged`. A row is `open` when `state` starts with Open. `url` is optional & defaults to the repository's pull request URL.

## Scan output

`scan.js` writes `{ asOf, repos, skipped, rows, prs, changes?, unusedExemptions? }`, where `skipped` is `[{ repo, reason }]`. A row is `{ repo, area, tool, std, src, status, state, links, manual?, verified? }`. `status` is one of `gap`, `you`, `pr`, `ok`, `na`. `changes` appears when `--previous` is given: each entry is `{ repo, tool, from, to, state }`, where `from` or `to` is null for a row that appeared or vanished.

`build.js` embeds the scan in `templates/matrix.html` between `/*DATA:start*/` & `/*DATA:end*/`, so a later run can read it back from the published page.
