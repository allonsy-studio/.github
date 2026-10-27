# Situations

`node scripts/suggest.js --repo <repo-root>` reports `scenario` as `new` or `migrate` & declines the fourth. For `new` it also returns an `existingSiteQuestion`: ask whether a website already exists that isn't built with 11ty. Yes means a rework; no means a new site. For `migrate` it returns `legacySite`: true when the site still holds files the older scaffold copied.

## New site

`scenario: new`: the repository has no site. Follow `SKILL.md` from step 1. The scaffold records the site & flavor in `package.json` (`references/site-config.md`), so later runs need no arguments.

## Rework an existing site

`scenario: new`, & the maintainer says a website already exists that isn't built with 11ty (Docusaurus, MkDocs, Jekyll, a hand-built `index.html`, or similar). Nothing is detected from the repository: ask.

The scaffold never writes into a directory that has files but was never scaffolded: it stops. Build beside the old site, then retire it.

1. **Inventory it.** Pages, copy, install & usage snippets, logo & favicon, fonts, custom domain (`CNAME`), & the URLs other sites link to.
2. **Scaffold into a new directory.** `node scripts/scaffold.js --target website`. Use `--adopt` only to merge deliberately into the old directory: differing files are kept as drift, so the two sites stay mixed.
3. **Move the content.** Install & usage commands, the lede, & features go into `_data/project.json` (`references/project-layer.md`). Reuse the existing logo & favicon (`logo`, `favicon`). Pages the new flavor has no place for are linked from the README, not rebuilt.
4. **Keep URLs working.** Redirect or recreate anything linked from elsewhere, & keep the custom domain.
5. **Switch the deploy.** A repository has one Pages workflow. If an old `.github/workflows/pages.yml` differs, it is reported as drift & kept: replace it by hand with the scaffolded one.
6. **Check, then retire.** `yarn docs:build` & `yarn docs:test` pass; delete the old directory & its dependencies in a separate change, after the new site is live.

## Migrate a site this skill built

`scenario: migrate`: `package.json` records `oss-docs`. Two kinds, both non-destructive until `--prune`.

- **Another flavor.** Set `oss-docs.flavor` or pass `--flavor <name>`, preview with `--dry-run`, then rerun. Unedited pages & config are replaced, edited pages are kept, & unused files are left as orphans (`--prune` removes them). Update the `project.json` fields the new flavor uses. Detail: `references/site-config.md`. To move the site to another directory, pass `--target <new directory>`: the old one is left as it was.
- **Newer scaffold.** Run `node scripts/scaffold.js --update --dry-run`, read what changes, then rerun without `--dry-run`. Edited files that the scaffold owns are never replaced without `--update`.

## Move a site off the copied templates

`legacySite: true`: the site was made when the scaffold copied the layouts, components, styles, scripts, fonts, & studio files into the project. The Norn packages provide all of them now, & the build fails while the old fonts stay, because they collide with the packaged ones.

1. **Commit.** Pruned files are only in version control. Note any local edits to the old layouts or includes: the replacement is to copy a Norn layout & leave the packaged one out (`layouts` option of the Norn plugin).
2. **Preview.** `node scripts/scaffold.js --update --prune --dry-run`. The report lists:
   - `legacy`, the copied files, as orphans that `--prune` removes: `_includes/*.webc` (`site-*`, `studio-*`, `docs-*`, `fa-icon`, & the rest), `_layouts/`, `_data/studio.js`, `utilities/`, the old styles & scripts, `content/assets/img/studio/`, & the four fonts.
   - `review`, the project files that still point at the past.
3. **Apply.** Rerun without `--dry-run`. `--update` replaces the old `eleventy.config.js`, `_data/site.js`, `_data/workspaces.js`, Cypress config, & directory data, & changes only the layout name in pages (`docs.webc` to `norn-docs.webc`). `--prune` removes the copies & the folders they leave empty. A `studio: false` setting becomes `oss: false`.
4. **Work through the review list.**

| File | What to do |
| --- | --- |
| `content/assets/styles/project.css` | Rename `--accent` to `--norn-ui-accent`, `--font-sans` to `--norn-font-body`, `--font-display` to `--norn-font-heading`. The file is never rewritten for you |
| `_data/project.json` | Drop `features[].icon` & `faviconIco`, which nothing renders now |
| `content/*.md` | Replace `{% %}` & `{{ }}` tags with the value: templating is off, so they print as text |
| `package.json` | Remove `prismjs`, `@fortawesome/fontawesome-free`, `@11ty/eleventy-fetch`, & `markdown-it` unless the project uses them itself. Run `yarn install` |
| `_includes/` | A component the project wrote itself stays. One named `norn-*` or `oss-*` fails the build: rename it |

5. **Build & check.** `yarn docs:build` & `yarn docs:test`.

## Outside the org

A project whose `package.json` repository is outside the org that owns this checkout (the GitHub owner in the root `package.json` of the `.github` repository) is out of scope: the studio layer, contacts, license rules, & `projects.allons-y.studio` hosting are the org's. The scripts decline before writing anything; stop & say why. A missing `repository` is asked for, since the check needs it.
