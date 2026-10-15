#!/usr/bin/env node
/**
 * WCAG contrast for every palette colour on the light & dark surfaces, plus the favicon glyph on its tile.
 * Exits 1 when a text or graphic paint misses its target; decorative paints are reported, never failed.
 *
 * Usage: node scripts/contrast.js <spec.json> [--json] [--report-only]
 */

import { parseArgs } from "node:util";

import { contrastRows, contrastTable, deepenPatch } from "./lib/audit.js";
import { isMain, printJson, run } from "./lib/cli.js";
import { loadSpec } from "./lib/spec.js";

if (isMain(import.meta.url)) {
	run(async () => {
		const { values, positionals } = parseArgs({
			allowPositionals: true,
			options: { json: { type: "boolean" }, "report-only": { type: "boolean" } },
		});
		if (positionals.length !== 1) throw new Error("Usage: node scripts/contrast.js <spec.json> [--json] [--report-only]");
		const spec = loadSpec(positionals[0]);
		const rows = contrastRows(spec);
		const failures = rows.filter((row) => row.status === "fail");
		const { patch, changes } = deepenPatch(spec);
		if (values.json) printJson({ rows, failures: failures.length, suggestedPatch: patch, changes });
		else {
			process.stdout.write(contrastTable(rows) + "\n");
			if (changes.length) {
				process.stdout.write("\nDeepened values that pass (apply as a variant patch, or with variants.js --deepen):\n");
				for (const c of changes) process.stdout.write(`  ${c.name} ${c.scheme}: ${c.from} → ${c.to} (${c.ratio.toFixed(2)}:1${c.reached ? "" : ", target not reachable"})\n`);
			}
		}
		if (failures.length && !values["report-only"]) process.exitCode = 1;
	});
}
