// Write the site settings & the build wiring into a project's package.json, leaving other keys alone.

import path from "node:path";

import PackageJson from "@npmcli/package-json";

import { CONFIG_KEY, RECORDED } from "./settings.js";

/**
 * @typedef {Object} PackageChanges
 * @property {{ before: Record<string, any> | undefined, after: Record<string, any>, changed: boolean }} settings
 * @property {string[]} devDependencies names added
 * @property {string[]} scripts names added
 * @property {string[]} scriptConflicts scripts the project already defines differently, left as they are
 */

/**
 * Records the site settings & adds the devDependencies & scripts the site needs.
 * A package or script the project already has is never changed.
 *
 * @param {string} packagePath
 * @param {{
 *   settings?: Record<string, any>,
 *   drop?: string[],
 *   devDependencies?: Record<string, string>,
 *   scripts?: Record<string, string>,
 * }} patch `settings` is merged into the recorded settings, which keep only `RECORDED` keys & `oss`; `drop` removes settings
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<PackageChanges>}
 */
export async function writePackage(packagePath, { settings = {}, drop = [], devDependencies = {}, scripts = {} }, { dryRun = false } = {}) {
	const pkg = await PackageJson.load(path.dirname(packagePath));
	const before = pkg.content[CONFIG_KEY];
	const recordable = Object.fromEntries(Object.entries(settings).filter(([key]) => RECORDED.includes(key) || key === "oss"));
	const after = { ...before, ...recordable };
	for (const key of drop) delete after[key];

	const known = { ...pkg.content.dependencies, ...pkg.content.devDependencies };
	const missing = Object.entries(devDependencies).filter(([name]) => !(name in known));
	const currentScripts = pkg.content.scripts ?? {};
	const newScripts = Object.entries(scripts).filter(([name]) => !(name in currentScripts));
	const scriptConflicts = Object.entries(scripts)
		.filter(([name, command]) => name in currentScripts && currentScripts[name] !== command)
		.map(([name]) => name);

	const changed = JSON.stringify(before) !== JSON.stringify(after);
	if (!dryRun && (changed || missing.length || newScripts.length)) {
		const update = {};
		if (changed) update[CONFIG_KEY] = after;
		if (missing.length) {
			update.devDependencies = Object.fromEntries(
				Object.entries({ ...pkg.content.devDependencies, ...Object.fromEntries(missing) }).sort(([a], [b]) => a.localeCompare(b)),
			);
		}
		if (newScripts.length) update.scripts = { ...currentScripts, ...Object.fromEntries(newScripts) };
		pkg.update(update);
		await pkg.save();
	}
	return {
		settings: { before, after, changed },
		devDependencies: missing.map(([name]) => name),
		scripts: newScripts.map(([name]) => name),
		scriptConflicts,
	};
}
