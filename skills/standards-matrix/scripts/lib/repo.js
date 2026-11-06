/**
 * SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Allons-y Studio
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", ".yarn", "dist", "_site", "coverage"]);

/** Paths that hold sample content rather than the repository's own code. */
export const isFixture = (path) => /(^|\/)(templates|evals|fixtures|golden)\//.test(path);

/**
 * List every file under a directory.
 * @param {string} dir
 * @returns {string[]} Sorted, relative, POSIX-style paths.
 */
export function walk(dir) {
	const out = [];
	const visit = (current) => {
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (!SKIP_DIRS.has(entry.name)) visit(join(current, entry.name));
			} else if (entry.isFile()) {
				out.push(relative(dir, join(current, entry.name)).split(sep).join("/"));
			}
		}
	};
	visit(dir);
	return out.sort();
}

/**
 * Wrap a checkout in the read-only helpers the checks use.
 * @param {string} name Repository name, such as `webc-docs`.
 * @param {string} dir Path to a checkout.
 * @param {ReturnType<typeof makeRepo> | null} [baseline] The org repository, for comparing shared files. Null for the org repository itself.
 */
export function makeRepo(name, dir, baseline = null) {
	let files;
	let packages;
	const read = (rel) => {
		try {
			return readFileSync(join(dir, rel), "utf8");
		} catch {
			return null;
		}
	};
	const json = (rel) => {
		const text = read(rel);
		if (text == null) return null;
		try {
			return JSON.parse(text);
		} catch {
			return null;
		}
	};
	return {
		name,
		dir,
		baseline,
		has: (rel) => existsSync(join(dir, rel)),
		read,
		json,
		/** @returns {string[]} */
		files: () => (files ??= walk(dir)),
		/** @returns {{ dir: string, file: string, root: boolean, json: object }[]} Every package.json outside sample content. */
		packages() {
			if (packages) return packages;
			packages = [];
			for (const file of this.files()) {
				if (!/(^|\/)package\.json$/.test(file) || isFixture(file)) continue;
				const parsed = json(file);
				if (!parsed) continue;
				const pkgDir = file === "package.json" ? "." : file.slice(0, -"/package.json".length);
				packages.push({ dir: pkgDir, file, root: pkgDir === ".", json: parsed });
			}
			return packages;
		},
	};
}
