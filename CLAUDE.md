# CLAUDE.md

Guidance for working in this repository.

## Style guide

This project follows the **Chicago Manual of Style** with the following project-specific exceptions.

### Capitalization

- **Section titles**: Use sentence case (capitalize only the first word).
    - Correct: "About me", "Experience", "Skills"
    - Incorrect: "About Me", "ABOUT ME"
- **Hyphenated compounds**: Only capitalize the first element.
    - Correct: "Front-end"
    - Incorrect: "Front-End"

### Punctuation & formatting

- **Ampersands**: Use `&` instead of "and" consistently throughout.
    - Correct: "scalable web applications & design systems"
    - Incorrect: "scalable web applications and design systems"
- **Numbers**: Prefer numerals over written-out numbers to keep the resume brief & scannable.
    - Correct: "12+ years"
    - Incorrect: "twelve-plus years"

### Chicago style elements (retained)

- **Months**: Spell out in full (November, not Nov).
- **Date ranges**: Use en dashes (–) not hyphens (-).
    - Correct: "January 2014–July 2021"
    - Incorrect: "January 2014 - July 2021" or "Jan 2014-Jul 2021"
- **Serial comma**: Use the Oxford comma in lists.

## Design aesthetics

### Brand colors

| Role             | HSL                   | Hex       |
| ---------------- | --------------------- | --------- |
| Core brand color | `hsl(336, 65%, 50%)`  | `#d22d6f` |
| Brand color      | `hsl(24, 100%, 65%)`  | `#ff944d` |
| Brand color      | `hsl(192, 70%, 40%)`  | `#1f91ad` |
| Brand color      | `hsl(42, 100%, 71%)`  | `#ffd36b` |

Always leverage the existing components & styles when possible, only adding new ones when necessary to achieve the desired design aesthetic.

### CSS conventions

- Use `text-transform: uppercase` in CSS for visual capitalization rather than uppercase content in source files.
