#!/usr/bin/env node
/**
 * Build one or more specs into wordmark.svg, favicon.svg, icon-square.svg, & meta.json.
 * One spec per concept: each lands in <out>/<spec name>/ unless --flat is given with a single spec.
 *
 * Usage: node scripts/build.js <spec.json> [...] --out <dir> [--flat]
 */

import path from "node:path";
import { parseArgs } from "node:util";

import { formatBytes, isMain, printJson, run } from "./lib/cli.js";
import { buildToDir } from "./lib/build.js";

if (isMain(import.meta.url)) {
	run(async () => {
		const { values, positionals } = parseArgs({
			allowPositionals: true,
			options: { out: { type: "string" }, flat: { type: "boolean" } },
		});
		if (!positionals.length || !values.out) throw new Error("Usage: node scripts/build.js <spec.json> [...] --out <dir> [--flat]");
		if (values.flat && positionals.length > 1) throw new Error("--flat takes exactly one spec.");
		const results = [];
		for (const file of positionals) {
			const dir = values.flat ? values.out : path.join(values.out, path.basename(file, ".json"));
			const meta = await buildToDir(file, dir);
			results.push({
				spec: file,
				dir,
				wordmark: `${meta.wordmark.width}×${meta.wordmark.height}`,
				bytes: Object.fromEntries(Object.entries(meta.bytes).map(([k, v]) => [k, formatBytes(v)])),
				axes: meta.font.applied,
				ignoredAxes: meta.font.ignored,
				clampedAxes: meta.font.clamped,
				contrastFailures: meta.contrast.failures,
				decorative: meta.contrast.decorative,
			});
		}
		printJson(results);
	});
}
