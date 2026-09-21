# Allons-y Studio — shared conventions

The studio-wide reference: voice, style, licensing, and brand. Individual repos carry
their own `AGENTS.md` for their stack, commands, and testing — this file covers only
what holds across all of them.

## About the studio

Allons-y Studio is a North Carolina–based design systems & front-end architecture
consulting studio, serving clients remotely worldwide. Core services:

- Design systems architecture & implementation
- Front-end engineering
- Accessibility
- Open source community management
- AI-augmented workflows
- Training & enablement

Studio experience includes leadership on Adobe's Spectrum design system, founding work
on Red Hat's PatternFly Elements, W3C CSS Working Group invited-expert participation,
& subject-matter authorship of documentation for Google Chrome's Modern Web Guidance
(in collaboration with OddBird).

## Voice & tone

Copy speaks to prospective clients & their outcomes — not the studio's own backstory.

- **Pronoun-free voice**: avoid first-person pronouns ("I", "we", "our"). This is a
  deliberate positioning choice, not an oversight — preserve it in future drafts.
- **Preferred constructions**: the studio name, client-as-subject phrasing, & second
  person "you / your" directed at the client.
- **Client-outcome-oriented**: frame copy around what the client gains, rather than
  narrating the founder's background.
- **Accessibility is prominent**: name it explicitly in positioning — never bury or
  omit it.
- **Avoid unproven framing**: steer clear of language that reads as untested or
  speculative (e.g. "building from scratch").

Iterative revision is the expected workflow; refined requirements may arrive mid-draft.

## Style guide

Chicago Manual of Style, with these exceptions.

| Element             | Use                          | Not                                      |
| ------------------- | ---------------------------- | ---------------------------------------- |
| Section titles      | "About me"                   | "About Me", "ABOUT ME"                   |
| Hyphenated compound | "Front-end"                  | "Front-End"                              |
| Conjunction         | "systems & design"           | "systems and design"                     |
| Numbers             | "12+ years"                  | "twelve-plus years"                      |
| Months              | "November"                   | "Nov"                                    |
| Dates               | "2027 January 15", "2027-01-15" | "January 15, 2027", "01-15-2027"      |
| Date ranges         | "2014 January–2021 July"     | "January 2014 - July 2021"               |

Dates are year-first in both forms. Ranges take an en dash (–), not a hyphen. The
Oxford comma stays.

## Licensing

Pick by the project's scope & impact:

- **MPL-2.0** — open-source, small, low-impact, or non-monetizable projects.
- **Apache-2.0** — high-impact or monetizable projects (e.g. `envoy`, `opx`).

Under a `## License` heading in the README, use the matching text:

> [MPL-2.0](LICENSE) — use freely, modify as needed; changes to MPL-licensed files
> should be shared back under the same license.

> [Apache-2.0](LICENSE) — use freely, modify as needed; includes an express patent
> grant from contributors. Retain the license & attribution notices when
> redistributing.

## Brand & design

| Role             | HSL                  | Hex       |
| ---------------- | -------------------- | --------- |
| Core brand color | `hsl(336, 65%, 50%)` | `#d22d6f` |
| Brand color      | `hsl(24, 100%, 65%)` | `#ff944d` |
| Brand color      | `hsl(192, 70%, 40%)` | `#1f91ad` |
| Brand color      | `hsl(42, 100%, 71%)` | `#ffd36b` |

Reach for existing components & styles first; add new ones only when the design
genuinely needs them. Capitalize visually with `text-transform: uppercase` rather than
uppercasing the content in source.

## Attribution

Never add AI attribution to a commit or a PR in any studio repo: no `Co-Authored-By`
trailer, no "Generated with …" footer, no session URLs.
