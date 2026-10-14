# Architecture

One skill, multiple site templates offered. Each project keeps its own identity while inheriting a studio layer that adds consistency.

## Layers

| Layer | Owner | Contents | Project can change it? |
| --- | --- | --- | --- |
| Core | Skill | CSS, JS, WebC components, 11ty templates & config, token scaffold, shared mono font, Cypress audit, Pages deploy & PR previews | Extend only |
| Studio | Skill (locked) | Slim banner, call to action to `contact@allons-y.studio`, footer credit lockup | Opt out only |
| Flavor | Skill | Page templates for Landing, Docs, or Workspaces, suggested from the repo & confirmed by the maintainer | Pick one |
| Project | Maintainer | Accent, logo & favicon (supplied by the project), optional fonts, copy, features; the license is resolved from `package.json` | Yes |

See `REPO_DEV_DEPENDENCIES` in `scripts/lib/layers.js` for what default dependencies are suggested to all repos.

## Core contents

| Part | Contents |
| --- | --- |
| CSS | Reset, tokens (`--accent`, text-safe shades, `--font-*`), layout, base components, & a print block, each in a cascade layer (`references/styling.md`). Light & dark via `light-dark()`. A project overrides tokens only |
| JS | Small dependency-free modules (the code copy button, syntax highlight ranges). Progressive enhancement: every page works without them |
| WebC components | In `templates/shared/_includes/`. The `studio-*` components are locked (`Studio layer`); the rest are customizable. Comments use WebC's server-only `<!--- --->` so they stay out of the page |
| Eleventy | Base & flavor layouts, head partial (meta, Open Graph, favicon link), site facts resolved from `package.json` into `_data/site.js`, plugins (HtmlBasePlugin, WebC), Prism tokenizing, Pages workflow |

## Studio layer

Locked files: any edit is reported as a locked-file edit on rerun, & `--update` restores it.

- `_includes/studio-*.webc`
- `_data/studio.js`, `content/assets/styles/studio.css`
- `content/assets/img/studio/*.svg`, copied from the org's `assets/svg/` (the single source: edit them there & list the change in the pull request)

The banner comes before `main`; the call to action & footer credit sit in the footer. `contact@allons-y.studio` appears only in the call to action. The studio styles read only `--studio-*` tokens, so a project accent never changes them.

Brand colors, voice, & style: `AGENTS.md`.

## Licensing

Which license a project takes is set in `AGENTS.md` (Licensing). Sites never hard-code one: the scaffold resolves it from `package.json` into `_data/site.js`.

## Template layout

`templates/shared/` & `templates/<flavor>/` mirror the site directory, so `templates/shared/content/assets/styles/tokens.css` becomes `docs/content/assets/styles/tokens.css`. The Pages workflow, `templates/workflows/pages.yml`, lands in `.github/workflows/`.
