# Fonts

Self-hostable `woff2` files for studio projects. Each is a Latin subset.

| File | Family | Weights | License |
| --- | --- | --- | --- |
| `instrument-sans-var.woff2` | Instrument Sans | 400–700 (variable) | [OFL-1.1](https://openfontlicense.org) |
| `instrument-sans-italic-var.woff2` | Instrument Sans Italic | 400–700 (variable) | [OFL-1.1](https://openfontlicense.org) |
| `pt-mono.woff2` | PT Mono | 400 | [OFL-1.1](https://openfontlicense.org) |
| `space-grotesk-var.woff2` | Space Grotesk | 300–700 (variable) | [OFL-1.1](https://openfontlicense.org) |
| `yellowtail.woff2` | Yellowtail | 400 | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) |

The `oss-docs-site` scaffold copies all four files into each project site, so edit them here. PT Mono is the studio's locked monospace. Yellowtail is the studio's cursive/signature font: a script face for sparing display use as an accent, not body text. Instrument Sans & Yellowtail are for projects that override `--font-sans` or `--font-display`. Space Grotesk is the studio's first choice for project wordmarks: the `brand-assets` skill outlines it into each mark, so the scaffold does not copy it into sites.

```css
@font-face {
	font-family: "Instrument Sans";
	src: url("/assets/fonts/instrument-sans-var.woff2") format("woff2");
	font-weight: 400 700;
	font-display: swap;
}
```

Keep the copyright notices embedded in the files when redistributing.
