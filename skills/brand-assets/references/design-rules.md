# Design rules

Learned building the dashly mark. Each rule says what to do & why.

## Contents

- [Finding a metaphor](#finding-a-metaphor): the project description, the maintainer, then Font Awesome
- [Running the loop](#running-the-loop)
- [Letters](#letters)
- [Motion & decoration](#motion--decoration)
- [Gradients](#gradients)
- [Dark mode](#dark-mode)
- [Ideas that failed](#ideas-that-failed)

## Finding a metaphor

Start with what the project says about itself. Read the `description` & `keywords` in `package.json`, the README's opening paragraph, & `tagline` & `lede` in `<site>/_data/project.json`, then pull out the verbs & images: dashly's "filters, transforms, & shortcodes" gave the pipe in `{{ x | filter }}`, & its name gave "dash" as speed. Offer two or three candidates drawn from those words, each with the phrase it came from.

When the description is thin or nothing in it suggests an image, ask the maintainer instead of guessing: what the project does for someone in one sentence, a word they would use for how it feels to use (fast, quiet, sturdy), & any image they already picture. Their answer outranks anything inferred from the text.

Font Awesome Free is a quick source of visual metaphors once there are words to search: its ~2,000 icons each carry search terms, so "send", "speed", or "filter" turns up the visual shorthand people already read (paper plane, gauge, funnel). Studio sites already install it (`@fortawesome/fontawesome-free`, used by `<fa-icon>`), so search the copy in the project's `node_modules`:

```sh
node -e 'const m = require("@fortawesome/fontawesome-free/metadata/icon-families.json");
for (const [name, icon] of Object.entries(m))
  if (icon.search?.terms?.some((t) => t.includes(process.argv[1]))) console.log(name, "·", icon.label)' send
```

Open a hit at `@fortawesome/fontawesome-free/svgs/solid/<name>.svg` to see the shape. Use it as inspiration only, then carry the idea with letters & `decorations` (a paper plane becomes a folded corner or a forward lean; a funnel becomes a narrowing pipe):

- Never paste a Font Awesome path into a mark. The icons are CC BY 4.0, which needs attribution wherever the mark appears, & the `brands` set is other companies' trademarks.
- A stock icon reads as stock: the project's mark should be recognizable as the project's.
- Offer the metaphor in words first ("a paper plane for envoy: messages sent onward"), & build it as one of the three concepts only if the maintainer likes the idea.

## Running the loop

- Three concepts per round, each a different idea, not three colors of one idea.
- Name the metaphor in `concept`; the maintainer reacts to ideas faster than to shapes.
- Change one thing per round. Two changes at once hide which one the maintainer liked.
- Keep every round's folder. "Go back to the second one" should cost a copy, not a rebuild from memory.
- Judge at header height (32 px) & at 16 px before the master size: that is where a mark lives.

## Letters

- Space Grotesk is the first choice for wordmarks: its squared terminals & distinct `a`, `g`, & `y` stay recognizable at 32 px. Instrument Sans is the second choice. Other OFL faces that held up in trials: Bricolage Grotesque (expressive; set `opsz` near 48 for small sizes), Sora & Manrope (clean & wide), Archivo (has a `wdth` axis for long names), & Fraunces for a serif. Any font is fine for a mark, because it is outlined: the site never loads it.

- Outline the real glyph every time. A hand-drawn bar standing in for an `l` differs from the font's `l`, & the maintainer will see it.
- Skew is a fake italic. Up close it looks slightly mechanical; at header size it reads as motion. The studio ships Instrument Sans Italic too: offer it as a concept when the lean matters more than the exact angle.
- Check weight at 32 px on the sheet: thin strokes fade at header size.
- In an icon that mixes letters with & without descenders, centering the whole glyph pulls the letters up: `ag` reads top-heavy. The favicon counts half the descender for a mix so the letters sit lower; `py` or `g` alone, where every letter descends, stays on standard centering (`references/icons.md`).
- Two-letter monograms blur at 16 px. When a monogram suits the larger sizes, check the 16 px raster on the sheet & consider a single letter for the favicon.
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
- The favicon & touch icon use fixed colors: a solid or gradient tile reads on both light & dark tab bars.

## Ideas that failed

| Idea | Problem |
| --- | --- |
| Mono wordmark with a pipe `|` for the `l` | The fixed-width cell leaves a visible gap around the pipe |
| Underline trail | Hits the `y` descender |
| Hand-drawn `l` bar | Visibly different from the font's `l` |
| Ink-colored favicon tile | Disappears in dark tab bars |
| Three dashes on the favicon | The third merges into the tile at 16 px |
| Yellow dashes on an orange tile | Too little contrast to read |
| Yellowtail for a wordmark | Reserved for signatures; never a wordmark |
