#!/usr/bin/env node
/**
 * Render a contact sheet of every build under a folder: the wordmark at master & header size,
 * the favicon at 16/32/64/180 (16 & 32 also as magnified real rasters), & tab-bar previews.
 * Writes sheet.html (self-contained, follows the system theme) plus light & dark PNGs.
 *
 * Usage: node scripts/sheet.js <dir> [--out <dir>] [--header 32] [--forced-colors] [--title "..."]
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { TAB_BARS } from "./lib/audit.js";
import { rasterize, screenshot, withBrowser } from "./lib/browser.js";
import { isMain, printJson, run } from "./lib/cli.js";
import { encodePng } from "./lib/png.js";
import { escapeXml } from "./lib/svg.js";

/**
 * Folders under `root` (including itself) that hold a build.
 * @param {string} root
 * @returns {string[]}
 */
export function findBuilds(root) {
	if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`Not a folder: ${root}`);
	const dirs = [root, ...readdirSync(root, { recursive: true }).map((entry) => path.join(root, entry))];
	const builds = dirs.filter((dir) => statSync(dir).isDirectory() && (existsSync(path.join(dir, "wordmark.svg")) || existsSync(path.join(dir, "favicon.svg"))));
	if (!builds.length) throw new Error(`No wordmark.svg or favicon.svg under ${root}. Did the build write its files?`);
	return builds.sort();
}

/** @param {string} svg */
const svgUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/**
 * Read one build's SVGs & label.
 * @param {string} dir
 * @param {string} root
 */
function readBuild(dir, root) {
	const read = (name) => (existsSync(path.join(dir, name)) ? readFileSync(path.join(dir, name), "utf8") : null);
	let meta = {};
	try {
		meta = JSON.parse(read("meta.json") ?? "{}");
	} catch {
		// A hand-made folder may have no meta.json.
	}
	const label = path.relative(root, dir) || path.basename(dir);
	return {
		label,
		note: meta.variant?.label && meta.variant.label !== label ? meta.variant.label : meta.concept ?? "",
		failures: meta.contrast?.failures ?? [],
		wordmark: read("wordmark.svg"),
		favicon: read("favicon.svg"),
		square: read("icon-square.svg"),
	};
}

/**
 * Build the sheet HTML. Magnified rasters are passed in because they need a browser.
 * @param {ReturnType<typeof readBuild>[]} builds
 * @param {{ header: number, title: string, rasters: Map<string, { light16: string, light32: string }> }} options
 * @returns {string}
 */
export function sheetHtml(builds, { header, title, rasters }) {
	const rows = builds.map((build) => {
		const parts = [`<h2>${escapeXml(build.label)}</h2>`];
		if (build.note) parts.push(`<p>${escapeXml(build.note)}</p>`);
		if (build.failures.length) parts.push(`<p class="warn">Contrast misses: ${escapeXml(build.failures.join(", "))}</p>`);
		if (build.wordmark) {
			const uri = svgUri(build.wordmark);
			parts.push(
				`<div class="stage"><img class="master" src="${uri}" alt="${escapeXml(build.label)} wordmark"></div>`,
				`<div class="header"><img src="${uri}" style="height:${header}px" alt=""><span>Docs</span><span>GitHub</span></div>`,
			);
		}
		if (build.favicon) {
			const uri = svgUri(build.favicon);
			const raster = rasters.get(build.label);
			parts.push(
				`<div class="icons">${[16, 32, 64, 180].map((s) => `<figure><img src="${uri}" width="${s}" height="${s}" alt=""><figcaption>${s}</figcaption></figure>`).join("")}` +
					(raster
						? `<figure><img class="px" src="${raster.light16}" width="64" height="64" alt=""><figcaption>16 raster ×4</figcaption></figure>` +
							`<figure><img class="px" src="${raster.light32}" width="64" height="64" alt=""><figcaption>32 raster ×2</figcaption></figure>`
						: "") +
					(build.square ? `<figure><img class="mask" src="${svgUri(build.square)}" width="90" height="90" alt=""><figcaption>touch, masked</figcaption></figure>` : "") +
					"</div>",
				`<div class="tabs">${Object.entries(TAB_BARS)
					.map(([name, bg]) => `<div class="tab" style="background:${bg};color:${name === "dark" ? "#e8eaed" : "#3c4043"}"><img src="${uri}" width="16" height="16" alt=""><span>${escapeXml(build.label)}</span></div>`)
					.join("")}</div>`,
			);
		}
		return `<section>${parts.join("")}</section>`;
	});
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><title>${escapeXml(title)}</title>
<style>
:root{--bg:#ffffff;--fg:#16181d;--muted:#4b5160;--rule:#d9dce3;--elev:#f4f5f8;font-family:system-ui,sans-serif;color:var(--fg);background:var(--bg)}
@media (prefers-color-scheme:dark){:root{--bg:#101216;--fg:#eceef3;--muted:#a4abba;--rule:#2a2f38;--elev:#181b21}}
body{margin:0;padding:24px 32px;display:grid;gap:24px}
h1{margin:0;font-size:20px}h2{margin:0;font-size:16px}p{margin:0;color:var(--muted);font-size:14px}.warn{color:#b3261e}
@media (prefers-color-scheme:dark){.warn{color:#ffb4ab}}
section{display:grid;gap:12px;padding-block-end:24px;border-block-end:1px solid var(--rule)}
.stage img.master{max-inline-size:560px;max-block-size:160px}
.header{display:flex;align-items:center;gap:24px;padding:12px 16px;background:var(--elev);border-radius:8px;font-size:14px;color:var(--muted)}
.header img{margin-inline-end:auto}
.icons{display:flex;align-items:end;gap:20px;flex-wrap:wrap}
figure{margin:0;display:grid;justify-items:center;gap:4px}figcaption{font-size:12px;color:var(--muted)}
.px{image-rendering:pixelated}.mask{border-radius:22%}
.tabs{display:flex;gap:12px}.tab{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px 8px 0 0;font-size:13px;min-inline-size:180px}
@media (forced-colors:active){.header,.tab{border:1px solid CanvasText}}
</style></head><body><h1>${escapeXml(title)}</h1>${rows.join("")}</body></html>
`;
}

/**
 * Render the sheet for every build under `root`.
 * @param {string} root
 * @param {{ out?: string, header?: number, forcedColors?: boolean, title?: string }} [options]
 * @returns {Promise<{ html: string, images: string[], builds: string[] }>}
 */
export async function renderSheet(root, { out = root, header = 32, forcedColors = false, title = "Contact sheet" } = {}) {
	const builds = findBuilds(root).map((dir) => readBuild(dir, root));
	return withBrowser(async (browser) => {
		const rasters = new Map();
		for (const build of builds) {
			if (!build.favicon) continue;
			const uri = async (size) => `data:image/png;base64,${encodePng(await rasterize(browser, build.favicon, { width: size, height: size })).toString("base64")}`;
			rasters.set(build.label, { light16: await uri(16), light32: await uri(32) });
		}
		const html = sheetHtml(builds, { header, title, rasters });
		mkdirSync(out, { recursive: true });
		const htmlFile = path.join(out, "sheet.html");
		writeFileSync(htmlFile, html);
		const images = [];
		const shots = [
			["light", false],
			["dark", false],
		];
		if (forcedColors) shots.push(["light", true]);
		for (const [scheme, forced] of shots) {
			const file = path.join(out, `sheet-${forced ? "forced" : scheme}.png`);
			await screenshot(browser, html, { path: file, scheme, forcedColors: forced, width: 1000 });
			images.push(file);
		}
		return { html: htmlFile, images, builds: builds.map((b) => b.label) };
	});
}

if (isMain(import.meta.url)) {
	run(async () => {
		const { values, positionals } = parseArgs({
			allowPositionals: true,
			options: { out: { type: "string" }, header: { type: "string" }, "forced-colors": { type: "boolean" }, title: { type: "string" } },
		});
		if (positionals.length !== 1) throw new Error("Usage: node scripts/sheet.js <dir> [--out <dir>] [--header 32] [--forced-colors] [--title ...]");
		printJson(
			await renderSheet(positionals[0], {
				out: values.out ?? positionals[0],
				header: values.header ? Number(values.header) : 32,
				forcedColors: values["forced-colors"],
				title: values.title,
			}),
		);
	});
}
