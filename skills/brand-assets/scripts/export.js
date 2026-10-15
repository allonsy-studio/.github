#!/usr/bin/env node
/**
 * Raster exports from a folder holding favicon.svg (& wordmark.svg for --og):
 *   apple-touch-icon.png  180×180, opaque RGB, square corners (iOS applies its own mask)
 *   favicon.ico           16, 32, & 48 px PNG entries, for browsers & tools that ask for /favicon.ico
 *   og.png                1200×630 Open Graph image, light theme (with --og)
 *
 * A build.js folder (with meta.json) supplies the font, surface, & accent. Any other folder is treated as
 * hand-made: its SVGs are checked first, & --font, --accent, --background, --name, & --url fill the gaps.
 *
 * Usage: node scripts/export.js <dir> [--og] [--tagline "..."] [--project <repo-root>]
 *          [--name <name>] [--font <file>] [--accent <colour>] [--background <colour>] [--url <text>]
 * The tagline falls back to the spec's og.tagline, then <project>/<site>/_data/project.json.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { rasterize, screenshot, withBrowser } from "./lib/browser.js";
import { assertNoErrors, checkSvg } from "./lib/check.js";
import { formatBytes, isMain, printJson, run } from "./lib/cli.js";
import { normalize, parseColor } from "./lib/color.js";
import { encodeIco, encodePng, readPngHeader } from "./lib/png.js";
import { paintColors } from "./lib/spec.js";
import { escapeXml } from "./lib/svg.js";

/** Open Graph size every major consumer accepts without cropping. */
export const OG = { width: 1200, height: 630 };
/** Wordmark box on the Open Graph image: tall enough to read in a 500 px wide link preview. */
const WORDMARK_BOX = { width: 800, height: 180 };
/** Legacy icon sizes: tab (16), taskbar & retina tab (32), Windows desktop (48). */
export const ICO_SIZES = [16, 32, 48];
/** Page text on the light surface, from the oss-docs-site tokens. */
const FG = "#16181d";
const MUTED = "#4b5160";
/** Alpha above which a pixel counts as ink when measuring the wordmark's left edge. */
const INK_ALPHA = 24;

/**
 * CSS background for a paint.
 * @param {object} spec
 * @param {string} value
 * @returns {string}
 */
function cssPaint(spec, value) {
	const colors = paintColors(spec, value);
	return colors.length > 1 ? `linear-gradient(90deg, ${colors.join(", ")})` : colors[0];
}

/**
 * Tagline lookup: flag, spec, then the project's project.json.
 * @param {object | null} spec
 * @param {{ tagline?: string, project?: string }} options
 * @returns {string}
 */
export function findTagline(spec, { tagline, project }) {
	if (tagline) return tagline;
	if (spec?.og?.tagline) return spec.og.tagline;
	if (project) {
		let site = "docs";
		try {
			site = JSON.parse(readFileSync(path.join(project, "package.json"), "utf8"))["oss-docs"]?.site ?? site;
		} catch {
			// No package.json: keep the default site folder.
		}
		const file = path.join(project, site, "_data", "project.json");
		if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")).tagline ?? "";
	}
	return "";
}

/**
 * The wordmark's displayed size inside the Open Graph box, from its viewBox.
 * @param {string} svg
 * @returns {{ width: number, height: number }}
 */
export function ogWordmarkSize(svg) {
	const match = /\bviewBox="\s*[\d.+-]+[\s,]+[\d.+-]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/i.exec(svg);
	const aspect = match ? Number(match[1]) / Number(match[2]) : 3;
	let height = WORDMARK_BOX.height;
	let width = height * aspect;
	if (width > WORDMARK_BOX.width) {
		width = WORDMARK_BOX.width;
		height = width / aspect;
	}
	return { width: Math.round(width), height: Math.round(height) };
}

/**
 * First column holding ink, so the wordmark's letters can line up with the tagline whatever its padding.
 * @param {{ width: number, height: number, data: Uint8Array }} image
 * @returns {number}
 */
export function leftInk({ width, height, data }) {
	for (let x = 0; x < width; x++) {
		for (let y = 0; y < height; y++) if (data[(y * width + x) * 4 + 3] > INK_ALPHA) return x;
	}
	return 0;
}

/**
 * @typedef {object} OgOptions
 * @property {string} name Alt text.
 * @property {string} wordmark SVG markup.
 * @property {{ width: number, height: number }} size Displayed wordmark size.
 * @property {number} pull Pixels to pull the wordmark left.
 * @property {string} tagline
 * @property {string} [url]
 * @property {string} [fontPath]
 * @property {string} surface
 * @property {string} [accentCss] Bottom bar background; none when unset.
 */

/**
 * Open Graph page markup.
 * @param {OgOptions} options
 * @returns {string}
 */
export function ogHtml({ name, wordmark, size, pull, tagline, url, fontPath, surface, accentCss }) {
	let face = "";
	if (fontPath) {
		const format = { ".woff2": "woff2", ".woff": "woff", ".ttf": "truetype", ".otf": "opentype" }[path.extname(fontPath).toLowerCase()];
		face = `@font-face{font-family:"Brand";src:url(data:font/${format === "truetype" ? "ttf" : format === "opentype" ? "otf" : format};base64,${readFileSync(fontPath).toString("base64")}) format("${format}");font-weight:100 900}`;
	}
	const uri = `data:image/svg+xml;base64,${Buffer.from(wordmark).toString("base64")}`;
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
${face}
html,body{margin:0;inline-size:${OG.width}px;block-size:${OG.height}px;background:${surface};color:${FG};font-family:${fontPath ? '"Brand",' : ""}system-ui,sans-serif}
main{box-sizing:border-box;block-size:100%;padding:88px 96px 104px;display:grid;align-content:center;gap:32px}
img{justify-self:start;margin-inline-start:-${pull}px}
p{margin:0;max-inline-size:900px;font-size:46px;line-height:1.2;font-weight:500;text-wrap:balance}
small{font-size:26px;color:${MUTED}}
footer{position:absolute;inset-inline:0;inset-block-end:0;block-size:16px;background:${accentCss}}
</style></head><body><main><img src="${uri}" width="${size.width}" height="${size.height}" alt="${escapeXml(name)}">${tagline ? `<p>${escapeXml(tagline)}</p>` : ""}${url ? `<small>${escapeXml(url)}</small>` : ""}</main>${accentCss ? "<footer></footer>" : ""}</body></html>`;
}

/**
 * The project's package name, for alt text when there is no spec.
 * @param {string} [project]
 * @returns {string}
 */
function packageName(project) {
	if (!project) return "";
	try {
		return JSON.parse(readFileSync(path.join(project, "package.json"), "utf8")).name?.split("/").pop() ?? "";
	} catch {
		return "";
	}
}

/**
 * @typedef {object} ExportOptions
 * @property {boolean} [og]
 * @property {string} [tagline]
 * @property {string} [project]
 * @property {string} [name] Hand-made only: alt text for the Open Graph wordmark.
 * @property {string} [font] Hand-made only: font file for the tagline; system UI otherwise.
 * @property {string} [accent] Hand-made only: colour for the Open Graph bar; none otherwise.
 * @property {string} [background] Touch icon fill behind transparent pixels.
 * @property {string} [url] Hand-made only: small line under the tagline.
 */

/**
 * Write the raster exports into a folder.
 * @param {string} dir
 * @param {ExportOptions} [options]
 * @returns {Promise<{ source: "build" | "hand-made", files: object[], warnings: string[] }>}
 */
export async function exportBuild(dir, options = {}) {
	const { og = false, tagline, project } = options;
	const metaFile = path.join(dir, "meta.json");
	const spec = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, "utf8")).spec : null;
	const read = (name) => {
		const file = path.join(dir, name);
		if (!existsSync(file)) throw new Error(`Missing ${file}${spec ? ": rebuild before exporting" : ""}.`);
		return readFileSync(file, "utf8");
	};
	const warnings = [];
	const checked = (name, svg, square) => {
		if (spec) return svg;
		const findings = checkSvg(svg, { square });
		assertNoErrors(name, findings);
		warnings.push(...findings.map((f) => `${name}: ${f.message}`));
		return svg;
	};

	const favicon = checked("favicon.svg", read("favicon.svg"), true);
	const squareFile = path.join(dir, "icon-square.svg");
	const square = existsSync(squareFile) ? checked("icon-square.svg", readFileSync(squareFile, "utf8"), true) : favicon;
	const wordmark = og ? checked("wordmark.svg", read("wordmark.svg"), false) : null;
	const background = options.background ? parseColor(options.background) : null;

	const files = [];
	await withBrowser(async (browser) => {
		const touchPixels = await rasterize(browser, square, { width: 180, height: 180 });
		const transparent = touchPixels.data.some((v, i) => i % 4 === 3 && v < 255);
		if (transparent && !background) {
			throw new Error(
				`${existsSync(squareFile) ? "icon-square.svg" : "favicon.svg"} has transparent pixels (often rounded corners). Pass --background <colour>, usually the tile colour, to fill them for the touch icon.`,
			);
		}
		const touch = encodePng(touchPixels, { alpha: false, background: background ?? undefined });
		writeFileSync(path.join(dir, "apple-touch-icon.png"), touch);
		files.push({ file: "apple-touch-icon.png", bytes: formatBytes(touch.length), ...readPngHeader(touch) });

		const entries = [];
		for (const size of ICO_SIZES) entries.push(encodePng(await rasterize(browser, favicon, { width: size, height: size })));
		const ico = encodeIco(entries);
		writeFileSync(path.join(dir, "favicon.ico"), ico);
		files.push({ file: "favicon.ico", bytes: formatBytes(ico.length), sizes: ICO_SIZES });

		if (og) {
			const text = findTagline(spec, { tagline, project });
			const size = ogWordmarkSize(wordmark);
			const pull = leftInk(await rasterize(browser, wordmark, { ...size, scheme: "light" }));
			const accent = spec ? cssPaint(spec, spec.og.accent ?? spec.favicon.tile) : options.accent ? normalize(options.accent) : "";
			const html = ogHtml({
				name: spec?.name ?? options.name ?? (packageName(project) || path.basename(path.resolve(dir))),
				wordmark,
				size,
				pull,
				tagline: text,
				url: spec?.og.url ?? options.url,
				fontPath: spec?.font.path ?? options.font,
				surface: spec?.surfaces.light ?? "#ffffff",
				accentCss: accent,
			});
			const file = path.join(dir, "og.png");
			await screenshot(browser, html, { path: file, width: OG.width, height: OG.height, fullPage: false });
			const png = readFileSync(file);
			files.push({ file: "og.png", bytes: formatBytes(png.length), ...readPngHeader(png), tagline: text || "(none)" });
		}
	});
	for (const result of files) {
		if (!existsSync(path.join(dir, result.file))) throw new Error(`Export did not write ${result.file}.`);
	}
	return { source: spec ? "build" : "hand-made", files, warnings };
}

if (isMain(import.meta.url)) {
	run(async () => {
		const { values, positionals } = parseArgs({
			allowPositionals: true,
			options: {
				og: { type: "boolean" },
				tagline: { type: "string" },
				project: { type: "string" },
				name: { type: "string" },
				font: { type: "string" },
				accent: { type: "string" },
				background: { type: "string" },
				url: { type: "string" },
			},
		});
		if (positionals.length !== 1) {
			throw new Error("Usage: node scripts/export.js <dir> [--og] [--tagline ...] [--project <repo-root>] [--name ...] [--font <file>] [--accent <colour>] [--background <colour>] [--url ...]");
		}
		printJson(await exportBuild(positionals[0], values));
	});
}
