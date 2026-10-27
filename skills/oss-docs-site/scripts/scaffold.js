#!/usr/bin/env node
// Write what a project site owns: the Eleventy config, data, pages, accessibility check, Pages
// workflow, & the package.json wiring. The layouts, components, styles, fonts, & studio layer come
// from the Norn packages. Safe to re-run: see references/site-config.md for how drift, flavor
// switches, & the move from the previous scaffold are handled.
//
// Usage:
//   node scripts/scaffold.js [--target docs] [--flavor landing] [--accent "#2346d4"]
//                            [--update] [--prune] [--adopt] [--dry-run] [--json]

import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { assertSiteFields } from "./lib/fields.js";
import {
	FLAVORS,
	isProjectFile,
	OUTPUT_DIR,
	PROJECT_CSS,
	REPO_DEV_DEPENDENCIES,
	SITE_DEV_DEPENDENCIES,
	templateFiles,
	WORKFLOW_TEMPLATE,
} from "./lib/layers.js";
import { findLegacy, hasTemplateTags, isLegacyContent, LEGACY_DEPENDENCIES, legacyLayouts, legacyTokens, migrateLayouts } from "./lib/legacy.js";
import { writePackage } from "./lib/package-config.js";
import { checkProject } from "./lib/project.js";
import { loadSchema, schemaProblems, SETTINGS_SCHEMA } from "./lib/schemas.js";
import { assertInScope } from "./lib/scope.js";
import { CONFIG_KEY, DEFAULT_SITE, readSiteConfig } from "./lib/settings.js";

const CYPRESS_CONFIG = "cypress.config.js";

/** `.js` in an ESM package, `.mjs` elsewhere. */
const cypressConfigName = (pkg) => (pkg.type === "module" ? CYPRESS_CONFIG : "cypress.config.mjs");

/** Starter accent for a new project.css. */
export const PLACEHOLDER_ACCENT = "#2346d4";

const DEFAULT_FLAVOR = "landing";

/** Components the studio layer owns. A project file with one of these names fails the build. */
const LOCKED_COMPONENTS = new Set(["oss-bar", "oss-cta", "oss-credit"]);

const posix = (p) => p.split(path.sep).join("/");
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Fill a template's `{{NAME}}` placeholders.
 *
 * @param {Buffer | string} content
 * @param {Record<string, string>} values
 * @returns {Buffer}
 */
const render = (content, values) =>
	Buffer.from(content.toString().replace(/\{\{([A-Z_]+)\}\}/g, (match, name) => values[name] ?? match));

const hasFiles = (dir) => existsSync(dir) && readdirSync(dir).length > 0;

/** The `layout:` a page's front matter sets, or undefined. */
const layoutOf = (text) => text.match(/^layout:\s*["']?([^"'\s]+)/m)?.[1];

/** Every file under `dir` whose name matches, as site-relative paths. */
const filesUnder = (dir, pattern) =>
	existsSync(dir)
		? readdirSync(dir, { recursive: true })
			.map((rel) => posix(String(rel)))
			.filter((rel) => pattern.test(rel))
		: [];

/**
 * @param {{
 *   targetDir?: string,
 *   root?: string,
 *   flavor?: string,
 *   accent?: string,
 *   update?: boolean,
 *   prune?: boolean,
 *   adopt?: boolean,
 *   dryRun?: boolean,
 *   sharedDir?: string,
 *   flavors?: readonly string[],
 * }} options targetDir & flavor default to the recorded settings
 * @returns {Promise<{
 *   flavor: string,
 *   site: string,
 *   actions: { path: string, status: string }[],
 *   lockedEdits: string[],
 *   drift: string[],
 *   orphans: string[],
 *   legacy: string[],
 *   review: { path: string, note: string }[],
 *   next: string[],
 * }>}
 */
export async function scaffold({
	targetDir,
	root = process.cwd(),
	flavor: requestedFlavor,
	accent = PLACEHOLDER_ACCENT,
	update = false,
	prune = false,
	adopt = false,
	dryRun = false,
	sharedDir,
	flavors = FLAVORS,
}) {
	const repoRoot = path.resolve(root);
	const packagePath = path.join(repoRoot, "package.json");
	if (!existsSync(packagePath)) {
		throw new Error(`No package.json at ${repoRoot}. The site's settings live there, under "${CONFIG_KEY}".`);
	}
	const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
	assertInScope(pkg, packagePath);
	assertSiteFields(pkg, packagePath);
	const config = readSiteConfig(pkg);
	const configuredSite = typeof config.site === "string" ? config.site : DEFAULT_SITE;
	const recorded = pkg[CONFIG_KEY];

	const flavor = requestedFlavor ?? config.flavor ?? DEFAULT_FLAVOR;
	if (!flavors.includes(flavor)) {
		throw new Error(`Unknown flavor "${flavor}". Choose one of: ${flavors.join(", ")}.`);
	}

	const siteDir = path.resolve(repoRoot, targetDir ?? configuredSite);
	const siteRel = posix(path.relative(repoRoot, siteDir));
	if (!siteRel || siteRel.startsWith("..") || path.isAbsolute(siteRel)) {
		throw new Error(`The site directory must be a folder inside the repository (found "${targetDir ?? configuredSite}").`);
	}

	// Only this skill's own site or an explicit --adopt may share a directory.
	const ownSite = recorded !== undefined && configuredSite === siteRel;
	if (!adopt && !ownSite && hasFiles(siteDir)) {
		throw new Error(
			`${siteRel}/ already has files and was not scaffolded by this skill. Pass --target <new directory> to build beside it, or --adopt to scaffold into it (differing files are kept as drift). See references/scenarios.md.`,
		);
	}

	const dataDir = path.join(siteDir, "_data");
	const values = {
		ACCENT: accent,
		OUTPUT_DIR,
		PACKAGE_NAME: pkg.name,
		PACKAGE_PATH: posix(path.relative(siteDir, packagePath)),
		PACKAGE_PATH_FROM_DATA: posix(path.relative(dataDir, packagePath)),
		ROOT_FROM_DATA: posix(path.relative(dataDir, repoRoot)) || ".",
		SITE_DIR: siteRel,
	};

	const actions = [];
	const lockedEdits = [];
	const drift = [];
	const orphans = [];
	const review = [];
	const shown = (dest) => posix(path.relative(repoRoot, dest));
	const flag = (file, note) => review.push({ path: file, note });

	// A file matching any flavor's template byte for byte was never edited.
	const templates = new Map();
	for (const name of flavors) {
		for (const f of templateFiles(name, { sharedDir })) {
			templates.set(f.rel, [...(templates.get(f.rel) ?? []), render(readFileSync(f.source), values)]);
		}
	}
	const unedited = (rel, dest) => (templates.get(rel) ?? []).some((content) => readFileSync(dest).equals(content));

	/** The files the scaffold owns: drift is tracked, & --update replaces them. */
	const putOwned = (dest, content, { rel = "", layer = "core" } = {}) => {
		const file = shown(dest);
		if (!existsSync(dest)) {
			write(dest, content, dryRun);
			actions.push({ path: file, status: "created" });
		} else if (readFileSync(dest).equals(content)) {
			actions.push({ path: file, status: "unchanged" });
		} else if (update) {
			write(dest, content, dryRun);
			actions.push({ path: file, status: "updated" });
		} else if (layer === "flavor" && unedited(rel, dest)) {
			write(dest, content, dryRun);
			actions.push({ path: file, status: "switched (flavor)" });
		} else {
			drift.push(file);
			actions.push({ path: file, status: "drift" });
			if (isLegacyContent(rel, readFileSync(dest, "utf8"))) {
				flag(file, "Comes from the previous scaffold and no longer works with the Norn packages. Rerun with --update to replace it.");
			}
		}
	};

	/** The project's own files: created once, switched with an unedited flavor, never overwritten. */
	const putProject = (dest, content, { rel = "", layer = "core" } = {}) => {
		const file = shown(dest);
		if (!existsSync(dest)) {
			write(dest, content, dryRun);
			actions.push({ path: file, status: "created" });
		} else if (readFileSync(dest).equals(content)) {
			actions.push({ path: file, status: "unchanged" });
		} else if (rel !== PROJECT_CSS && layer === "flavor" && unedited(rel, dest)) {
			write(dest, content, dryRun);
			actions.push({ path: file, status: "switched (flavor)" });
		} else {
			actions.push({ path: file, status: "kept (project file)" });
		}
	};

	const incoming = templateFiles(flavor, { sharedDir });
	for (const { rel, source, layer } of incoming) {
		const dest = path.join(siteDir, rel === CYPRESS_CONFIG ? cypressConfigName(pkg) : rel);
		const content = render(readFileSync(source), values);
		if (isProjectFile(rel)) {
			putProject(dest, content, { rel, layer });
			const expected = layoutOf(content.toString());
			const found = existsSync(dest) && layoutOf(readFileSync(dest, "utf8"));
			if (expected && found && found !== expected && !legacyLayouts(`layout: ${found}`).length) {
				flag(shown(dest), `Uses the layout ${found}. The ${flavor} flavor uses ${expected}.`);
			}
		} else {
			putOwned(dest, content, { rel, layer });
		}
	}

	// Unedited files this flavor does not use.
	const used = new Set(incoming.map((f) => f.rel));
	for (const rel of templates.keys()) {
		const dest = path.join(siteDir, rel);
		if (used.has(rel) || !existsSync(dest) || !unedited(rel, dest)) continue;
		if (prune) {
			if (!dryRun) rmSync(dest);
			actions.push({ path: shown(dest), status: "pruned (previous flavor)" });
		} else {
			orphans.push(shown(dest));
			actions.push({ path: shown(dest), status: "orphaned (previous flavor)" });
		}
	}

	// Copies the previous scaffold made of what the packages now provide.
	const legacy = findLegacy(siteDir).map((rel) => shown(path.join(siteDir, rel)));
	for (const file of legacy) {
		const dest = path.join(repoRoot, file);
		if (prune) {
			if (!dryRun) {
				rmSync(dest);
				removeEmptyParents(dest, siteDir);
			}
			actions.push({ path: file, status: "pruned (legacy)" });
		} else {
			orphans.push(file);
			actions.push({ path: file, status: "orphaned (legacy)" });
		}
	}

	// Project files that shadow a locked or packaged component fail the build.
	for (const folder of ["_includes", "_layouts"]) {
		for (const rel of filesUnder(path.join(siteDir, folder), /^[^/]+\.webc$/)) {
			const name = rel.replace(/\.webc$/, "");
			const file = shown(path.join(siteDir, folder, rel));
			if (LOCKED_COMPONENTS.has(name)) lockedEdits.push(file);
			else if (/^(norn|oss)-/.test(name) && !legacy.includes(file)) {
				flag(file, "Has the name of a packaged component or layout, so the build fails. Rename it, or turn the packaged one off (see the Norn plugin's exclude & layouts options).");
			}
		}
	}

	// Pages & data that still name the previous layouts, or use template tags the new config turns off.
	const contentDir = path.join(siteDir, "content");
	for (const rel of filesUnder(contentDir, /\.(md|11tydata\.js)$/)) {
		const dest = path.join(contentDir, rel);
		const text = readFileSync(dest, "utf8");
		const file = shown(dest);
		const old = legacyLayouts(text);
		if (actions.some((a) => a.path === file && /^(updated|created|switched)/.test(a.status))) continue;
		if (old.length) {
			const names = old.map(({ from, to }) => `${from} to ${to}`).join(", ");
			if (update) {
				write(dest, Buffer.from(migrateLayouts(text)), dryRun);
				actions.push({ path: file, status: "updated (layout)" });
			} else if (!drift.includes(file)) {
				flag(file, `Names a previous layout: change ${names}, or rerun with --update to change only the layout name.`);
			}
		}
		if (legacy.length && rel.endsWith(".md") && !isOwnedPage(rel) && hasTemplateTags(text)) {
			flag(file, "Uses {% %} or {{ }} tags. The previous config rendered them; templating is off now, so they print as text. Write the value in place.");
		}
	}

	const workflow = render(readFileSync(WORKFLOW_TEMPLATE), values);
	putOwned(path.join(repoRoot, ".github", "workflows", "pages.yml"), workflow);

	// Project layer: created once, then the maintainer's.
	const projectFile = path.join(dataDir, "project.json");
	const projectRel = shown(projectFile);
	let projectProblems = [];
	let schemaFound = true;
	if (existsSync(projectFile)) {
		({ problems: projectProblems, schemaFound } = checkProject(projectFile, repoRoot));
		actions.push({ path: projectRel, status: "kept (project layer)" });
	} else {
		write(projectFile, Buffer.from(JSON.stringify(starterProject(flavor), null, "\t") + "\n"), dryRun);
		actions.push({ path: projectRel, status: "created (project layer)" });
	}

	const cssFile = path.join(siteDir, PROJECT_CSS);
	if (existsSync(cssFile)) {
		const tokens = legacyTokens(readFileSync(cssFile, "utf8"));
		if (tokens.length) {
			flag(shown(cssFile), `Sets previous tokens: ${tokens.map(({ from, to }) => `${from} is now ${to}`).join(", ")}. Rename them.`);
		}
	}

	// Settings: the previous `studio` opt-out is `oss` now.
	const settings = { site: siteRel, flavor };
	const drop = [];
	if (recorded && "studio" in recorded) {
		drop.push("studio");
		if (recorded.studio === false && recorded.oss === undefined) settings.oss = false;
	}
	const wiring = wiringFor(siteRel);
	const changes = await writePackage(
		packagePath,
		{ settings, drop, devDependencies: wiring.devDependencies, scripts: wiring.scripts },
		{ dryRun },
	);
	const moves = [
		recorded?.flavor !== flavor && `flavor ${recorded?.flavor ?? "unset"} → ${flavor}`,
		recorded?.site !== siteRel && `site ${recorded?.site ?? "unset"} → ${siteRel}`,
		drop.length && "studio → oss",
	].filter(Boolean);
	actions.push({
		path: shown(packagePath),
		status: !changes.settings.changed
			? `kept (${CONFIG_KEY})`
			: recorded === undefined
				? `created (${CONFIG_KEY})`
				: `updated (${moves.join(", ")})`,
	});
	if (changes.devDependencies.length || changes.scripts.length) {
		actions.push({
			path: shown(packagePath),
			status: `wired (devDependencies ${changes.devDependencies.length}, scripts ${changes.scripts.length})`,
		});
	}

	// package.json leftovers from the previous scaffold.
	const installed = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
	const leftovers = LEGACY_DEPENDENCIES.filter((name) => installed.includes(name));
	if (leftovers.length) {
		flag(
			shown(packagePath),
			`Lists ${leftovers.join(", ")}, which the previous scaffold added. The Norn packages replace them: remove each the project does not use itself.`,
		);
	}

	const settingsSchema = loadSchema(SETTINGS_SCHEMA, repoRoot);
	const settingsProblems = settingsSchema ? schemaProblems(settingsSchema, changes.settings.after) : [];

	const next = nextSteps({
		update,
		prune,
		dryRun,
		siteRel,
		pkg,
		drift,
		orphans,
		legacy,
		lockedEdits,
		review,
		projectProblems,
		schemaFound,
		settingsProblems,
		changes,
		movedFrom: recorded?.site !== undefined && recorded.site !== siteRel ? recorded.site : undefined,
	});
	return { flavor, site: siteRel, actions, lockedEdits, drift, orphans, legacy, review, next };
}

/** @param {string} rel path under content/ */
const isOwnedPage = (rel) => rel === "workspaces.md";

/** The starter project.json: the schema link, & the fields the flavor reads first. */
function starterProject(flavor) {
	const schema = "https://raw.githubusercontent.com/allonsy-studio/webc-resources/main/packages/webc-patterns/schema/project.schema.json";
	return flavor === "landing" ? { $schema: schema, features: [] } : { $schema: schema };
}

/** What the project's package.json needs to build & check the site. */
function wiringFor(siteRel) {
	const eleventy = `${siteRel}/eleventy.config.js`;
	return {
		devDependencies: SITE_DEV_DEPENDENCIES,
		scripts: {
			"docs:build": `eleventy --config=${eleventy}`,
			"docs:start": `eleventy --serve --config=${eleventy}`,
			// Cypress builds an unprefixed copy & serves it with Eleventy.
			"docs:test": `cypress run --project ${siteRel}`,
		},
	};
}

/** Removes empty folders from a deleted file's folder up to, not including, `stop`. */
function removeEmptyParents(file, stop) {
	for (let dir = path.dirname(file); dir !== stop && dir.startsWith(stop) && existsSync(dir) && readdirSync(dir).length === 0; dir = path.dirname(dir)) {
		rmdirSync(dir);
	}
}

/** The migration step: what the copies were, & which flags finish the move. */
function legacyStep({ legacy, update, prune, dryRun }) {
	const copies = `${plural(legacy.length, "copied file")} (layouts, components, styles, scripts, fonts, studio files) that the Norn packages now provide`;
	if (prune) return `${dryRun ? "Would remove" : "Removed"} ${copies}.`;
	const flags = [update ? "" : "--update", "--prune"].filter(Boolean).join(" ");
	return `Moving from the previous scaffold: ${copies}. The build fails until they are removed, because the old fonts collide with the packaged ones. Rerun with ${flags} to ${update ? "" : "replace the old config & data and "}remove them. Commit first: removed files are only in version control.`;
}

function nextSteps({ update, prune, dryRun, siteRel, pkg, drift, orphans, legacy, lockedEdits, review, projectProblems, schemaFound, settingsProblems, changes, movedFrom }) {
	const previousFlavor = orphans.filter((file) => !legacy.includes(file));
	return [
		legacy.length && legacyStep({ legacy, update, prune, dryRun }),
		lockedEdits.length &&
			`${lockedEdits.join(", ")} has the name of a locked studio component, so the build fails. Delete it, or opt out of the studio layer with "oss": false under \`${CONFIG_KEY}\` in package.json.`,
		drift.length &&
			`Review ${plural(drift.length, "edited file")} that differ from the templates: ${drift.join(", ")}. Merge by hand, or rerun with --update to take the template version.`,
		previousFlavor.length &&
			`${plural(previousFlavor.length, "unused file")} from another flavor: ${previousFlavor.join(", ")}. Rerun with --prune to remove them.`,
		review.length && `Review ${plural(review.length, "file")} the project owns:\n${review.map(({ path: file, note }) => `    ${file}: ${note}`).join("\n")}`,
		projectProblems.length &&
			`${siteRel}/_data/project.json has ${plural(projectProblems.length, "problem")}: ${projectProblems.join(" ")}`,
		!schemaFound && `${siteRel}/_data/project.json was not checked: its schema ships in @allons-y/webc-patterns. Install the packages, then rerun.`,
		settingsProblems.length && `The \`${CONFIG_KEY}\` settings in package.json have ${plural(settingsProblems.length, "problem")}: ${settingsProblems.join(" ")}`,
		movedFrom && `The site moved from ${movedFrom} to ${siteRel}: ${movedFrom} is left as it was.`,
		changes.devDependencies.length &&
			`${dryRun ? "Would add" : "Added"} devDependencies to package.json: ${changes.devDependencies.join(", ")}. Run \`yarn install\`.`,
		changes.scripts.length && `${dryRun ? "Would add" : "Added"} scripts to package.json: ${changes.scripts.join(", ")}.`,
		changes.scriptConflicts.length &&
			`package.json already defines ${changes.scriptConflicts.join(", ")} differently. They are kept: point them at ${siteRel}/eleventy.config.js & \`cypress run --project ${siteRel}\`.`,
		pkg.type !== "module" && "Set \"type\": \"module\" in package.json: the Norn packages & the generated files are ES modules.",
		`Repository tooling every project carries: ${Object.entries(REPO_DEV_DEPENDENCIES)
			.map(([name, range]) => `${name}@${range}`)
			.join(", ")}.`,
		`Ignore ${siteRel}/${OUTPUT_DIR}, ${siteRel}/_a11y, & ${siteRel}/cypress/screenshots in .gitignore.`,
		"Commit .nvmrc (Node 22 or later) and yarn.lock: the shared Pages workflow reads the Node version from .nvmrc and installs with --immutable.",
		`${siteRel}/_data/site.js reads the facts (name, license, links) from package.json at build time. Change them there.`,
		`Fill ${siteRel}/_data/project.json (lede, install, usage, features) & set the accent & fonts in ${siteRel}/content/assets/styles/project.css.`,
		`Add a wordmark: the project needs its own logo & favicon in ${siteRel}/content/assets/img/ (set \`logo\` & \`favicon\` in project.json). The brand-assets skill makes them, & for Workspaces sites one icon per package.`,
		"Check accessibility: yarn docs:test runs Cypress with axe (WCAG 2.2 AA) in light, dark, & forced-colors. Cypress downloads its own browser on install.",
	].filter(Boolean);
}

function write(dest, content, dryRun) {
	if (dryRun) return;
	mkdirSync(path.dirname(dest), { recursive: true });
	writeFileSync(dest, content);
}

async function main() {
	const { values } = parseArgs({
		options: {
			target: { type: "string" },
			flavor: { type: "string" },
			accent: { type: "string" },
			root: { type: "string" },
			update: { type: "boolean", default: false },
			prune: { type: "boolean", default: false },
			adopt: { type: "boolean", default: false },
			"dry-run": { type: "boolean", default: false },
			json: { type: "boolean", default: false },
		},
	});
	const result = await scaffold({
		targetDir: values.target,
		root: values.root,
		flavor: values.flavor,
		accent: values.accent,
		update: values.update,
		prune: values.prune,
		adopt: values.adopt,
		dryRun: values["dry-run"],
	});
	if (values.json) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		for (const { path: p, status } of result.actions) {
			console.log(`${status.padEnd(28)} ${p}`);
		}
		console.log(`\nNext:\n${result.next.map((n) => `- ${n}`).join("\n")}`);
	}
	if (result.lockedEdits.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		console.error(error.message);
		process.exit(1);
	});
}
