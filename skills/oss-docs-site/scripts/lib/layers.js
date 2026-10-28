// What the scaffold writes. The layouts, components, styles, fonts, & studio layer ship in
// the Norn packages, so a site holds only its config, data, pages, & accessibility check.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TEMPLATES_DIR = path.join(SKILL_ROOT, "templates");
export const SHARED_DIR = path.join(TEMPLATES_DIR, "shared");
export const WORKFLOW_TEMPLATE = path.join(TEMPLATES_DIR, "workflows", "pages.yml");

const posix = (p) => p.split(path.sep).join("/");

/** The directory Eleventy writes the built site to, inside the site directory. */
export const OUTPUT_DIR = "_site";

/** The site flavors. */
export const FLAVORS = Object.freeze(["landing", "docs", "workspaces"]);

/** The release of the Norn packages the scaffold pins. */
export const NORN_RANGE = "^0.1.0-beta.1";

/** The Norn packages a site installs. */
export const NORN_PACKAGES = Object.freeze(
	Object.fromEntries(["webc-code-sample", "webc-oss-site", "webc-patterns"].map((name) => [`@allons-y/${name}`, NORN_RANGE])),
);

/** Packages the site build & its accessibility check need. */
export const SITE_DEV_DEPENDENCIES = Object.freeze({
	"@11ty/eleventy": "^3.1.6",
	"@11ty/eleventy-plugin-webc": "^0.11.2",
	...NORN_PACKAGES,
	"axe-core": "^4.11.0",
	cypress: "^15.21.1",
	"cypress-axe": "^1.7.0",
});

/** Studio tooling every repository carries: opx for linting, dashly for template skills. */
export const REPO_DEV_DEPENDENCIES = Object.freeze({
	"@allons-y/dashly": "^0.1.0-beta.0",
	"@allons-y/opx-cli": "^0.1.0-beta.0",
	"@allons-y/opx-lint-js": "^0.1.0-beta.0",
	"@allons-y/opx-lint-json": "^0.1.0-beta.0",
	"@allons-y/opx-lint-md": "^0.1.0-beta.0",
});

/** The site's starter styles: the accent & fonts. The project's from the first run, never overwritten. */
export const PROJECT_CSS = "content/assets/styles/project.css";

/** Pages that are config, not content: the pagination stub a Workspaces site needs. */
const CONFIG_PAGES = new Set(["content/workspaces.md"]);

/**
 * Whether a site-relative path is the project's own after the first run: its styles & its Markdown pages.
 * The scaffold creates them once, switches an unedited page with its flavor, & never overwrites them otherwise.
 *
 * @param {string} rel
 * @returns {boolean}
 */
export const isProjectFile = (rel) => rel === PROJECT_CSS || (/^content\/.+\.md$/.test(rel) && !CONFIG_PAGES.has(rel));

/**
 * @param {string} dir
 * @returns {string[]} sorted relative paths, forward-slashed
 */
function listFiles(dir) {
	return readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => posix(path.relative(dir, path.join(entry.parentPath, entry.name))))
		.sort();
}

/**
 * The template files of a flavor: the shared ones, then the flavor's own, which win a clash.
 *
 * @param {string} flavor
 * @param {{ sharedDir?: string }} [dirs]
 * @returns {{ rel: string, source: string, layer: "core" | "flavor" }[]}
 */
export function templateFiles(flavor, { sharedDir = SHARED_DIR } = {}) {
	const layers = [
		{ dir: sharedDir, layer: /** @type {const} */ ("core") },
		{ dir: path.join(TEMPLATES_DIR, flavor), layer: /** @type {const} */ ("flavor") },
	];
	const files = new Map();
	for (const { dir, layer } of layers) {
		if (!existsSync(dir)) continue;
		for (const rel of listFiles(dir)) files.set(rel, { rel, source: path.join(dir, rel), layer });
	}
	return [...files.values()];
}
