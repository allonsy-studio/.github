// Write the site settings into a project's package.json, leaving other keys alone.

import path from "node:path";

import PackageJson from "@npmcli/package-json";

import { CONFIG_KEY, SETTINGS } from "./settings.js";

/**
 * @param {string} packagePath
 * @param {Record<string, any>} patch merged into the recorded settings; keys the schema lacks are not recorded
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ before: Record<string, any> | undefined, after: Record<string, any>, changed: boolean }>}
 */
export async function writeRecorded(packagePath, patch, { dryRun = false } = {}) {
	const pkg = await PackageJson.load(path.dirname(packagePath));
	const before = pkg.content[CONFIG_KEY];
	const recordable = Object.fromEntries(Object.entries(patch).filter(([key]) => key in SETTINGS));
	const after = { ...before, ...recordable };
	const changed = JSON.stringify(before) !== JSON.stringify(after);
	if (changed && !dryRun) {
		pkg.update({ [CONFIG_KEY]: after });
		await pkg.save();
	}
	return { before, after, changed };
}
