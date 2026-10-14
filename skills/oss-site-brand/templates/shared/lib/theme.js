// Turns the project's accent & fonts into the token block injected after tokens.css.

/** Default font weights. */
const DEFAULT_WEIGHTS = [400, 700];

/** The locked mono family. */
const MONO_FAMILY = { family: "PT Mono", weights: [] };

const quote = (family) => `"${family}"`;

/** Google Fonts css2 segment, e.g. `Inter:wght@400;700`. */
function familySegment({ family, weights }) {
	const name = family.trim().replace(/\s+/g, "+");
	if (!weights.length) return `family=${name}`;
	const sorted = [...new Set(weights)].sort((a, b) => a - b);
	return `family=${name}:wght@${sorted.join(";")}`;
}

/**
 * @param {{ project: Record<string, any> }} input
 * @returns {{
 *   accent: string,
 *   fonts: { family: string, weights: number[] }[],
 *   fontsUrl: string,
 *   css: string,
 * }}
 */
export function computeTheme({ project }) {
	const accent = project.accent.trim().toLowerCase();

	const fonts = [];
	const declarations = [`--accent: ${accent};`];

	const sans = project.fonts?.sans;
	const display = project.fonts?.display;
	if (sans) {
		fonts.push({
			family: sans.family,
			weights: sans.weights ?? DEFAULT_WEIGHTS,
		});
		declarations.push(`--font-sans: ${quote(sans.family)}, var(--sans-stack);`);
	}
	if (display) {
		fonts.push({
			family: display.family,
			weights: display.weights ?? DEFAULT_WEIGHTS,
		});
		declarations.push(
			`--font-display: ${quote(display.family)}, var(--font-sans);`,
		);
	}
	fonts.push(MONO_FAMILY);

	const fontsUrl = `https://fonts.googleapis.com/css2?${fonts
		.map(familySegment)
		.join("&")}&display=swap`;

	const css = `:root {\n${declarations.map((d) => `\t${d}`).join("\n")}\n}\n`;

	return {
		accent,
		fonts,
		fontsUrl,
		css,
	};
}
