#!/usr/bin/env node
/**
 * Report each font's family, variation axes, named instances, & metrics, & flag forbidden families.
 * Run this before writing a spec: only axes listed here may go in `font.axes`.
 *
 * Usage: node scripts/fonts.js [file-or-dir ...] [--json]
 * With no paths, reads docs/content/assets/fonts/ in the current project.
 */

import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { isMain, printJson, run } from "./lib/cli.js";
import { FONT_EXTENSIONS, describeFont, loadFont } from "./lib/font.js";

/**
 * Expand files & directories into font files.
 * @param {string[]} inputs
 * @returns {string[]}
 */
export function findFonts(inputs) {
	const out = [];
	for (const input of inputs) {
		let stat;
		try {
			stat = statSync(input);
		} catch {
			throw new Error(`Not found: ${input}`);
		}
		if (stat.isDirectory()) {
			for (const entry of readdirSync(input, { recursive: true })) {
				if (FONT_EXTENSIONS.includes(path.extname(entry).toLowerCase())) out.push(path.join(input, entry));
			}
		} else {
			out.push(input);
		}
	}
	return out.sort();
}

/**
 * @param {string[]} inputs
 * @returns {Promise<import("./lib/font.js").FontInfo[]>}
 */
export async function inspectFonts(inputs) {
	const files = findFonts(inputs);
	if (!files.length) throw new Error(`No ${FONT_EXTENSIONS.join(", ")} files in ${inputs.join(", ")}.`);
	return Promise.all(files.map(async (file) => describeFont(await loadFont(file))));
}

if (isMain(import.meta.url)) {
	run(async () => {
		const { values, positionals } = parseArgs({ allowPositionals: true, options: { json: { type: "boolean" } } });
		const infos = await inspectFonts(positionals.length ? positionals : ["docs/content/assets/fonts"]);
		if (values.json) return printJson(infos);
		for (const info of infos) {
			const axes = Object.entries(info.axes).map(([tag, a]) => `${tag} ${a.min}–${a.max} (default ${a.default})`);
			process.stdout.write(
				[
					`${info.family}${info.forbidden ? "  FORBIDDEN for wordmarks" : ""}`,
					`  file: ${info.file}`,
					`  axes: ${axes.length ? axes.join(", ") : "none (static)"}`,
					info.namedInstances.length ? `  named: ${info.namedInstances.join(", ")}` : "",
					`  per 1000 upm: cap ${Math.round((info.metrics.capHeight / info.unitsPerEm) * 1000)}, x-height ${Math.round((info.metrics.xHeight / info.unitsPerEm) * 1000)}`,
				]
					.filter(Boolean)
					.join("\n") + "\n",
			);
		}
	});
}
