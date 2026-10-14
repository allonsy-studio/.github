// Layer map for the scaffold. Core & flavor templates mirror the site directory;
// the studio SVGs come from the org's assets/svg.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SKILL_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
);
const TEMPLATES_DIR = path.join(SKILL_ROOT, "templates");
export const CORE_DIR = path.join(TEMPLATES_DIR, "shared");
const posix = (p) => p.split(path.sep).join("/");

export const ORG_ASSETS_DIR = path.resolve(SKILL_ROOT, "..", "..", "assets", "svg");
export const WORKFLOW_TEMPLATE = path.join(TEMPLATES_DIR, "workflows", "pages.yml");

/** The directory Eleventy writes the built site to, inside the site directory. */
export const OUTPUT_DIR = "_site";

/** The site flavors. */
export const FLAVORS = Object.freeze(["landing", "docs", "workspaces"]);

/** Studio SVGs: site-relative destination to the file in ORG_ASSETS_DIR. */
export const STUDIO_ASSETS = Object.freeze({
	"content/assets/img/studio/mark.svg": "mark.svg",
	"content/assets/img/studio/oss-banner.svg": "oss-banner.svg",
	"content/assets/img/studio/oss-footer-dark.svg": "oss-footer-dark.svg",
	"content/assets/img/studio/oss-footer-light.svg": "oss-footer-light.svg",
});

/** Site-relative paths of the locked studio layer. */
export const STUDIO_FILES = Object.freeze([
	"_includes/studio-banner.webc",
	"_includes/studio-cta.webc",
	"_includes/studio-footer.webc",
	"_data/studio.js",
	"content/assets/styles/studio.css",
	...Object.keys(STUDIO_ASSETS),
]);

/** Packages the site build & its accessibility check need. */
export const SITE_DEV_DEPENDENCIES = Object.freeze({
	"@11ty/eleventy": "^3.1.5",
	"@11ty/eleventy-fetch": "^5.1.0",
	"@11ty/eleventy-plugin-webc": "^0.11.2",
	"@fortawesome/fontawesome-free": "^7.3.1",
	"axe-core": "^4.11.0",
	cypress: "^15.21.1",
	"cypress-axe": "^1.7.0",
	"markdown-it": "^14.1.0",
	prismjs: "^1.30.0",
});

/** Studio tooling every repository carries: opx for linting, dashly for template skills. */
export const REPO_DEV_DEPENDENCIES = Object.freeze({
	"@allons-y/dashly": "^0.1.0-beta.0",
	"@allons-y/opx-cli": "^0.1.0-beta.0",
	"@allons-y/opx-lint-js": "^0.1.0-beta.0",
	"@allons-y/opx-lint-json": "^0.1.0-beta.0",
	"@allons-y/opx-lint-md": "^0.1.0-beta.0",
});

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
 * A flavor's own template files.
 *
 * @param {string} flavor
 * @returns {{ rel: string, source: string }[]}
 */
export function flavorFiles(flavor) {
	const dir = path.join(TEMPLATES_DIR, flavor);
	if (!existsSync(dir)) return [];
	return listFiles(dir).map((rel) => ({ rel, source: path.join(dir, rel) }));
}

/**
 * Core, studio, & flavor template files.
 *
 * @param {string} flavor
 * @param {{ coreDir?: string, assetsDir?: string }} [dirs]
 * @returns {{ rel: string, source: string, layer: "core" | "studio" | "flavor" }[]}
 */
export function templateFiles(
	flavor,
	{ coreDir = CORE_DIR, assetsDir = ORG_ASSETS_DIR } = {},
) {
	if (!existsSync(assetsDir)) {
		throw new Error(
			`The studio SVGs are read from ${assetsDir}. Run this skill from a checkout of allonsy-studio/.github, where assets/svg/ is the single source.`,
		);
	}
	const files = listFiles(coreDir).map((rel) => ({
		rel,
		source: path.join(coreDir, rel),
		layer: /** @type {const} */ ("core"),
	}));
	const flavorDir = path.join(TEMPLATES_DIR, flavor);
	const assets = Object.entries(STUDIO_ASSETS).map(([rel, name]) => ({
		rel,
		source: path.join(assetsDir, name),
		layer: /** @type {const} */ ("studio"),
	}));
	return files.concat(
		assets,
		listFiles(flavorDir).map((rel) => ({
			rel,
			source: path.join(flavorDir, rel),
			layer: /** @type {const} */ ("flavor"),
		})),
	);
}
