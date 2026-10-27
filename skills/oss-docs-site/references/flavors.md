# Flavors & tooling

The skill suggests a flavor & tooling from the repository & never applies them on a guess. The maintainer confirms or picks another; an unattended run applies the suggestion & lists it in the report.

## Rules

First match wins:

1. Nested docs pages (each workspace is its own product, a page each): **workspaces**.
2. Slim & focused on a single action: **landing**.
3. Everything else: **docs**, the default.

Tooling is suggested beside the flavor, & both can apply: TypeScript source suggests **typedoc**, JavaScript resources suggest **jsdoc**.

## How facts are read

| Fact | Reading |
| --- | --- |
| TypeScript | A `tsconfig.json`, or `.ts` sources (not `.d.ts`) |
| JavaScript resources | `.js` or `.mjs` sources outside tests, scripts, docs, config files, & build output |
| Nested docs pages | At least two workspaces, each with its own page source (`SKILL.md` or a `docs/` folder of markdown). One table of contents covering several plugins (opx) is not nested |
| Single action | No workspaces, one command or export, a README of 200 lines or fewer, & at most three docs files |

The last two are judgment calls. `suggest.js` prints the `signals` it used; when they look wrong, read the README & override with `--nested-docs yes|no` or `--single-action yes|no`.

## Known projects

| Project | Flavor | Why |
| --- | --- | --- |
| agent-skills | Workspaces | Each skill gets its own page |
| opx | Docs | One product, many packages: Docs plus a package index. TypeScript, so typedoc |
| dashly | Docs | Confirmed. JavaScript, so jsdoc |
| envoy, glob-concat-cli, markdown-it-anchor-sections | Landing | Lightweight utilities, one page (candidates) |

## Confirming

A recorded flavor (`oss-docs.flavor`) is already confirmed: `suggest.js` checks `package.json` first & applies it without asking or scanning the repository. `--reconsider` scans & asks again; `--choose` overrides. Recorded `signals` answer the judgment calls, & a flag still overrides them. To change a flavor later: `references/site-config.md`.

```text
node scripts/suggest.js --repo .                      # needs-confirmation, with the question to ask
node scripts/suggest.js --repo . --choose landing     # the maintainer's answer
node scripts/suggest.js --repo . --unattended         # applied, listedInReport: true
```

Ask in one message: the flavor, the reason, & the tooling. Accept a yes or another flavor name.

## What each flavor builds

| Flavor | Layouts | Pages | Content comes from |
| --- | --- | --- | --- |
| Landing | `norn-landing` | One page: hero, install, usage, features | `project.json` |
| Docs | `norn-docs-home`, `norn-docs` | A home page plus a sidebar, contents, & pager over `content/*.md` | Markdown files; front matter `title`, `description`, `order`, & an optional sidebar `icon` |
| Workspaces | `norn-workspaces-home`, `norn-workspace` | A home page indexing the packages, plus one page per workspace | Each workspace's `SKILL.md`, else its `README.md` |

Workspaces read the root `package.json` `workspaces` globs, honoring `!` exclusions (`buildWorkspaces`). A page drops the file's front matter & its first heading, & takes its title & description from the workspace's `package.json`. The Norn layouts show no per-package image: the sidebar icon is a `norn-icon` name, not a file. The per-package icons from `brand-assets` are made, but nothing on a Workspaces site displays them yet.

Landing grows into Docs without a rewrite: the same config & data, & `project.json` stays.
