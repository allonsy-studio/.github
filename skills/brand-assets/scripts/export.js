#!/usr/bin/env node
/**
 * Raster exports from a finished build folder (one that build.js wrote, with meta.json):
 *   apple-touch-icon.png  180×180, opaque RGB, square corners (iOS applies its own mask)
 *   favicon.ico           16, 32, & 48 px PNG entries, for browsers & tools that ask for /favicon.ico
 *   og.png                1200×630 Open Graph image, light theme (with --og)
 *
 * Usage: node scripts/export.js <build-dir> [--og] [--tagline "..."] [--project <repo-root>]
 * The tagline falls back to the spec's og.tagline, then <project>/<site>/_data/project.json.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { rasterize, screenshot, withBrowser } from "./lib/browser.js";
import { formatBytes, isMain, printJson, run } from "./lib/cli.js";
import { encodeIco, encodePng, readPngHeader } from "./lib/png.js";
import { paintColors } from "./lib/spec.js";
import { escapeXml } from "./lib/svg.js";

/** Open Graph size every major consumer accepts without cropping. */
export const OG = { width: 1200, height: 630 };
/** Wordmark height on the Open Graph image: large enough to read in a 500 px wide link preview. */
const WORDMARK_HEIGHT = 180;
/** Legacy icon sizes: tab (16), taskbar & retina tab (32), Windows desktop (48). */
export const ICO_SIZES = [16, 32, 48];
/** Page text on the light surface, from the oss-docs-site tokens. */
const FG = "#16181d";
const MUTED = "#4b5160";

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
 * @param {object} spec
 * @param {{ tagline?: string, project?: string }} options
 * @returns {string}
 */
export function findTagline(spec, { tagline, project }) {
	if (tagline) return tagline;
	if (spec.og?.tagline) return spec.og.tagline;
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
 * Open Graph page markup.
 * @param {object} spec
 * @param {string} wordmarkSvg
 * @param {string} tagline
 * @returns {string}
 */
export function ogHtml(spec, wordmarkSvg, tagline) {
	const fontUri = `data:font/woff2;base64,${readFileSync(spec.font.path).toString("base64")}`;
	const format = { ".woff2": "woff2", ".woff": "woff", ".ttf": "truetype", ".otf": "opentype" }[path.extname(spec.font.path).toLowerCase()];
	const accent = spec.og.accent ?? spec.favicon.tile;
	const wordmark = `data:image/svg+xml;base64,${Buffer.from(wordmarkSvg).toString("base64")}`;
	// Pull the wordmark left by its own padding so its ink lines up with the tagline.
	const viewHeight = Number(/viewBox="[\d.-]+ [\d.-]+ [\d.-]+ ([\d.]+)"/.exec(wordmarkSvg)?.[1] ?? 0);
	const pull = viewHeight ? ((spec.padding * spec.size) / viewHeight) * WORDMARK_HEIGHT : 0;
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
@font-face{font-family:"Brand";src:url(${fontUri}) format("${format}");font-weight:100 900}
html,body{margin:0;inline-size:${OG.width}px;block-size:${OG.height}px;background:${spec.surfaces.light};color:${FG};font-family:"Brand",system-ui,sans-serif}
main{box-sizing:border-box;block-size:100%;padding:88px 96px 104px;display:grid;align-content:center;gap:32px}
img{block-size:${WORDMARK_HEIGHT}px;inline-size:auto;max-inline-size:800px;object-fit:contain;object-position:left center;justify-self:start;margin-inline-start:-${pull.toFixed(1)}px}
p{margin:0;max-inline-size:900px;font-size:46px;line-height:1.2;font-weight:500;text-wrap:balance}
small{font-size:26px;color:${MUTED}}
footer{position:absolute;inset-inline:0;inset-block-end:0;block-size:16px;background:${cssPaint(spec, accent)}}
</style></head><body><main><img src="${wordmark}" alt="${escapeXml(spec.name)}">${tagline ? `<p>${escapeXml(tagline)}</p>` : ""}${spec.og.url ? `<small>${escapeXml(spec.og.url)}</small>` : ""}</main><footer></footer></body></html>`;
}

/**
 * Write the raster exports into a build folder.
 * @param {string} dir
 * @param {{ og?: boolean, tagline?: string, project?: string }} [options]
 * @returns {Promise<object[]>} One entry per file: name, bytes, & what was checked.
 */
export async function exportBuild(dir, { og = false, tagline, project } = {}) {
	const metaFile = path.join(dir, "meta.json");
	if (!existsSync(metaFile)) throw new Error(`${dir} has no meta.json: run build.js first.`);
	const { spec } = JSON.parse(readFileSync(metaFile, "utf8"));
	const read = (name) => {
		const file = path.join(dir, name);
		if (!existsSync(file)) throw new Error(`Missing ${file}: rebuild before exporting.`);
		return readFileSync(file, "utf8");
	};
	const favicon = read("favicon.svg");
	const square = read("icon-square.svg");
	const results = [];
	await withBrowser(async (browser) => {
		const touch = encodePng(await rasterize(browser, square, { width: 180, height: 180 }), { alpha: false });
		writeFileSync(path.join(dir, "apple-touch-icon.png"), touch);
		results.push({ file: "apple-touch-icon.png", bytes: formatBytes(touch.length), ...readPngHeader(touch) });

		const entries = [];
		for (const size of ICO_SIZES) entries.push(encodePng(await rasterize(browser, favicon, { width: size, height: size })));
		const ico = encodeIco(entries);
		writeFileSync(path.join(dir, "favicon.ico"), ico);
		results.push({ file: "favicon.ico", bytes: formatBytes(ico.length), sizes: ICO_SIZES });

		if (og) {
			const text = findTagline(spec, { tagline, project });
			const file = path.join(dir, "og.png");
			await screenshot(browser, ogHtml(spec, read("wordmark.svg"), text), { path: file, width: OG.width, height: OG.height, fullPage: false });
			const png = readFileSync(file);
			results.push({ file: "og.png", bytes: formatBytes(png.length), ...readPngHeader(png), tagline: text || "(none)" });
		}
	});
	for (const result of results) {
		if (!existsSync(path.join(dir, result.file))) throw new Error(`Export did not write ${result.file}.`);
	}
	return results;
}

if (isMain(import.meta.url)) {
	run(async () => {
		const { values, positionals } = parseArgs({
			allowPositionals: true,
			options: { og: { type: "boolean" }, tagline: { type: "string" }, project: { type: "string" } },
		});
		if (positionals.length !== 1) throw new Error("Usage: node scripts/export.js <build-dir> [--og] [--tagline ...] [--project <repo-root>]");
		printJson(await exportBuild(positionals[0], values));
	});
}
