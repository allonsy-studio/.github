/**
 * Colour parsing, WCAG contrast, & OKLCH deepening.
 * @module color
 */

/** WCAG 2 targets by palette role. Logotypes are exempt from 1.4.3; the studio holds glyphs to text contrast anyway. */
export const TARGETS = { text: 4.5, graphic: 3, decorative: 0 };

/** Named colours the specs may use. */
const NAMED = { white: "#ffffff", black: "#000000" };

/**
 * Parse #rgb, #rrggbb, rgb(r g b), or white/black into 0–255 channels.
 * @param {string} input
 * @returns {{ r: number, g: number, b: number }}
 */
export function parseColor(input) {
	const value = String(input).trim().toLowerCase();
	const hex = NAMED[value] ?? value;
	let match = /^#([0-9a-f]{3})$/.exec(hex);
	if (match) {
		const [r, g, b] = [...match[1]].map((c) => parseInt(c + c, 16));
		return { r, g, b };
	}
	match = /^#([0-9a-f]{6})$/.exec(hex);
	if (match) {
		const n = parseInt(match[1], 16);
		return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
	}
	match = /^rgb\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*\)$/.exec(value);
	if (match) return { r: +match[1], g: +match[2], b: +match[3] };
	throw new Error(`Unsupported colour "${input}": use #rrggbb, #rgb, rgb(), white, or black.`);
}

/**
 * @param {{ r: number, g: number, b: number }} color
 * @returns {string}
 */
export function toHex({ r, g, b }) {
	return "#" + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("");
}

/**
 * Normalise any accepted colour to lowercase #rrggbb.
 * @param {string} input
 * @returns {string}
 */
export function normalize(input) {
	return toHex(parseColor(input));
}

/** @param {number} c 0–1 sRGB channel */
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** @param {number} c linear channel */
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/**
 * WCAG 2 relative luminance.
 * @param {string} color
 * @returns {number}
 */
export function luminance(color) {
	const { r, g, b } = parseColor(color);
	return 0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(b / 255);
}

/**
 * WCAG 2 contrast ratio.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/**
 * @param {string} color
 * @returns {{ l: number, c: number, h: number }}
 */
export function toOklch(color) {
	const { r, g, b } = parseColor(color);
	const [lr, lg, lb] = [r, g, b].map((v) => toLinear(v / 255));
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180) / Math.PI };
}

/**
 * OKLCH to linear sRGB; may fall outside 0–1.
 * @param {{ l: number, c: number, h: number }} lch
 * @returns {number[]}
 */
function oklchToLinear({ l: L, c, h }) {
	const A = c * Math.cos((h * Math.PI) / 180);
	const B = c * Math.sin((h * Math.PI) / 180);
	const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
	const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
	const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
}

/**
 * OKLCH to hex, reducing chroma until the colour is inside sRGB.
 * @param {{ l: number, c: number, h: number }} lch
 * @returns {string}
 */
export function fromOklch(lch) {
	let { c } = lch;
	for (let i = 0; i < 40; i++) {
		const rgb = oklchToLinear({ ...lch, c });
		if (rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)) {
			return toHex(Object.fromEntries(["r", "g", "b"].map((k, j) => [k, toGamma(Math.min(1, Math.max(0, rgb[j]))) * 255])));
		}
		c *= 0.9;
	}
	return toHex({ r: lch.l * 255, g: lch.l * 255, b: lch.l * 255 });
}

/**
 * Move a colour's OKLCH lightness away from the surface, keeping hue, until it meets the target.
 * Light surfaces darken the colour; dark surfaces lighten it.
 * @param {string} color
 * @param {string} surface
 * @param {number} target Contrast ratio.
 * @returns {{ hex: string, ratio: number, changed: boolean, reached: boolean }}
 */
export function deepen(color, surface, target) {
	const start = normalize(color);
	const ratio = contrast(start, surface);
	if (ratio >= target) return { hex: start, ratio, changed: false, reached: true };
	const lch = toOklch(start);
	const darken = luminance(surface) > 0.18;
	let lo = darken ? 0 : lch.l;
	let hi = darken ? lch.l : 1;
	let best = null;
	// 24 halvings of a 0–1 lightness range is finer than one 8-bit step.
	for (let i = 0; i < 24; i++) {
		const mid = (lo + hi) / 2;
		const hex = fromOklch({ ...lch, l: mid });
		const passes = contrast(hex, surface) >= target;
		if (passes) best = hex;
		if (passes === darken) lo = mid;
		else hi = mid;
	}
	const hex = best ?? fromOklch({ ...lch, l: darken ? 0 : 1 });
	const reached = contrast(hex, surface) >= target;
	return { hex, ratio: contrast(hex, surface), changed: true, reached };
}

/**
 * Round a ratio for display.
 * @param {number} ratio
 * @returns {string}
 */
export function formatRatio(ratio) {
	return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}
