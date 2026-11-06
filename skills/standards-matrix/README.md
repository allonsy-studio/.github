# standards-matrix

A skill that scans the Allons-y Studio repositories against the testing & repository configuration standards & refreshes the Standards Matrix page. The page lists one row per repository & tool with the standard, the current state, a status, & the pull request that fixes a gap.

`SKILL.md` is written for agents. This file is for people: what the skill does, how to run it, & how it is laid out.

## Requirements

Node 24+ & `yarn install` from the repository root. The scripts read checkouts & write files; they never push, comment, or open a pull request.

## How it works

| Step | Tool | Reads |
| --- | --- | --- |
| Scan | `scripts/scan.js` | A checkout of each repository's default branch, plus any open pull request heads |
| Merge | `scripts/lib/scan.js` | Marks a gap `pr` when an open pull request head passes the check, & adds the manual rows |
| Build | `scripts/build.js` | Embeds the scan in `templates/matrix.html` |
| Publish | The agent | Pull request & CI state from GitHub, & answers from the maintainer for rows no file shows |

## Usage

```text
node scripts/scan.js --repo .github=<dir> --repo webc-docs=<dir> --pr webc-docs#10=<dir> --prs prs.json --out matrix.json
node scripts/build.js --data matrix.json --out matrix.html
```

`scan.js --help` lists every option, including `--skip <name>=<reason>` for a repository left out. `--previous` takes an earlier scan or the published page & reports which rows changed status.

## Layout

| Path | Holds |
| --- | --- |
| `SKILL.md` | The workflow & hard rules for agents |
| `scripts/scan.js`, `scripts/build.js` | The command-line entry points |
| `scripts/lib/checks.js` | One check per row |
| `scripts/lib/scan.js` | The scan, the pull request overlay, the diff, & the page injection |
| `scripts/lib/repo.js` | Read-only helpers over a checkout |
| `templates/matrix.html` | The page: an overview, a tooling-by-repository grid, & a detail panel, with a placeholder for the scan |
| `data/manual.json` | Rows a scan cannot read: decisions & GitHub settings |
| `references/checks.md` | What each check decides, & the data formats |
| `test/` | AVA tests for the checks & the scan |
| `evals/` | Trigger queries & task evals |

## Tests

```text
yarn test
```

The tests build small throwaway checkouts, so they need no network.

## Changing a check

The checks mirror the two standards documents. When a rule changes there, change `scripts/lib/checks.js`, the row in `references/checks.md`, & the test in the same pull request, then run the skill to refresh the page.
