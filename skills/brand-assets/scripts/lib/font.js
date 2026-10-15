/**
 * Load a font, report its axes & metrics, instance it, & outline text as SVG paths.
 * @module font
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import * as fontkit from "fontkit";
import wawoff from "wawoff2";

/** Families never used for a wordmark. Yellowtail is the studio's signature face. */
export const FORBIDDEN_FAMILIES = ["Yellowtail"];

/** Font file extensions the loader accepts. */
export const FONT_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf"];

/**
 * @typedef {object} AxisInfo
 * @property {string} name
 * @property {number} min
 * @property {number} default
 * @property {number} max
 */

/**
 * @typedef {object} FontInfo
 * @property {string} file
 * @property {string} family
 * @property {string} postscriptName
 * @property {number} unitsPerEm
 * @property {Record<string, AxisInfo>} axes
 * @property {string[]} namedInstances
 * @property {{ ascent: number, descent: number, capHeight: number, xHeight: number }} metrics Font units.
 * @property {boolean} forbidden
 */

/**
 * Open a font file. WOFF2 is decompressed first: fontkit drops the cmap when instancing a WOFF2 directly.
 * @param {string} file
 * @returns {Promise<import("fontkit").Font>}
 */
export async function loadFont(file) {
	let bytes;
	try {
		bytes = await readFile(file);
	} catch (error) {
		throw new Error(`Font not found: ${file} (${error.code ?? error.message})`, { cause: error });
	}
	if (bytes.subarray(0, 4).toString("latin1") === "wOF2") {
		bytes = Buffer.from(await wawoff.decompress(bytes));
	}
	const font = fontkit.create(bytes);
	if (font.type === "TTC" || Array.isArray(font.fonts)) {
		throw new Error(`${file} is a font collection: pass a single font file.`);
	}
	font.sourceFile = file;
	return font;
}

/** Style words variable subsets often append to the family name, such as "Space Grotesk Light". */
const STYLE_SUFFIX = /(?:\s+(?:\d+pt|Thin|Hairline|ExtraLight|UltraLight|Light|Regular|Book|Medium|SemiBold|DemiBold|Bold|ExtraBold|UltraBold|Black|Heavy|Italic|Oblique))+$/i;

/**
 * The typographic family name: the preferred family when the font has one, else its family without style words.
 * @param {import("fontkit").Font} font
 * @returns {string}
 */
export function familyOf(font) {
	const preferred = font.getName?.("preferredFamily");
	return preferred || String(font.familyName ?? "").replace(STYLE_SUFFIX, "") || String(font.familyName ?? "");
}

/**
 * Describe a loaded font: family, axes, named instances, metrics.
 * @param {import("fontkit").Font} font
 * @returns {FontInfo}
 */
export function describeFont(font) {
	const axes = {};
	for (const [tag, axis] of Object.entries(font.variationAxes ?? {})) {
		axes[tag] = { name: axis.name, min: axis.min, default: axis.default, max: axis.max };
	}
	return {
		file: font.sourceFile ?? "",
		family: familyOf(font),
		postscriptName: font.postscriptName,
		unitsPerEm: font.unitsPerEm,
		axes,
		namedInstances: Object.keys(font.namedVariations ?? {}),
		metrics: {
			ascent: font.ascent,
			descent: font.descent,
			capHeight: font.capHeight ?? font.ascent * 0.7,
			xHeight: font.xHeight ?? font.ascent * 0.5,
		},
		forbidden: isForbidden(familyOf(font)),
	};
}

/**
 * @param {string} family
 * @returns {boolean}
 */
export function isForbidden(family) {
	const name = String(family ?? "").toLowerCase();
	return FORBIDDEN_FAMILIES.some((forbidden) => name.includes(forbidden.toLowerCase()));
}

/**
 * Throw when the font is on the forbidden list.
 * @param {import("fontkit").Font} font
 */
export function assertAllowed(font) {
	if (isForbidden(familyOf(font))) {
		throw new Error(
			`${familyOf(font)} is reserved for signatures & never used for a wordmark. Pick the project's sans or display face.`,
		);
	}
}

/**
 * Instance a variable font. Only axes the font has are applied; values are clamped to the axis range.
 * @param {import("fontkit").Font} font
 * @param {Record<string, number>} [requested]
 * @returns {{ font: import("fontkit").Font, applied: Record<string, number>, ignored: string[], clamped: string[] }}
 */
export function instance(font, requested = {}) {
	const available = font.variationAxes ?? {};
	const applied = {};
	const ignored = [];
	const clamped = [];
	for (const [tag, value] of Object.entries(requested)) {
		const axis = available[tag];
		if (!axis) {
			ignored.push(tag);
			continue;
		}
		const bounded = Math.min(axis.max, Math.max(axis.min, value));
		if (bounded !== value) clamped.push(`${tag}: ${value} → ${bounded}`);
		applied[tag] = bounded;
	}
	if (Object.keys(applied).length === 0) return { font, applied, ignored, clamped };
	const varied = font.getVariation(applied);
	varied.sourceFile = font.sourceFile;
	return { font: varied, applied, ignored, clamped };
}

/**
 * Round to two decimals & drop trailing zeros.
 * @param {number} value
 * @returns {string}
 */
export function num(value) {
	const rounded = Math.round(value * 100) / 100;
	return String(Object.is(rounded, -0) ? 0 : rounded);
}

/**
 * Convert fontkit path commands to SVG path data in pixels, y down, baseline at y = 0.
 * @param {{ command: string, args: number[] }[]} commands
 * @param {number} scale Pixels per font unit.
 * @param {number} dx Horizontal offset in pixels.
 * @returns {string}
 */
export function commandsToPath(commands, scale, dx = 0) {
	const point = (x, y) => `${num(x * scale + dx)} ${num(-y * scale)}`;
	const parts = [];
	for (const { command, args } of commands) {
		if (command === "moveTo") parts.push(`M${point(args[0], args[1])}`);
		else if (command === "lineTo") parts.push(`L${point(args[0], args[1])}`);
		else if (command === "quadraticCurveTo") parts.push(`Q${point(args[0], args[1])} ${point(args[2], args[3])}`);
		else if (command === "bezierCurveTo")
			parts.push(`C${point(args[0], args[1])} ${point(args[2], args[3])} ${point(args[4], args[5])}`);
		else if (command === "closePath") parts.push("Z");
	}
	return parts.join("");
}

/**
 * @typedef {object} OutlinedGlyph
 * @property {string} char
 * @property {number} index Position in the text.
 * @property {string} d SVG path data, pixels, baseline at y = 0.
 * @property {number} x Pen position in pixels.
 * @property {number} advance Pixels.
 * @property {{ minX: number, minY: number, maxX: number, maxY: number }} bbox Pixels, y down; empty glyphs are zero size at the pen.
 * @property {{ minX: number, minY: number, maxX: number, maxY: number }} inkBox Like `bbox`, measured on the slanted outline when `skew` is set, so centring follows the ink, not the slanted corners of the upright box.
 */

/**
 * Lay out & outline text. Kerning & ligatures come from the font's own layout.
 * @param {import("fontkit").Font} font An instanced font.
 * @param {string} text
 * @param {{ size: number, tracking?: number, skew?: number }} options Size in pixels; tracking in em; skew in degrees, as the SVG applies it.
 * @returns {{ glyphs: OutlinedGlyph[], advance: number, metrics: { ascent: number, descent: number, capHeight: number, xHeight: number } }}
 */
export function outline(font, text, { size, tracking = 0, skew = 0 }) {
	const scale = size / font.unitsPerEm;
	const tan = Math.tan((skew * Math.PI) / 180);
	/** @param {{ minX: number, minY: number, maxX: number, maxY: number }} b Font units, y up. */
	const toPixels = (b, x) => ({ minX: b.minX * scale + x, minY: -b.maxY * scale, maxX: b.maxX * scale + x, maxY: -b.minY * scale });
	const run = font.layout(text);
	const chars = [...text];
	const glyphs = [];
	let pen = 0;
	let index = 0;
	run.glyphs.forEach((glyph, i) => {
		const position = run.positions[i];
		const x = pen + position.xOffset * scale;
		const pathBox = glyph.path.commands.length ? glyph.path.bbox : null;
		// skewX(-angle) in SVG space is x' = x + tan·y in font space (y up).
		const inkBox = pathBox && tan ? glyph.path.transform(1, 0, tan, 1, 0, 0).bbox : pathBox;
		const char = glyph.codePoints.length ? String.fromCodePoint(...glyph.codePoints) : chars[index] ?? "";
		if (glyph.id === 0 && char.trim()) {
			throw new Error(`${familyOf(font)} has no glyph for "${char}".`);
		}
		glyphs.push({
			char,
			index: i,
			d: commandsToPath(glyph.path.commands, scale, x),
			x,
			advance: position.xAdvance * scale,
			bbox: pathBox ? toPixels(pathBox, x) : { minX: x, minY: 0, maxX: x, maxY: 0 },
			inkBox: inkBox ? toPixels(inkBox, x) : { minX: x, minY: 0, maxX: x, maxY: 0 },
		});
		pen += position.xAdvance * scale + tracking * size;
		index += Math.max(1, glyph.codePoints.length);
	});
	const info = describeFont(font).metrics;
	return {
		glyphs,
		advance: pen - (glyphs.length ? tracking * size : 0),
		metrics: {
			ascent: info.ascent * scale,
			descent: info.descent * scale,
			capHeight: info.capHeight * scale,
			xHeight: info.xHeight * scale,
		},
	};
}

/**
 * Resolve a font file against a base directory.
 * @param {string} file
 * @param {string} base
 * @returns {string}
 */
export function resolveFontPath(file, base) {
	return path.isAbsolute(file) ? file : path.resolve(base, file);
}
