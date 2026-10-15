/**
 * Build one spec into a folder of SVGs plus a meta.json summary.
 * @module build
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { contrastRows } from "./audit.js";
import { assertAllowed, describeFont, instance, loadFont } from "./font.js";
import { loadSpec, mergePatch, resolveSpec } from "./spec.js";
import { buildFavicon, buildWordmark } from "./svg.js";

/** Files every build writes. */
export const BUILD_FILES = ["wordmark.svg", "favicon.svg", "icon-square.svg", "spec.json"];

/**
 * Build SVGs from a resolved spec.
 * @param {object} spec
 * @returns {Promise<{ files: Record<string, string>, meta: object }>}
 */
export async function buildSpec(spec) {
	const base = await loadFont(spec.font.path);
	assertAllowed(base);
	const { font, applied, ignored, clamped } = instance(base, spec.font.axes);
	const wordmark = buildWordmark(spec, font);
	const favicon = buildFavicon(spec, font);
	const square = buildFavicon(spec, font, { square: true });
	const info = describeFont(base);
	const rows = contrastRows(spec);
	return {
		files: { "wordmark.svg": wordmark.svg, "favicon.svg": favicon.svg, "icon-square.svg": square.svg },
		meta: {
			name: spec.name,
			text: spec.text,
			concept: spec.concept ?? "",
			font: { family: info.family, file: spec.font.path, availableAxes: info.axes, applied, ignored, clamped },
			wordmark: { width: Math.round(wordmark.width), height: Math.round(wordmark.height) },
			contrast: {
				failures: rows.filter((r) => r.status === "fail").map((r) => `${r.subject} (${r.scheme})`),
				decorative: rows.filter((r) => r.status === "note").map((r) => `${r.subject} (${r.scheme})`),
			},
			spec,
		},
	};
}

/**
 * Build a spec file (optionally patched) into a folder, then confirm every file landed.
 * @param {string} specFile
 * @param {string} outDir
 * @param {{ patch?: object, extra?: object }} [options] `extra` is merged into meta.json, e.g. a variant label.
 * @returns {Promise<object>} meta.json contents plus `dir` & `bytes`.
 */
export async function buildToDir(specFile, outDir, { patch, extra } = {}) {
	const spec = loadSpec(specFile, patch);
	const raw = mergePatch(JSON.parse(readFileSync(specFile, "utf8")), patch ?? {});
	raw.font.file = spec.font.path;
	delete raw.$schema;
	return writeBuild(spec, outDir, extra, raw);
}

/**
 * @param {object} rawSpec An unresolved spec object.
 * @param {string} baseDir
 * @param {string} outDir
 * @returns {Promise<object>}
 */
export async function buildObjectToDir(rawSpec, baseDir, outDir) {
	const spec = resolveSpec(rawSpec, baseDir);
	return writeBuild(spec, outDir, {}, { ...structuredClone(rawSpec), font: { ...rawSpec.font, file: spec.font.path } });
}

/**
 * @param {object} spec
 * @param {string} outDir
 * @param {object} extra
 * @param {object} raw The spec as written, with an absolute font path; saved as spec.json so wire.js can keep it with the site.
 * @returns {Promise<object>}
 */
async function writeBuild(spec, outDir, extra, raw) {
	const { files, meta } = await buildSpec(spec);
	files["spec.json"] = JSON.stringify(raw, null, "\t") + "\n";
	mkdirSync(outDir, { recursive: true });
	const bytes = {};
	for (const [name, content] of Object.entries(files)) {
		const file = path.join(outDir, name);
		writeFileSync(file, content);
		bytes[name] = Buffer.byteLength(content);
	}
	const full = { ...meta, ...extra, bytes };
	writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(full, null, "\t") + "\n");
	const missing = [...BUILD_FILES, "meta.json"].filter((name) => !existsSync(path.join(outDir, name)));
	if (missing.length) throw new Error(`Build did not write: ${missing.join(", ")} in ${outDir}`);
	return { ...full, dir: outDir };
}
