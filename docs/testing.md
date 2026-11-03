# Testing standard

How studio repositories choose test tools, lay out test files, & name tests. The
reference implementation is [webc-docs](https://github.com/allonsy-studio/webc-docs);
each rule below points at the file that shows it. Repository files & settings live in
[repository-standards.md](repository-standards.md).

## Tools

| Layer                               | Tool                                         | Use when                                                      | Example                                                                                                  |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Unit & integration, TypeScript      | [Vitest](https://vitest.dev)                 | Default for any package with a build step or dependencies     | [`packages/webcdoc/test`](https://github.com/allonsy-studio/webc-docs/tree/main/packages/webcdoc/test)  |
| Unit & integration, plain JS scripts | `node:test` & `node:assert/strict`           | Zero-dependency scripts with no build step, such as skills    | [`skills/brand-assets/tests`](../skills/brand-assets/tests)                                              |
| Accessibility & rendered pages      | [Cypress](https://www.cypress.io) & [cypress-axe](https://github.com/component-driven/cypress-axe) | Any site or UI; WCAG 2.2 AA in light, dark, & forced-colors | [`skills/oss-docs-site/references/testing.md`](../skills/oss-docs-site/references/testing.md) |
| Types                               | `tsc` through `yarn build`                   | Every TypeScript package; CI builds before it tests           | [`ci.yml`](https://github.com/allonsy-studio/webc-docs/blob/main/.github/workflows/ci.yml)              |
| Style & license headers             | `opx lint`                                   | Every repository; CI runs it first                            | [`eslint.config.js`](https://github.com/allonsy-studio/webc-docs/blob/main/eslint.config.js)            |

Python projects use pytest, as the `repo-scaffold` Python template does.

No test makes a network call. Browser tests run only in the accessibility layer.

## Layout

| Item               | Rule                                                                                   | Example                                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Test folder        | `test/` at the package root, beside `src/`; never inside `src/`                        | `packages/webcdoc/test/`                                                                                                              |
| Test file          | `<module>.test.ts`, named for the `src/` module it covers                              | `src/scan.ts` → `test/scan.test.ts`                                                                                                   |
| Cross-cutting file | Named for the surface it exercises                                                     | `cli.test.ts`, `fixtures.test.ts`, `stubs.test.ts`                                                                                    |
| Input fixtures     | `test/fixtures/`, one file per case, named for the case                                | `test/fixtures/skip-link.webc`                                                                                                        |
| Shared helpers     | `test/helpers.ts`: factories & setup used by more than one file                        | `makeRecord` in [`webcdoc-tools/test/fixtures.ts`](https://github.com/allonsy-studio/webc-docs/blob/main/packages/webcdoc-tools/test/fixtures.ts) |
| Snapshots          | `test/__snapshots__/`, Vitest's default, committed                                     | `fixtures.test.ts.snap`                                                                                                               |
| Golden files       | `test/golden/`; `UPDATE_GOLDEN=1` rewrites them. Node-test suites only                 | [`skills/brand-assets/tests/helpers.js`](../skills/brand-assets/tests/helpers.js)                                                     |
| License header     | Every file under `test/` starts with the block from `.license-header.js`; lint enforces it | [`eslint.config.js`](https://github.com/allonsy-studio/webc-docs/blob/main/eslint.config.js)                                       |
| Imports            | The public entry (`../src/index.js`) first; a deep `../src/<module>.js` import only for internals. Keep the `.js` extension (NodeNext) | `predicates.test.ts` vs `stubs.test.ts`                      |
| Workspace imports  | Sibling packages by name, never by relative path                                       | `@allons-y/webcdoc-schema`                                                                                                            |

## Names

| Level           | Rule                                                                                                    | Example                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `describe`      | The exported function or surface under test, as written in source                                       | `describe("isPortable")`, `describe("cli")`              |
| `it`            | Present-tense statement of the behavior. Lowercase, no trailing period, no "should"                     | `it("is true for a flag or a non-empty reason")`         |
| Negative cases  | Say what happens instead                                                                                | `it("warns, not throws, for a documented slot with no <slot>")` |
| Table-driven    | `it.each(names)("%s", …)`, the name coming from the fixture file                                        | `it.each(fixtures)("%s", …)`                             |
| Test data       | Tag names `a-a`, `b-b`; fixture names that say what is special about the case                           | `makeRecord("a-a")`, `undocumented.webc`                 |

One behavior per `it`. Several `expect` calls are fine when they check one fact.

## Techniques

1. **Factory with empty defaults.** A `make*` helper returns a complete object with
   every field empty, so a test states only what it checks. See `makeRecord`.
2. **Snapshots for whole outputs, assertions for single facts.** Snapshot a real
   fixture's full result once; assert directly on any one field a rule depends on.
   Review a snapshot diff like code.
3. **Real files over inline strings** once a case passes a few lines. Short cases stay
   inline, as in `fixtures.test.ts`.
4. **Warn, don't throw.** Assert on warning codes (`warnings.map((w) => w.code)`), not
   on message text.
5. **CLI tests run the built binary** with `execFileSync`, in a `mkdtempSync` folder,
   asserting stdout & exit code together. Build in `beforeAll` only when `dist/` is
   missing, with a `120_000` timeout. See [`cli.test.ts`](https://github.com/allonsy-studio/webc-docs/blob/main/packages/webcdoc/test/cli.test.ts).
6. **Gate external corpora on an environment variable** with `describe.skipIf(...)`,
   & name the variable in the file's doc comment. See `WEBC_STUBS_DIR` in `stubs.test.ts`.
7. **"Never throws" sweeps** over a corpus guard parsers against input the team has not
   seen.
8. **Guard tests** keep two files in step, such as the schema's `SCHEMA_VERSION` &
   `package.json`.
9. **Deterministic output.** Sort anything that comes from the file system or a set
   before asserting.

## Commands

Run all of these from the repository root.

| Command                                       | Purpose                                                          |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `yarn test`                                   | Run every workspace's tests                                      |
| `yarn vitest run --project <package name>`    | Run one workspace, such as `--project @allons-y/webcdoc`         |
| `yarn vitest run --project <package name> -u` | Update that workspace's snapshots; read the diff first           |
| `yarn vitest`                                 | Watch mode across every workspace                                |
| `yarn build && yarn test`                     | What CI runs after lint; CLI tests need `dist/`                  |

Each package's `test` script is `vitest run`. A package with no tests yet uses
`vitest run --passWithNoTests`; drop the flag with the first test.

The root `vitest.config.ts` lists the workspaces under `projects`, which is what makes
`--project` & watch mode work. A package needs its own config only when it departs from
the defaults.

`yarn workspace <name> run test` does not work while `vitest` is declared only at the
root: Yarn 4 resolves a workspace's binaries from its own dependencies, & only the root
`test` script puts the root's binaries on `PATH`. Declare `vitest` in each package that
runs it if that form is wanted.

## What gets a test

1. Every exported function or CLI flag: a test in the same PR.
2. Every bug fix: a regression test that fails before the fix.
3. Every new fixture: a snapshot or an assertion that uses it.
4. Every UI or site change: the axe audit still passes.

The PR template's checklist asks for the same.

## Adopting the standard

1. Add `vitest` to the root `devDependencies` & a `test` script to each package.
2. Move tests to `test/<module>.test.ts` & add the license header.
3. Add `vitest.config.ts` with `projects` at the root of a monorepo.
4. Add `test` to the CI job after `build`.
5. Add the Testing section to the repository's `AGENTS.md`, linking this file.

## Known gaps

| Where                                                  | Gap                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| This repo's `skills/*/tests/`                          | Folder is `tests/`, not `test/`; rename when a skill's suite is next touched                  |
| webc-docs `webcdoc-tools/test/fixtures.ts`             | Holds helpers, so `helpers.ts` under this standard                                           |
| webc-docs `webcdoc-schema`                             | Has a test but still runs `--passWithNoTests`                                                |
| webc-docs `cem-plugin-webc`                            | No tests                                                                                     |
| webc-docs `.env.example`                               | Does not list `WEBC_STUBS_DIR`                                                               |
| webc-docs `AGENTS.md`                                  | Documents `yarn workspace @allons-y/webcdoc run test`, which fails with `command not found: vitest` |
| webc-docs tests                                        | `tsc` compiles `src` only, so test files are not type-checked                                |
| Coverage                                               | No tool or threshold is set anywhere; none is required until one is chosen                   |
| This repo                                              | No CI job runs lint or the skills' `node:test` suites                                        |
