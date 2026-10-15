#!/usr/bin/env node
/**
 * Build colour (or any other) variants of one spec without editing finished SVGs.
 *
 * Usage:
 *   node scripts/variants.js --spec <spec.json> --variants <variants.json> --out <dir> [--deepen]
 *   node scripts/variants.js --spec <spec.json> --token <palette name> --accents "#d22d6f,#1f91ad" --out <dir>
 *
 * variants.json is an array of { "id", "label"?, "patch" }: each patch deep-merges into the spec (null deletes a key).
 * --accents makes one variant per colour for that palette entry & always deepens.
 * --deepen moves failing text & graphic colours to the nearest passing lightness, keeping hue.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { deepenPatch } from "./lib/audit.js";
import { buildToDir } from "./lib/build.js";
import { isMain, printJson, run } from "./lib/cli.js";
import { normalize } from "./lib/color.js";
import { loadSpec, mergePatch } from "./lib/spec.js";

/**
 * Variants from an accent list.
 * @param {string} token
 * @param {string[]} accents
 * @returns {{ id: string, label: string, patch: object }[]}
 */
export function accentVariants(token, accents) {
	return accents.map((accent) => {
		const hex = normalize(accent);
		return { id: `${token}-${hex.slice(1)}`, label: `${token} ${hex}`, patch: { palette: { [token]: { light: hex, dark: hex } } } };
	});
}

/**
 * Build every variant, optionally deepening failing colours first.
 * @param {string} specFile
 * @param {{ id: string, label?: string, patch: object }[]} variants
 * @param {string} outDir
 * @param {{ deepen?: boolean }} [options]
 * @returns {Promise<object[]>}
 */
export async function buildVariants(specFile, variants, outDir, { deepen = false } = {}) {
	const ids = new Set();
	const results = [];
	for (const variant of variants) {
		if (!/^[a-z0-9][a-z0-9-]*$/.test(variant.id ?? "")) throw new Error(`Variant id "${variant.id}" must be lowercase letters, digits, & hyphens.`);
		if (ids.has(variant.id)) throw new Error(`Duplicate variant id "${variant.id}".`);
		ids.add(variant.id);
		let patch = variant.patch ?? {};
		let changes = [];
		if (deepen) {
			const deepened = deepenPatch(loadSpec(specFile, patch));
			patch = mergePatch(patch, deepened.patch);
			changes = deepened.changes;
		}
		const meta = await buildToDir(specFile, path.join(outDir, variant.id), {
			patch,
			extra: { variant: { id: variant.id, label: variant.label ?? variant.id, patch, deepened: changes } },
		});
		results.push({ id: variant.id, dir: meta.dir, deepened: changes, contrastFailures: meta.contrast.failures });
	}
	return results;
}

if (isMain(import.meta.url)) {
	run(async () => {
		const { values } = parseArgs({
			options: {
				spec: { type: "string" },
				variants: { type: "string" },
				token: { type: "string" },
				accents: { type: "string" },
				out: { type: "string" },
				deepen: { type: "boolean" },
			},
		});
		if (!values.spec || !values.out || (!values.variants && !(values.token && values.accents))) {
			throw new Error("Usage: node scripts/variants.js --spec <spec.json> (--variants <file> | --token <name> --accents <list>) --out <dir> [--deepen]");
		}
		const variants = values.variants
			? JSON.parse(readFileSync(values.variants, "utf8"))
			: accentVariants(values.token, values.accents.split(",").map((s) => s.trim()).filter(Boolean));
		if (!Array.isArray(variants) || !variants.length) throw new Error("Variants must be a non-empty array.");
		printJson(await buildVariants(values.spec, variants, values.out, { deepen: values.deepen || Boolean(values.accents) }));
	});
}
