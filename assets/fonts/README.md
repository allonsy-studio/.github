# Fonts

Self-hostable `woff2` files for studio projects. Each is a Latin subset.

| File | Family | Weights | License |
| --- | --- | --- | --- |
| `instrument-sans-var.woff2` | Instrument Sans | 400–700 (variable) | [OFL-1.1](https://openfontlicense.org) |
| `instrument-sans-italic-var.woff2` | Instrument Sans Italic | 400–700 (variable) | [OFL-1.1](https://openfontlicense.org) |
| `pt-mono.woff2` | PT Mono | 400 | [OFL-1.1](https://openfontlicense.org) |
| `yellowtail.woff2` | Yellowtail | 400 | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) |

PT Mono is the studio's locked monospace. Yellowtail is the studio's cursive/signature font: a script face for sparing display use as an accent, not body text. Instrument Sans & Yellowtail are for projects that override `--font-sans` or `--font-display`.

```css
@font-face {
	font-family: "Instrument Sans";
	src: url("/assets/fonts/instrument-sans-var.woff2") format("woff2");
	font-weight: 400 700;
	font-display: swap;
}
```

Keep the copyright notices embedded in the files when redistributing.
