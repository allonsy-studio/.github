/**
 * Shared test helpers: temporary projects & file listings.
 * @module helpers
 */

import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scaffold } from "../scripts/scaffold.js";

export const HERE = path.dirname(fileURLToPath(import.meta.url));

/** A package.json the scaffold accepts: in the org, with a license & description. */
export const PACKAGE = Object.freeze({
	name: "@allonsy-studio/demo",
	version: "1.0.0",
	description: "A demo project. It is small.",
	license: "MPL-2.0",
	type: "module",
	repository: { type: "git", url: "git+https://github.com/allonsy-studio/demo.git" },
});

/**
 * @param {Record<string, any>} [overrides] merged over PACKAGE; a key set to undefined is removed
 * @returns {string} A fresh project folder with a package.json & a README.
 */
export function tempProject(overrides = {}) {
	const dir = mkdtempSync(path.join(tmpdir(), "oss-docs-site-"));
	const pkg = { ...PACKAGE, ...overrides };
	writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg, null, "\t") + "\n");
	writeFileSync(path.join(dir, "README.md"), "# Demo\n");
	return dir;
}

/** @param {string} dir @param {string} rel @returns {string} */
export const read = (dir, rel) => readFileSync(path.join(dir, rel), "utf8");

/** @param {string} dir @param {string} rel @param {string} text */
export function put(dir, rel, text) {
	mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
	writeFileSync(path.join(dir, rel), text);
}

/** @param {string} dir @param {string} rel @returns {Record<string, any>} */
export const readJson = (dir, rel) => JSON.parse(read(dir, rel));

/**
 * @param {string} dir
 * @returns {string[]} every file under dir, forward-slashed & sorted
 */
export const listing = (dir) =>
	readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
		.sort();

/** @param {string} dir @returns {Record<string, string>} each file's text, by path */
export const snapshot = (dir) => Object.fromEntries(listing(dir).map((rel) => [rel, read(dir, rel)]));

/**
 * @param {string} dir
 * @param {Parameters<typeof scaffold>[0]} [options]
 */
export const run = (dir, options = {}) => scaffold({ root: dir, ...options });

/** @param {Awaited<ReturnType<typeof run>>} result @param {string} file @returns {string | undefined} */
export const statusOf = (result, file) => result.actions.find((action) => action.path === file)?.status;

/**
 * Installs the schemas the way the Norn packages ship them, so the scaffold can read them.
 *
 * @param {string} dir the project root
 */
export function installSchemas(dir) {
	const scope = path.join(dir, "node_modules", "@allons-y");
	mkdirSync(path.join(scope, "webc-patterns", "schema"), { recursive: true });
	mkdirSync(path.join(scope, "webc-oss-site", "schema"), { recursive: true });
	cpSync(path.join(HERE, "fixtures", "project.schema.json"), path.join(scope, "webc-patterns", "schema", "project.schema.json"));
	cpSync(path.join(HERE, "fixtures", "oss-docs.schema.json"), path.join(scope, "webc-oss-site", "schema", "oss-docs.schema.json"));
}
