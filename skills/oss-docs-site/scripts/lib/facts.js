// Heuristic facts for the flavor & tooling suggestions; `signals` reports what was read.

import { existsSync, globSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { OUTPUT_DIR } from "./layers.js";

const SKIPPED_DIRS = new Set([
	".git",
	".github",
	".yarn",
	"node_modules",
	"dist",
	"build",
	"coverage",
	OUTPUT_DIR,
	// Not the project's own resources.
	"docs",
	"test",
	"tests",
	"__tests__",
	"scripts",
]);

const MAX_SINGLE_PAGE_README_LINES = 200;
const MAX_SINGLE_PAGE_DOC_FILES = 3;

/** @param {string} file */
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/** Directories no search should enter. */
const skip = (name) => name === "node_modules" || name === OUTPUT_DIR;

/**
 * Counts Markdown files, stopping once the count passes `limit`.
 *
 * @param {string} dir
 * @param {number} limit
 * @returns {number} the count, which is `limit + 1` when there are more
 */
function countMarkdown(dir, limit) {
	let count = 0;
	const walk = (current) => {
		if (!existsSync(current)) return;
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			if (count > limit) return;
			if (entry.isDirectory()) {
				if (!skip(entry.name)) walk(path.join(current, entry.name));
			} else if (entry.name.endsWith(".md")) {
				count++;
			}
		}
	};
	walk(dir);
	return count;
}

/**
 * Workspace member directories: matches of the globs, minus `!` exclusions.
 *
 * @param {string} root
 * @param {string[]} patterns
 * @returns {string[]} absolute member directories
 */
function expandWorkspaces(root, patterns) {
	const found = (list) =>
		globSync(list.map((p) => `${p}/package.json`), { cwd: root, exclude: skip });
	const excluded = new Set(found(patterns.filter((p) => p.startsWith("!")).map((p) => p.slice(1))));
	return found(patterns.filter((p) => !p.startsWith("!")))
		.filter((file) => !excluded.has(file))
		.map((file) => path.join(root, path.dirname(file)));
}

/**
 * A workspace has its own page when it carries a SKILL.md or a docs folder of Markdown.
 *
 * @param {string} dir workspace directory
 * @returns {boolean}
 */
function hasOwnPage(dir) {
	return existsSync(path.join(dir, "SKILL.md")) || countMarkdown(path.join(dir, "docs"), 0) > 0;
}

/**
 * @param {string} root
 * @returns {{ typescript: boolean, javascript: boolean }}
 */
function scanSources(root) {
	const files = globSync("**/*.{ts,tsx,mts,cts,js,mjs}", {
		cwd: root,
		exclude: (name) => SKIPPED_DIRS.has(name),
	});
	return {
		typescript:
			existsSync(path.join(root, "tsconfig.json")) ||
			files.some((f) => /\.(ts|tsx|mts|cts)$/.test(f) && !f.endsWith(".d.ts")),
		javascript: files.some((f) => /\.(js|mjs)$/.test(f) && !/\.config\.(js|mjs)$/.test(f)),
	};
}

/**
 * @param {Record<string, any>} pkg parsed package.json
 * @returns {number} the package's entry points: bins, exports, or main
 */
function entryPointCount(pkg) {
	if (typeof pkg.bin === "string") return 1;
	if (pkg.bin && typeof pkg.bin === "object") return Object.keys(pkg.bin).length;
	if (pkg.exports && typeof pkg.exports === "object") {
		const keys = Object.keys(pkg.exports).filter((key) => key !== "./package.json");
		// Conditions-only exports (`import`, `default`) are one entry.
		return keys.every((key) => key.startsWith(".")) ? keys.length : 1;
	}
	return pkg.main || pkg.module ? 1 : 0;
}

/**
 * @param {string} repoRoot
 * @param {{ nestedDocsPages?: boolean, singleAction?: boolean }} [overrides] replace the heuristics
 * @returns {{
 *   name: string,
 *   workspaces: { dir: string, name: string, hasOwnPage: boolean }[],
 *   hasNestedDocsPages: boolean,
 *   isSingleAction: boolean,
 *   usesTypeScript: boolean,
 *   hasJavaScript: boolean,
 *   signals: Record<string, unknown>,
 * }}
 */
export function readRepoFacts(repoRoot, overrides = {}) {
	const root = path.resolve(repoRoot);
	const pkgFile = path.join(root, "package.json");
	if (!existsSync(pkgFile)) {
		throw new Error(`No package.json at ${root}. Run from the project root or pass --repo <path>.`);
	}
	const pkg = readJson(pkgFile);
	const patterns = Array.isArray(pkg.workspaces) ? pkg.workspaces : (pkg.workspaces?.packages ?? []);
	const members = expandWorkspaces(root, patterns);
	const workspaces = members.map((dir) => ({
		dir: path.relative(root, dir).split(path.sep).join("/"),
		name: readJson(path.join(dir, "package.json")).name ?? path.basename(dir),
		hasOwnPage: hasOwnPage(dir),
	}));

	const readme = ["README.md", "readme.md"].map((n) => path.join(root, n)).find(existsSync);
	const readmeLines = readme ? readFileSync(readme, "utf8").split("\n").length : 0;
	const docFiles = countMarkdown(path.join(root, "docs"), MAX_SINGLE_PAGE_DOC_FILES);
	const entryPoints = entryPointCount(pkg);
	const sources = scanSources(root);

	const nestedHeuristic = workspaces.filter((w) => w.hasOwnPage).length >= 2;
	const singleHeuristic =
		workspaces.length === 0 &&
		entryPoints === 1 &&
		docFiles <= MAX_SINGLE_PAGE_DOC_FILES &&
		readmeLines <= MAX_SINGLE_PAGE_README_LINES;

	return {
		name: pkg.name ?? path.basename(root),
		workspaces,
		hasNestedDocsPages: overrides.nestedDocsPages ?? nestedHeuristic,
		isSingleAction: overrides.singleAction ?? singleHeuristic,
		usesTypeScript: sources.typescript,
		hasJavaScript: sources.javascript,
		signals: {
			workspaceCount: workspaces.length,
			workspacesWithOwnPage: workspaces.filter((w) => w.hasOwnPage).length,
			entryPoints,
			docFiles,
			readmeLines,
			tsconfig: existsSync(path.join(root, "tsconfig.json")),
			overridden: Object.keys(overrides).filter((key) => overrides[key] !== undefined),
		},
	};
}
