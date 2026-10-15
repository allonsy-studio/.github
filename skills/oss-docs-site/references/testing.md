# Accessibility & tests

A project checks accessibility with [Cypress](https://www.cypress.io) & [cypress-axe](https://github.com/component-driven/cypress-axe), as the studio website does. axe-core runs on every built page in a real browser, so contrast is measured on rendered colors. No custom test suite ships into a project.

## What the audit covers

axe at WCAG 2.2 AA: contrast (4.5:1, or 3:1 for large text), structure (`main`, `lang`, landmarks, heading order, link & image names, skip link target), & interaction (focus, target size, form labels).

`cypress/e2e/a11y.cy.js` visits every built page at 1280 by 800 in light, dark, & forced-colors. `cy.emulateMedia()` switches the mode through the DevTools protocol, which Cypress does not document: recheck it on upgrades. A failure prints the rule, impact, & first selector. In forced-colors the contrast rule is off, because the system replaces the page's colors & axe would measure the author's.

It does not check the studio files, the license, or contact addresses: the scaffold reports locked-file edits on rerun, & SKILL.md's hard rules cover the rest.

## Running it

```text
yarn docs:build   # the site, with PATH_PREFIX from the environment
yarn docs:test    # Cypress builds docs/_a11y unprefixed, serves it with Eleventy on 127.0.0.1:8080, & audits it
```

The Cypress config builds & serves its own unprefixed copy (`PATH_PREFIX=/`, through Eleventy's API) because a local server serves from `/`, while Pages builds are prefixed. `core.css` is bundled in an `eleventy.after` hook, so a build that overrides the output must write it through `directories.output`; the config fails fast when it is missing from the audit build. The page list comes from the built files, so new pages are audited with no list to keep.

Cypress downloads its runner on install (`download.cypress.io`): a restricted network must allow that host. It needs Node 22, 24, or 26+ & an installed Chrome (`defaultBrowser: "chrome"`), since Electron is deprecated for tests & media emulation needs a Chromium-family browser. GitHub-hosted runners have Chrome. cypress-axe supports Cypress up to 15; stay there until it adds 16.

## In a project

The scaffold writes `docs/cypress.config.js` & `docs/cypress/`, & prints the devDependencies (`cypress`, `cypress-axe`, `axe-core`) & the three scripts to add. The shared Pages workflow runs `yarn docs:build && yarn docs:test`, so a page that fails axe does not deploy. Ignore `docs/_a11y` & `docs/cypress/screenshots` in `.gitignore`.

The config is `cypress.config.js` in a `"type": "module"` project (the default to aim for) & `cypress.config.mjs` in any other, which makes it load as ESM. Do not use `.mjs` in an ESM project.

## The skill's own tests

The skill ships none.

## Evals

`evals/evals.json` holds task evals with fixture repos in `evals/files/`, graded by `expectations`. `evals/triggers.json` is the trigger set (`query`, `should_trigger`) for skill-creator's description optimizer.
