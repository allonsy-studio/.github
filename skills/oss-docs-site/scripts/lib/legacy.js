// A site made with the previous version of this skill holds copies of what the Norn packages
// now provide. These helpers find the copies & the project files that still point at them.

import { existsSync } from "node:fs";
import path from "node:path";

const INCLUDES = [
	"code-sample",
	"docs-nav",
	"docs-pager",
	"docs-shell",
	"fa-icon",
	"feature-grid",
	"package-index",
	"project-card",
	"site-footer",
	"site-head",
	"site-header",
	"studio-banner",
	"studio-cta",
	"studio-footer",
].map((name) => `_includes/${name}.webc`);

const LAYOUTS = ["base", "docs", "docs-home", "landing", "workspace", "workspaces-home"].map((name) => `_layouts/${name}.webc`);

const STYLES = ["components", "layout", "reset", "studio", "tokens"].map((name) => `content/assets/styles/${name}.css`);

const IMAGES = ["mark", "oss-banner", "oss-footer-dark", "oss-footer-light"].map((name) => `content/assets/img/studio/${name}.svg`);

const FONTS = ["instrument-sans-italic-var", "instrument-sans-var", "pt-mono", "yellowtail"].map((name) => `content/assets/fonts/${name}.woff2`);

/** Site-relative paths the previous scaffold copied into a site. The packages provide all of them now. */
export const LEGACY_FILES = Object.freeze([
	...INCLUDES,
	...LAYOUTS,
	"_data/studio.js",
	"utilities/highlight.js",
	"utilities/icons.js",
	"content/assets/scripts/code-highlight.js",
	"content/assets/scripts/copy-code.js",
	...STYLES,
	...IMAGES,
	...FONTS,
]);

/** Old layout names, by the Norn layout that replaces each. */
const LAYOUT_NAMES = Object.freeze({
	base: "norn-base",
	docs: "norn-docs",
	"docs-home": "norn-docs-home",
	landing: "norn-landing",
	workspace: "norn-workspace",
	"workspaces-home": "norn-workspaces-home",
});

const LAYOUT_PATTERN = /\blayout:\s*(["']?)(base|docs-home|docs|landing|workspaces-home|workspace)\.webc\1/g;

/** Old style tokens, by the Norn token that replaces each. */
const TOKENS = Object.freeze({
	"--accent": "--norn-ui-accent",
	"--font-sans": "--norn-font-body",
	"--font-display": "--norn-font-heading",
});

/** Packages the previous scaffold added that the Norn packages make unnecessary. */
export const LEGACY_DEPENDENCIES = Object.freeze(["@11ty/eleventy-fetch", "@fortawesome/fontawesome-free", "markdown-it", "prismjs"]);

/** What an unmodified file from the previous scaffold contains, by site-relative path. */
const MARKERS = Object.freeze({
	"eleventy.config.js": /utilities\/(highlight|icons)\.js/,
	"_data/site.js": /eleventy-fetch/,
	"_data/workspaces.js": /utilities\/highlight\.js/,
	"cypress.config.js": /styles\/tokens\.css/,
});

/**
 * @param {string} siteDir
 * @returns {string[]} the legacy files present, site-relative
 */
export function findLegacy(siteDir) {
	return LEGACY_FILES.filter((rel) => existsSync(path.join(siteDir, rel)));
}

/**
 * @param {string} rel site-relative path of a file the scaffold writes
 * @param {string} text the file's content
 * @returns {boolean} whether it is the previous scaffold's version
 */
export const isLegacyContent = (rel, text) => MARKERS[rel]?.test(text) ?? false;

/**
 * @param {string} text a page or directory data file
 * @returns {{ from: string, to: string }[]} the old layout names it uses
 */
export function legacyLayouts(text) {
	return [...new Set([...text.matchAll(LAYOUT_PATTERN)].map((match) => match[2]))].map((name) => ({
		from: `${name}.webc`,
		to: `${LAYOUT_NAMES[name]}.webc`,
	}));
}

/**
 * @param {string} text a page or directory data file
 * @returns {string} the text with each old layout name replaced; nothing else changes
 */
export const migrateLayouts = (text) =>
	text.replace(LAYOUT_PATTERN, (_, quote, name) => `layout: ${quote}${LAYOUT_NAMES[name]}.webc${quote}`);

/**
 * @param {string} css the project's stylesheet
 * @returns {{ from: string, to: string }[]} the old tokens it sets
 */
export function legacyTokens(css) {
	return Object.entries(TOKENS)
		.filter(([from]) => new RegExp(`${from}\\s*:`).test(css))
		.map(([from, to]) => ({ from, to }));
}

/**
 * Whether Markdown uses Liquid or Nunjucks tags. The previous config rendered them, even inside code; templating is off now, so they print as text.
 *
 * @param {string} markdown
 * @returns {boolean}
 */
export const hasTemplateTags = (markdown) => /\{%|\{\{/.test(markdown.replace(/^---\n[\s\S]*?\n---\n/, ""));
