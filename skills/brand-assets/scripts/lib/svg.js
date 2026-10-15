/**
 * Build wordmark & favicon SVGs from a resolved spec & an instanced font.
 * @module svg
 */

import { normalize } from "./color.js";
import { num, outline } from "./font.js";
import { paintColors, paintsFor } from "./spec.js";

/** Class prefix, so an inlined SVG never collides with page styles. */
const PREFIX = "b-";

/** Favicon artboard; the 64 px master scales cleanly to 16, 32, 48, & 180. */
export const TILE = 64;
/** Widest share of the tile the glyph & dashes may cover, so iOS masks & rounded corners never clip them. */
const MAX_FILL = 0.8;
/** Share of a descender counted when centring a mix such as `ag`: half lowers the letters' body so it reads as centred. */
export const DESCENDER_WEIGHT = 0.5;
/** Depth below the baseline, as a share of the em, treated as round-letter overshoot rather than a descender (fonts use about 1–1.5%). */
const OVERSHOOT = 0.03;
/** Default `favicon.fill` per fit: x-height 48% of the tile puts a lowercase `a` near half the tile; the ink box 62% leaves room for the mask. */
export const FILL_DEFAULTS = { "x-height": 0.48, ink: 0.62 };

/**
 * Glyph size in pixels for the favicon's `fit` mode.
 * `em` scales the font's em box (the original behaviour); `x-height` scales lowercase height, so a family of
 * icons shares one letter size; `ink` scales the drawn letters' own box, so every icon looks equally full.
 * @param {object} spec A resolved spec.
 * @param {import("fontkit").Font} font
 * @returns {number}
 */
export function faviconGlyphSize(spec, font) {
	const { favicon } = spec;
	const fit = favicon.fit ?? "x-height";
	if (fit === "em") return favicon.scale * TILE;
	const fill = (favicon.fill ?? FILL_DEFAULTS[fit]) * TILE;
	if (fit === "x-height") {
		const xHeight = (font.xHeight || font.unitsPerEm * 0.5) / font.unitsPerEm;
		return fill / xHeight;
	}
	const probe = 100;
	const box = union(outline(font, favicon.glyph, { size: probe, skew: spec.skew }).glyphs.filter((g) => g.d).map((g) => g.inkBox));
	return (fill / Math.max(box.maxX - box.minX, box.maxY - box.minY)) * probe;
}

/**
 * Escape text for XML.
 * @param {string} value
 * @returns {string}
 */
export function escapeXml(value) {
	return String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

/**
 * Apply skewX(-angle) to a point: positive angles lean forward.
 * @param {number} x
 * @param {number} y
 * @param {number} tan
 * @returns {number}
 */
const skewX = (x, y, tan) => x - tan * y;

/**
 * Bounding box of a rectangle after an optional skew.
 * @param {{ minX: number, minY: number, maxX: number, maxY: number }} box
 * @param {number} tan
 */
function skewBox({ minX, minY, maxX, maxY }, tan) {
	const xs = [skewX(minX, minY, tan), skewX(maxX, minY, tan), skewX(minX, maxY, tan), skewX(maxX, maxY, tan)];
	return { minX: Math.min(...xs), maxX: Math.max(...xs), minY, maxY };
}

/** @param {{ minX: number, minY: number, maxX: number, maxY: number }[]} boxes */
function union(boxes) {
	return boxes.reduce(
		(acc, b) => ({
			minX: Math.min(acc.minX, b.minX),
			minY: Math.min(acc.minY, b.minY),
			maxX: Math.max(acc.maxX, b.maxX),
			maxY: Math.max(acc.maxY, b.maxY),
		}),
		{ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
	);
}

/**
 * Collects classes & gradients used by one drawing, then prints the <style> & <defs>.
 */
class PaintSheet {
	/** @param {object} spec */
	constructor(spec) {
		this.spec = spec;
		this.tokens = new Set();
		/** @type {Map<string, { name: string, boxes: object[] }>} */
		this.gradients = new Map();
	}

	/**
	 * Attributes for an element with this paint.
	 * @param {string} value Palette name, `@gradient`, or literal.
	 * @param {string} context Coordinate space the element lives in.
	 * @param {{ minX: number, minY: number, maxX: number, maxY: number }} box The element's box in that space.
	 * @returns {string}
	 */
	attrs(value, context, box) {
		if (value.startsWith("@")) {
			const name = value.slice(1);
			const id = `${name}-${context}`;
			if (!this.gradients.has(id)) this.gradients.set(id, { name, boxes: [] });
			this.gradients.get(id).boxes.push(box);
			return `fill="url(#${id})"`;
		}
		if (this.spec.palette[value]) {
			this.tokens.add(value);
			return `class="${PREFIX}${value}"`;
		}
		return `fill="${normalize(value)}"`;
	}

	/** @returns {string} */
	defs() {
		if (!this.gradients.size) return "";
		const parts = [];
		for (const [id, { name, boxes }] of this.gradients) {
			const gradient = this.spec.gradients[name];
			const { minX, minY, maxX, maxY } = union(boxes);
			const midX = (minX + maxX) / 2;
			const midY = (minY + maxY) / 2;
			const [x1, y1, x2, y2] = {
				diagonal: [minX, minY, maxX, maxY],
				horizontal: [minX, midY, maxX, midY],
				vertical: [midX, minY, midX, maxY],
			}[gradient.direction];
			const stops = gradient.stops
				.map((stop, i) => {
					const offset = num(i / (gradient.stops.length - 1));
					if (this.spec.palette[stop]) {
						this.tokens.add(`stop:${stop}`);
						return `<stop class="${PREFIX}stop-${stop}" offset="${offset}"/>`;
					}
					return `<stop offset="${offset}" stop-color="${normalize(stop)}"/>`;
				})
				.join("");
			parts.push(
				`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}">${stops}</linearGradient>`,
			);
		}
		return `<defs>${parts.join("")}</defs>`;
	}

	/**
	 * CSS for every used token, light first, then the dark overrides.
	 * @returns {string}
	 */
	style() {
		const rule = (token, scheme) => {
			const [kind, name] = token.startsWith("stop:") ? ["stop-color", token.slice(5)] : ["fill", token];
			const cls = kind === "fill" ? `${PREFIX}${name}` : `${PREFIX}stop-${name}`;
			return `.${cls}{${kind}:${this.spec.palette[name][scheme]}}`;
		};
		const tokens = [...this.tokens].sort();
		if (!tokens.length) return "";
		const light = tokens.map((t) => rule(t, "light")).join("");
		const dark = tokens
			.filter((t) => {
				const name = t.replace(/^stop:/, "");
				return this.spec.palette[name].dark !== this.spec.palette[name].light;
			})
			.map((t) => rule(t, "dark"))
			.join("");
		return `<style>${light}${dark ? `@media (prefers-color-scheme:dark){${dark}}` : ""}</style>`;
	}
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 * @param {string} attrs
 * @returns {string}
 */
function rect(x, y, width, height, radius, attrs) {
	const r = radius > 0 ? ` rx="${num(radius)}"` : "";
	return `<rect ${attrs} x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}"${r}/>`;
}

/**
 * Speed-line rectangles in the text's local space: right-aligned before the origin, inside the x-height band.
 * @param {{ lines: { length: number, paint: string }[], thickness: number, gap: number, inset: number }} motion
 * @param {number} size
 * @param {number} xHeight Pixels.
 * @returns {{ x: number, y: number, width: number, height: number, paint: string }[]}
 */
export function motionRects(motion, size, xHeight) {
	const thickness = motion.thickness * size;
	const top = -xHeight;
	const bottom = -motion.inset * size;
	const count = motion.lines.length;
	const step = count > 1 ? (bottom - top - thickness) / (count - 1) : 0;
	const right = -motion.gap * size;
	return motion.lines.map((line, i) => {
		const width = line.length * size;
		const y = count > 1 ? top + i * step : (top + bottom - thickness) / 2;
		return { x: right - width, y, width, height: thickness, paint: line.paint };
	});
}

/**
 * Build the wordmark SVG.
 * @param {object} spec A resolved spec.
 * @param {import("fontkit").Font} font An instanced font.
 * @returns {{ svg: string, width: number, height: number }}
 */
export function buildWordmark(spec, font) {
	const { size } = spec;
	const tan = Math.tan((spec.skew * Math.PI) / 180);
	const { glyphs, metrics } = outline(font, spec.text, { size, tracking: spec.tracking, skew: spec.skew });
	const paints = paintsFor(spec.paint, glyphs.length);
	const sheet = new PaintSheet(spec);

	const behindSkewed = [];
	const frontSkewed = [];
	const behindFlat = [];
	const frontFlat = [];
	const boxes = [];

	const lead = glyphs.find((glyph) => glyph.d)?.bbox.minX ?? 0;
	const lines = spec.motion
		? motionRects(spec.motion, size, metrics.xHeight).map((line) => ({ ...line, x: line.x + lead }))
		: [];
	for (const line of lines) {
		const box = { minX: line.x, minY: line.y, maxX: line.x + line.width, maxY: line.y + line.height };
		boxes.push(box);
		behindFlat.push(rect(line.x, line.y, line.width, line.height, line.height / 2, sheet.attrs(line.paint, "flat", box)));
	}

	for (const item of spec.decorations) {
		const [x, y, width, height] = [item.x, item.y, item.width, item.height].map((v) => v * size);
		const box = { minX: x, minY: y, maxX: x + width, maxY: y + height };
		boxes.push(item.skew ? skewBox(box, tan) : box);
		const markup = rect(x, y, width, height, item.radius * size, sheet.attrs(item.paint, item.skew ? "text" : "flat", box));
		const target = item.skew ? (item.layer === "front" ? frontSkewed : behindSkewed) : item.layer === "front" ? frontFlat : behindFlat;
		target.push(markup);
	}

	const paths = glyphs
		.filter((glyph) => glyph.d)
		.map((glyph) => {
			boxes.push(glyph.inkBox);
			return `<path ${sheet.attrs(paints[glyph.index], "text", glyph.bbox)} d="${glyph.d}"/>`;
		});
	if (!paths.length) throw new Error(`"${spec.text}" has no visible glyphs.`);

	const pad = spec.padding * size;
	const box = union(boxes);
	const ox = pad - box.minX;
	const oy = pad - box.minY;
	const width = box.maxX - box.minX + 2 * pad;
	const height = box.maxY - box.minY + 2 * pad;

	const skewed = [...behindSkewed, ...paths, ...frontSkewed].join("");
	const skewAttr = spec.skew ? ` skewX(${num(-spec.skew)})` : "";
	const body = [
		behindFlat.length ? `<g transform="translate(${num(ox)} ${num(oy)})">${behindFlat.join("")}</g>` : "",
		`<g transform="translate(${num(ox)} ${num(oy)})${skewAttr}">${skewed}</g>`,
		frontFlat.length ? `<g transform="translate(${num(ox)} ${num(oy)})">${frontFlat.join("")}</g>` : "",
	].join("");
	const defs = sheet.defs();
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(width)} ${num(height)}" width="${Math.round(width)}" height="${Math.round(height)}" role="img">` +
		`<title>${escapeXml(spec.name)}</title>${sheet.style()}${defs}${body}</svg>\n`;
	return { svg, width, height };
}

/**
 * Build the favicon SVG: one glyph, optional dashes, on a tile.
 * @param {object} spec A resolved spec.
 * @param {import("fontkit").Font} font An instanced font.
 * @param {{ square?: boolean }} [options] `square` drops the corner radius, for the touch icon & Open Graph tile.
 * @returns {{ svg: string, width: number, height: number }}
 */
export function buildFavicon(spec, font, { square = false, size } = {}) {
	const { favicon } = spec;
	const glyphSize = size ?? faviconGlyphSize(spec, font);
	const tan = Math.tan((spec.skew * Math.PI) / 180);
	const { glyphs, metrics } = outline(font, favicon.glyph, { size: glyphSize, skew: spec.skew });
	const visible = glyphs.filter((glyph) => glyph.d);
	if (!visible.length) throw new Error(`favicon.glyph "${favicon.glyph}" has no visible glyph.`);
	const ink = paintColors(spec, favicon.ink)[0];

	const boxes = visible.map((glyph) => glyph.inkBox);
	// Dash proportions measured from the dashly favicon (14 × 5 at a 46 px glyph).
	const dashLength = 0.3 * glyphSize;
	const thickness = 0.11 * glyphSize;
	const gap = 0.05 * glyphSize;
	const dashes = [];
	if (favicon.dashes) {
		const lead = visible[0].inkBox.minX;
		const rects = motionRects(
			{
				lines: Array.from({ length: favicon.dashes }, () => ({ length: dashLength / glyphSize, paint: ink })),
				thickness: thickness / glyphSize,
				gap: gap / glyphSize,
				inset: 0.08,
			},
			glyphSize,
			metrics.xHeight,
		);
		const firstY = rects[0].y;
		rects.forEach((r, i) => {
			const x = lead + r.x - tan * (r.y - firstY);
			boxes.push({ minX: x, minY: r.y, maxX: x + r.width, maxY: r.y + r.height });
			// Lower dashes fade so the glyph stays the focus.
			const opacity = [1, 0.75, 0.5][i];
			dashes.push(
				`<rect x="${num(x)}" y="${num(r.y)}" width="${num(r.width)}" height="${num(r.height)}" rx="${num(r.height / 2)}" fill="${ink}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ""}/>`,
			);
		});
	}

	const box = union(boxes);
	// Each icon centres its own letters in its own tile; wide or tall glyphs shrink to keep the margin.
	const fit = (MAX_FILL * TILE) / Math.max(box.maxX - box.minX, box.maxY - box.minY);
	if (fit < 1) return buildFavicon(spec, font, { square, size: glyphSize * fit * 0.999 });
	const ox = TILE / 2 - (box.minX + box.maxX) / 2;
	// A descender (g, y, p) counts only partly when centring, so the letters' body sits lower & reads as centred.
	// The baseline is y = 0. Round letters dip just below it (overshoot), which is not a descender.
	// Only a mix needs it: when every letter descends (py, g) the letters share their depth, so standard centring holds.
	const overshoot = OVERSHOOT * glyphSize;
	const descends = visible.map((glyph) => glyph.inkBox.maxY > overshoot);
	const mixed = descends.some(Boolean) && !descends.every(Boolean);
	const weight = mixed ? (favicon.descender ?? DESCENDER_WEIGHT) : 1;
	const bottom = box.maxY > overshoot ? overshoot + (box.maxY - overshoot) * weight : box.maxY;
	// A positive lift raises the letters above that centre.
	const oy = TILE / 2 - (box.minY + bottom) / 2 - (favicon.lift ?? 0) * TILE;
	// Sitting lower can push a descender past the margin: shrink until it clears.
	const margin = (TILE * (1 - MAX_FILL)) / 2;
	const room = Math.min((TILE - margin - oy) / Math.max(box.maxY, 1e-6), (oy - margin) / Math.max(-box.minY, 1e-6));
	if (room < 1) return buildFavicon(spec, font, { square, size: glyphSize * room * 0.999 });
	const radius = square ? 0 : favicon.radius * TILE;

	let tileFill;
	let defs = "";
	if (favicon.tile.startsWith("@")) {
		const gradient = spec.gradients[favicon.tile.slice(1)];
		const stops = gradient.stops.map(
			(stop, i) => `<stop offset="${num(i / (gradient.stops.length - 1))}" stop-color="${paintColors(spec, stop)[0]}"/>`,
		);
		const coords = { diagonal: [0, 0, TILE, TILE], horizontal: [0, TILE / 2, TILE, TILE / 2], vertical: [TILE / 2, 0, TILE / 2, TILE] }[
			gradient.direction
		];
		defs = `<defs><linearGradient id="tile" gradientUnits="userSpaceOnUse" x1="${coords[0]}" y1="${coords[1]}" x2="${coords[2]}" y2="${coords[3]}">${stops.join("")}</linearGradient></defs>`;
		tileFill = "url(#tile)";
	} else {
		tileFill = paintColors(spec, favicon.tile)[0];
	}

	const skewAttr = spec.skew ? ` skewX(${num(-spec.skew)})` : "";
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE} ${TILE}" width="${TILE}" height="${TILE}" role="img">` +
		`<title>${escapeXml(spec.name)}</title>${defs}` +
		`<rect width="${TILE}" height="${TILE}"${radius ? ` rx="${num(radius)}"` : ""} fill="${tileFill}"/>` +
		`<g transform="translate(${num(ox)} ${num(oy)})">${dashes.join("")}</g>` +
		`<g transform="translate(${num(ox)} ${num(oy)})${skewAttr}">${visible.map((g) => `<path fill="${ink}" d="${g.d}"/>`).join("")}</g>` +
		"</svg>\n";
	return { svg, width: TILE, height: TILE };
}
