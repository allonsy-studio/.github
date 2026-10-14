#!/usr/bin/env node
// Copy the shared core & one flavor into a project. Safe to re-run: see
// references/site-config.md for how drift, locked edits, & flavor switches are handled.
//
// Usage:
//   node scripts/scaffold.js [--target docs] [--flavor landing] [--accent "#2346d4"]
//                            [--update] [--prune] [--adopt] [--dry-run] [--json]

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
	CORE_DIR,
	FLAVORS,
	flavorFiles,
	OUTPUT_DIR,
	REPO_DEV_DEPENDENCIES,
	SITE_DEV_DEPENDENCIES,
	STUDIO_FILES,
	templateFiles,
	WORKFLOW_TEMPLATE,
} from "./lib/layers.js";
import { writeRecorded } from "./lib/package-config.js";
import { checkProject } from "./lib/project.js";
import { CONFIG_KEY, DEFAULT_SITE, readSiteConfig } from "./lib/settings.js";
import { assertInScope } from "./lib/scope.js";

const CYPRESS_CONFIG = "cypress.config.mjs";

/** `.js` in an ESM package, `.mjs` elsewhere. */
const cypressConfigName = (pkg) => (pkg.type === "module" ? "cypress.config.js" : CYPRESS_CONFIG);

/** Starter accent for a new project.json. */
export const PLACEHOLDER_ACCENT = "#2346d4";

const DEFAULT_FLAVOR = "landing";

const posix = (p) => p.split(path.sep).join("/");

const PLACEHOLDERS = { "{{SETTINGS_KEY}}": CONFIG_KEY, "{{OUTPUT_DIR}}": OUTPUT_DIR };

/** Fill the placeholders a template file names. */
const render = (content) => {
	const text = content.toString();
	return Object.keys(PLACEHOLDERS).some((name) => text.includes(name))
		? Buffer.from(Object.entries(PLACEHOLDERS).reduce((out, [name, value]) => out.replaceAll(name, value), text))
		: content;
};

const hasFiles = (dir) => existsSync(dir) && readdirSync(dir).length > 0;

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
 *   coreDir?: string,
 *   flavors?: readonly string[],
 * }} options targetDir & flavor default to the recorded settings
 * @returns {Promise<{
 *   flavor: string,
 *   site: string,
 *   actions: { path: string, status: string }[],
 *   lockedEdits: string[],
 *   drift: string[],
 *   orphans: string[],
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
	coreDir = CORE_DIR,
	flavors = FLAVORS,
}) {
	const repoRoot = path.resolve(root);
	const packagePath = path.join(repoRoot, "package.json");
	if (!existsSync(packagePath)) {
		throw new Error(
			`No package.json at ${repoRoot}. The site's settings live there, under "${CONFIG_KEY}".`,
		);
	}
	const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
	assertInScope(pkg, packagePath);
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
	const studio = new Set(STUDIO_FILES);
	const actions = [];
	const lockedEdits = [];
	const drift = [];
	const orphans = [];

	// A file matching any flavor's template byte for byte was never edited.
	const templates = new Map();
	for (const name of flavors) {
		for (const f of flavorFiles(name)) {
			templates.set(f.rel, [...(templates.get(f.rel) ?? []), f.source]);
		}
	}
	const unedited = (rel, dest) =>
		(templates.get(rel) ?? []).some((source) => readFileSync(dest).equals(readFileSync(source)));

	const put = (dest, content, { locked = false, rel = "", layer = "core" } = {}) => {
		const shown = posix(path.relative(repoRoot, dest));
		if (!existsSync(dest)) {
			write(dest, content, dryRun);
			actions.push({ path: shown, status: "created" });
			return;
		}
		if (readFileSync(dest).equals(content)) {
			actions.push({ path: shown, status: "unchanged" });
			return;
		}
		if (locked) lockedEdits.push(shown);
		if (update) {
			write(dest, content, dryRun);
			actions.push({ path: shown, status: "updated" });
		} else if (layer === "flavor" && unedited(rel, dest)) {
			write(dest, content, dryRun);
			actions.push({ path: shown, status: "switched (flavor)" });
		} else {
			if (!locked) drift.push(shown);
			actions.push({ path: shown, status: locked ? "locked-file-modified" : "drift" });
		}
	};

	const incoming = templateFiles(flavor, { coreDir });
	for (const { rel, source, layer } of incoming) {
		put(path.join(siteDir, rel === CYPRESS_CONFIG ? cypressConfigName(pkg) : rel), render(readFileSync(source)), {
			locked: studio.has(rel),
			rel,
			layer,
		});
	}

	// Unedited files this flavor does not use.
	const used = new Set(incoming.map((f) => f.rel));
	for (const rel of templates.keys()) {
		const dest = path.join(siteDir, rel);
		if (used.has(rel) || !existsSync(dest) || !unedited(rel, dest)) continue;
		const shown = posix(path.relative(repoRoot, dest));
		if (prune) {
			if (!dryRun) rmSync(dest);
			actions.push({ path: shown, status: "pruned (previous flavor)" });
		} else {
			orphans.push(shown);
			actions.push({ path: shown, status: "orphaned (previous flavor)" });
		}
	}

	const workflow = render(readFileSync(WORKFLOW_TEMPLATE, "utf8")).toString().replaceAll("{{SITE_DIR}}", siteRel);
	put(
		path.join(repoRoot, ".github", "workflows", "pages.yml"),
		Buffer.from(workflow),
	);

	// Project layer: created once, then the maintainer's.
	const projectFile = path.join(siteDir, "src", "_data", "project.json");
	const projectRel = posix(path.relative(repoRoot, projectFile));
	let projectProblems = [];
	if (existsSync(projectFile)) {
		projectProblems = checkProject(projectFile);
		actions.push({ path: projectRel, status: "kept (project layer)" });
	} else {
		const starter = { accent, features: [] };
		write(
			projectFile,
			Buffer.from(JSON.stringify(starter, null, "\t") + "\n"),
			dryRun,
		);
		actions.push({ path: projectRel, status: "created (project layer)" });
	}

	const { changed } = await writeRecorded(packagePath, { site: siteRel, flavor }, { dryRun });
	const packageRel = posix(path.relative(repoRoot, packagePath));
	const moves = [
		recorded?.flavor !== flavor && `flavor ${recorded?.flavor ?? "unset"} → ${flavor}`,
		recorded?.site !== siteRel && `site ${recorded?.site ?? "unset"} → ${siteRel}`,
	].filter(Boolean);
	actions.push({
		path: packageRel,
		status: !changed
			? `kept (${CONFIG_KEY})`
			: recorded === undefined
				? `created (${CONFIG_KEY})`
				: `updated (${moves.join(", ")})`,
	});

	const next = nextSteps({
		siteRel,
		drift,
		orphans,
		projectProblems,
		movedFrom: recorded?.site !== undefined && recorded.site !== siteRel ? recorded.site : undefined,
	});
	return { flavor, site: siteRel, actions, lockedEdits, drift, orphans, next };
}

function nextSteps({ siteRel, drift, orphans, projectProblems, movedFrom }) {
	const eleventy = `${siteRel}/eleventy.config.js`;
	const scripts = {
		"docs:build": `eleventy --config=${eleventy}`,
		"docs:start": `eleventy --serve --config=${eleventy}`,
		// Cypress builds an unprefixed copy & serves it with Eleventy.
		"docs:test": `cypress run --project ${siteRel}`,
	};
	const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
	return [
		drift.length &&
			`Review ${plural(drift.length, "edited file")} that differ from the templates: ${drift.join(", ")}. Merge by hand, or rerun with --update to take the template version.`,
		orphans.length &&
			`${plural(orphans.length, "unused file")} from another flavor: ${orphans.join(", ")}. Rerun with --prune to remove them.`,
		projectProblems.length &&
			`${siteRel}/src/_data/project.json has ${plural(projectProblems.length, "problem")}: ${projectProblems.join(" ")}`,
		movedFrom && `The site moved from ${movedFrom} to ${siteRel}: ${movedFrom} is left as it was.`,
		`Add devDependencies: ${Object.entries({ ...SITE_DEV_DEPENDENCIES, ...REPO_DEV_DEPENDENCIES })
			.map(([name, range]) => `${name}@${range}`)
			.join(", ")}.`,
		`Add scripts: ${JSON.stringify(scripts)}.`,
		`Ignore ${siteRel}/${OUTPUT_DIR}, ${siteRel}/_a11y, and ${siteRel}/cypress/screenshots in .gitignore.`,
		"Commit .nvmrc and yarn.lock: the shared Pages workflow reads the Node version from .nvmrc and installs with --immutable.",
		`Fill ${siteRel}/src/_data/project.json (accent, lede, install, usage, features).`,
		`Add a wordmark: the project supplies its own logo & favicon in ${siteRel}/src/assets/img/ (set \`logo\` & \`favicon\` in project.json). The skill does not make marks.`,
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
		if (result.lockedEdits.length) {
			console.log(
				`\nStudio files differ from the locked originals: ${result.lockedEdits.join(", ")}`,
			);
		}
		console.log(`\nNext:\n${result.next.map((n) => `- ${n}`).join("\n")}`);
	}
	if (result.lockedEdits.length && !values.update) process.exitCode = 1;
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	main().catch((error) => {
		console.error(error.message);
		process.exit(1);
	});
}
