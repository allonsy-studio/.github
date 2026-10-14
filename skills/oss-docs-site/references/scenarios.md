# Situations

`node scripts/suggest.js --repo <repo-root>` reports `scenario` as `new` or `migrate` & declines the fourth. For `new` it also returns an `existingSiteQuestion`: ask whether a website already exists that isn't built with 11ty. Yes means a rework; no means a new site.

## New site

`scenario: new`: the repository has no site. Follow `SKILL.md` from step 1. The scaffold records the site & flavor in `package.json` (`references/site-config.md`), so later runs need no arguments.

## Rework an existing site

`scenario: new`, & the maintainer says a website already exists that isn't built with 11ty (Docusaurus, MkDocs, Jekyll, a hand-built `index.html`, or similar). Nothing is detected from the repository: ask.

The scaffold never writes into a directory that has files but was never scaffolded: it stops. Build beside the old site, then retire it.

1. **Inventory it.** Pages, copy, install & usage snippets, logo & favicon, fonts, custom domain (`CNAME`), & the URLs other sites link to.
2. **Scaffold into a new directory.** `node scripts/scaffold.js --target website`. Use `--adopt` only to merge deliberately into the old directory: differing files are kept as drift, so the two sites stay mixed.
3. **Move the content.** Install & usage commands, the lede, & features go into `src/_data/project.json` (`references/project-layer.md`). Reuse the existing logo & favicon (`logo`, `favicon`). Pages the new flavor has no place for are linked from the README, not rebuilt.
4. **Keep URLs working.** Redirect or recreate anything linked from elsewhere, & keep the custom domain.
5. **Switch the deploy.** A repository has one Pages workflow. If an old `.github/workflows/pages.yml` differs, it is reported as drift & kept: replace it by hand with the scaffolded one.
6. **Check, then retire.** `yarn docs:build` & `yarn docs:test` pass; delete the old directory & its dependencies in a separate change, after the new site is live.

## Migrate a site this skill built

`scenario: migrate`: `package.json` records `oss-docs`. Both kinds are non-destructive:

- **Another flavor.** Set `oss-docs.flavor` or pass `--flavor <name>`, preview with `--dry-run`, then rerun. Unedited files are replaced, edited ones kept as drift, & unused ones left as orphans (`--prune` removes them). Update the `project.json` fields the new flavor uses. Detail: `references/site-config.md`.
- **Newer templates.** Run `node scripts/scaffold.js --update --dry-run`, read what changes, then rerun without `--dry-run`. A locked studio file that differs is restored; other drift is never overwritten without `--update`.

To move the site to another directory, pass `--target <new directory>`: the old one is left as it was.

## Outside the org

A project whose `package.json` repository is outside the org that owns this checkout (the GitHub owner in the root `package.json` of the `.github` repository) is out of scope: the studio layer, contacts, license rules, & `projects.allons-y.studio` hosting are the org's. The scripts decline before writing anything; stop & say why. A missing `repository` is asked for, since the check needs it.
