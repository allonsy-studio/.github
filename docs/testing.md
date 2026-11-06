# Testing standard

How studio repositories choose test tools, lay out test files, & name tests. Repository
files & settings live in [repository-standards.md](repository-standards.md).

## Tools

| Layer                                          | Tool                                                                                                 | Use when                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Unit & integration, web packages               | [Vitest](https://vitest.dev)                                                                         | Packages with a build step, TypeScript, or browser-facing code            |
| Unit & integration, lightweight plugins & CLIs | [AVA](https://github.com/avajs/ava)                                                                  | Small Node plugins & command-line tools in plain JS; TypeScript plugins stay on Vitest                       |
| Ecosystem-defined                              | The host's recommended technique                                                                     | The tool a plugin extends documents a test approach: follow it over the two defaults |
| Accessibility & rendered pages                 | [Cypress](https://www.cypress.io) & [cypress-axe](https://github.com/component-driven/cypress-axe)  | Any site or UI; WCAG 2.2 AA in light, dark, & forced-colors. See [`oss-docs-site` testing](../skills/oss-docs-site/references/testing.md) |
| Types                                          | `tsc` through `yarn build` & `yarn typecheck`                                                        | Every TypeScript package; `typecheck` covers `src` & `test`               |
| Coverage                                       | [c8](https://github.com/bcoe/c8) for AVA & `node:test`; `@vitest/coverage-v8` for Vitest; the host runner's own for ecosystem-defined tests | Every repository with a `test` script; CI reports it on each pull request |
| Style & license headers                        | `opx lint`                                                                                           | Every repository; CI runs it first                                        |

Python projects use pytest.

No test makes a network call. Browser tests run only in the accessibility layer.

## Layout

| Item               | Rule                                                                                         | Example                                              |
| ------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Test folder        | `test/` at the package root, beside `src/`; never inside `src/`                              | `packages/parser/test/`                              |
| Test file          | `<module>.test.ts` (Vitest) or `<module>.test.js` (AVA), named for the `src/` module it covers | `src/scan.ts` → `test/scan.test.ts`                |
| Cross-cutting file | Named for the surface it exercises                                                           | `cli.test.ts`, `fixtures.test.ts`                    |
| Input fixtures     | `test/fixtures/`, one file per case, named for what is special about the case                | `test/fixtures/header-only.webc`                     |
| Shared helpers     | `test/helpers.ts` (or `.js`): factories & setup used by more than one file                   | `makeRecord`                                         |
| Snapshots          | Committed. Vitest writes `test/__snapshots__/`; AVA writes `test/snapshots/`                 | `scan.test.ts.snap`                                  |
| License header     | Every file under `test/` starts with the block from `.license-header.js`; lint enforces it   |                                                      |
| Imports            | The public entry (`../src/index.js`) first; a deep `../src/<module>.js` import only for internals. Keep the `.js` extension | `import { scan } from "../src/index.js"` |
| Workspace imports  | Sibling packages by name, never by relative path                                             | `@allons-y/parser`                                   |

AVA needs its file list set, or it runs `test/helpers.js` as a test & fails with
"No tests found":

```json
{
	"scripts": { "test": "ava" },
	"ava": { "files": ["test/**/*.test.js"] }
}
```

## Names

| Level           | Rule                                                                                                 | Example                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `describe`      | Vitest only. The exported function or surface under test, as written in source                       | `describe("isPortable")`, `describe("cli")`                |
| Test title      | Present-tense statement of the behavior. Lowercase, no trailing period, no "should"                  | `it("is true for a flag or a non-empty reason")`           |
| AVA title       | The same sentence. AVA prefixes the file name, so the title leaves out the unit                      | `test("is true for a flag or a non-empty reason", …)`      |
| Negative cases  | Say what happens instead                                                                             | `"warns, not throws, for a documented slot with no <slot>"` |
| Table-driven    | Vitest: `it.each(names)("%s", …)`. AVA: a `for` loop that calls `test` once per name                 | `it.each(fixtures)("%s", …)`                               |
| Test data       | Tag names `a-a`, `b-b`; fixture names that say what is special about the case                        | `makeRecord("a-a")`, `undocumented.webc`                   |

One behavior per test. Several assertions are fine when they check one fact.

## Techniques

1. **Factory with empty defaults.** A `make*` helper returns a complete object with
   every field empty, so a test states only what it checks.
2. **Snapshots for whole outputs, assertions for single facts.** Snapshot a real
   fixture's full result once; assert directly on any one field a rule depends on.
   Review a snapshot diff like code.
3. **Real files over inline strings** once a case passes a few lines. Short cases stay
   inline.
4. **Warn, don't throw.** Assert on warning codes, not on message text.
5. **CLI tests run the built binary** with `execFileSync`, in a `mkdtempSync` folder,
   asserting stdout & exit code together. Build in a setup hook only when `dist/` is
   missing, with a generous timeout (`120_000`).
6. **Gate external corpora on an environment variable**: Vitest `describe.skipIf(...)`,
   AVA `test.skip` chosen at load time. Name the variable in the file's doc comment & in
   `.env.example`.
7. **"Never throws" sweeps** over a corpus guard parsers against input nobody has seen.
8. **Guard tests** keep two files in step, such as a version constant & `package.json`.
9. **Deterministic output.** Sort anything that comes from the file system or a set
   before asserting.

## Commands

Run all of these from the repository root.

| Command                                       | Purpose                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `yarn test`                                   | Run every workspace's tests                                              |
| `yarn vitest run --project <package name>`    | Vitest: run one workspace, such as `--project @allons-y/parser`          |
| `yarn vitest run --project <package name> -u` | Vitest: update that workspace's snapshots; read the diff first           |
| `yarn vitest`                                 | Vitest: watch mode across every workspace                                |
| `yarn ava <file>`                             | AVA: run one file                                                        |
| `yarn ava --update-snapshots`                 | AVA: update snapshots; read the diff first                               |
| `yarn typecheck`                              | Type-check `src` & `test` with `tsconfig.test.json`; build first          |
| `yarn build && yarn typecheck && yarn test`   | What CI runs after lint; CLI tests need `dist/`                          |

Each package's `test` script is `vitest run` or `ava`. A Vitest package with no tests
yet uses `vitest run --passWithNoTests`; drop the flag with the first test.

For Vitest, the root `vitest.config.ts` lists the workspaces under `projects`, which is
what makes `--project` & watch mode work. A package needs its own config only when it
departs from the defaults.

`yarn workspace <name> run test` does not work while `vitest` is declared only at the
root: Yarn 4 resolves a workspace's binaries from its own dependencies, & only the root
`test` script puts the root's binaries on `PATH`. Declare `vitest` in each package that
runs it if that form is wanted.

## Coverage

Every repository with a `test` script reports code coverage, & CI shows it on each pull
request. [envoy](https://github.com/allonsy-studio/envoy) is the reference.

| Part      | Rule                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------ |
| Script    | A root `coverage` script runs every workspace's tests with coverage on                                 |
| Tool      | AVA & `node:test`: `"coverage": "c8 yarn test"`. Vitest: `"coverage": "vitest run --coverage"` with `@vitest/coverage-v8`. Jest, where the host ecosystem uses it: `"coverage": "jest --coverage"` |
| Reporters | `text` for the log & `cobertura`, which writes `coverage/cobertura-coverage.xml`                       |
| Ignore    | `coverage/` in `.gitignore`                                                                            |
| Report    | One sticky comment per pull request: [CodeCoverageSummary](https://github.com/irongut/CodeCoverageSummary) renders the XML, [sticky-pull-request-comment](https://github.com/marocchino/sticky-pull-request-comment) posts it |
| Floor     | `fail_below_min: true` fails the check under a 50% line rate. A repository may raise the floor, never lower it |

Only the Node 26 job runs `yarn coverage` & posts the comment; the Node 24 job runs
`yarn test`. The [CI snippet](repository-standards.md#ci--automation) has the steps.

## What gets a test

1. Every exported function or CLI flag: a test in the same PR.
2. Every bug fix: a regression test that fails before the fix.
3. Every new fixture: a snapshot or an assertion that uses it.
4. Every UI or site change: the axe audit still passes.

The PR template's checklist asks for the same.

## Adopting the standard

1. Pick the runner from the Tools table: Vitest, AVA, or the host ecosystem's own.
2. Add it to the root `devDependencies` & a `test` script to each package.
3. Put tests in `test/<module>.test.<ext>` & add the license header.
4. Vitest in a monorepo: add `vitest.config.ts` with `projects` at the root. AVA: add the
   `ava.files` setting.
5. TypeScript packages: add `tsconfig.test.json` (extends the base, `noEmit`, includes every
   `src` & `test`) & a `typecheck` script.
6. Add `typecheck` & `test` to the CI job after `build`.
7. Add a `coverage` script, the coverage tool, & the CI steps from the [Coverage](#coverage) section.
8. Add the Testing section to the repository's `AGENTS.md`, linking this file.

## Known gaps

| Where                         | Gap                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| This repo's `skills/*/test/`  | The suites use `node:test`, not AVA                                                         |
| Coverage                      | Reporting is uneven; the matrix lists each repository that lacks a part of it              |
