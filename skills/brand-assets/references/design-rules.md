# Design rules

Learned building the dashly mark. Each rule says what to do & why.

## Contents

- [Running the loop](#running-the-loop)
- [Letters](#letters)
- [Motion & decoration](#motion--decoration)
- [Gradients](#gradients)
- [Dark mode](#dark-mode)
- [Ideas that failed](#ideas-that-failed)

## Running the loop

- Three concepts per round, each a different idea, not three colours of one idea.
- Name the metaphor in `concept`; the maintainer reacts to ideas faster than to shapes.
- Change one thing per round. Two changes at once hide which one the maintainer liked.
- Keep every round's folder. "Go back to the second one" should cost a copy, not a rebuild from memory.
- Judge at header height (32 px) & at 16 px before the master size: that is where a mark lives.

## Letters

- Outline the real glyph every time. A hand-drawn bar standing in for an `l` differs from the font's `l`, & the maintainer will see it.
- Skew is a fake italic. Up close it looks slightly mechanical; at header size it reads as motion. The studio ships Instrument Sans Italic too: offer it as a concept when the lean matters more than the exact angle.
- Check weight at 32 px on the sheet: thin strokes fade at header size.
- Tracking: leave it at 0 for most faces. Tighten only for display weights where the default spacing looks loose at master size.

## Motion & decoration

- Speed lines go behind the leading letter, right-aligned, three lengths (about 0.56, 0.92, & 0.40 em), longest in the middle.
- Lines sit inside the x-height band so they read with the lowercase letters.
- A trail under the letters collides with descenders (`y`, `g`, `p`). Check the descender before choosing an underline.
- Decorations support the letters; when one competes with them, drop it.

## Gradients

- Span several letters with one gradient: the build uses `userSpaceOnUse` across the letters that share it, so they read as one unit. Per-letter gradients look patchy.
- Two stops are enough. `diagonal` (the default) runs top-left to bottom-right across the shared letters.
- Give the dark scheme its own lighter stops; a gradient tuned for white looks muddy on near-black.

## Dark mode

- The wordmark carries `@media (prefers-color-scheme: dark)` inside the SVG. It follows the operating system, which matches the studio sites (no theme switcher).
- A page-level theme toggle cannot reach inside an `<img>` SVG; if a site ever adds one, the mark needs inline SVG instead.
- The favicon & touch icon use fixed colours: a solid or gradient tile reads on both light & dark tab bars.

## Ideas that failed

| Idea | Problem |
| --- | --- |
| Mono wordmark with a pipe `|` for the `l` | The fixed-width cell leaves a visible gap around the pipe |
| Underline trail | Hits the `y` descender |
| Hand-drawn `l` bar | Visibly different from the font's `l` |
| Ink-coloured favicon tile | Disappears in dark tab bars |
| Three dashes on the favicon | The third merges into the tile at 16 px |
| Yellow dashes on an orange tile | Too little contrast to read |
| Yellowtail for a wordmark | Reserved for signatures; never a wordmark |
