#!/usr/bin/env node
/**
 * Install a finished build into an oss-docs-site project: copy the assets to <site>/content/assets/img/
 * & set logo, favicon, faviconIco, appleTouchIcon, & ogImage in <site>/_data/project.json.
 * Only files that exist in the build are copied & set; the spec is saved as <site>/brand.json for later edits.
 * --icons-only leaves an existing logo & Open Graph image alone. --audit then runs the site's build & Cypress audit.
 * Hand-made SVGs (a folder without meta.json) are checked first & refused when they would break as an <img>.
 *
 * --packages installs a family.js build instead: <site>/content/assets/img/packages/<slug>.svg (& <slug>-wordmark.svg),
 * which the Workspaces flavor shows on package cards & page headings. --family saves the family file beside the site.
 *
 * Usage:
 *   node scripts/wire.js <build-dir> --repo <project-root> [--icons-only] [--dry-run] [--audit]
 *   node scripts/wire.js --packages <family-out-dir> --repo <project-root> [--family family.json] [--dry-run] [--audit]
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { assertNoErrors, checkSvg } from "./lib/check.js";
import { isMain, printJson, run } from "./lib/cli.js";
import { discoverWorkspaces } from "./family.js";

/** Build file → project.json field. */
export const FIELDS = {
	"wordmark.svg": "logo",
	"favicon.svg": "favicon",
	"favicon.ico": "faviconIco",
	"apple-touch-icon.png": "appleTouchIcon",
	"og.png": "ogImage",
};

/** Where the spec lives in a project, relative to the site folder; outside `content/`, so it is never published. */
export const BRAND_FILE = "brand.json";
/** Where a package family file lives, beside the spec. */
export const FAMILY_FILE = "brand.packages.json";
/** Package icons, relative to the site's image folder; the Workspaces flavor looks here by slug. */
export const PACKAGES_DIR = "packages";

/**
 * @param {string} from
 * @param {string} to
 * @returns {"added" | "unchanged" | "replaced"}
 */
function copyStatus(from, to) {
	if (!existsSync(to)) return "added";
	return readFileSync(to).equals(readFileSync(from)) ? "unchanged" : "replaced";
}

/**
 * The project's site folder from package.json `oss-docs.site`, else `docs`.
 * @param {string} repo
 * @returns {string}
 */
export function siteDir(repo) {
	const file = path.join(repo, "package.json");
	if (!existsSync(file)) throw new Error(`${repo} has no package.json: pass the project root with --repo.`);
	return JSON.parse(readFileSync(file, "utf8"))["oss-docs"]?.site ?? "docs";
}

/**
 * Plan & (unless dry) apply the copy & project.json edits.
 * @param {string} buildDir
 * @param {string} repo
 * @param {{ dryRun?: boolean, iconsOnly?: boolean }} [options]
 * @returns {{ site: string, copied: { from: string, to: string, status: string }[], fields: Record<string, string>, projectJson: string, spec: string }}
 */
export function wire(buildDir, repo, { dryRun = false, iconsOnly = false } = {}) {
	const site = siteDir(repo);
	const projectJson = path.join(repo, site, "_data", "project.json");
	if (!existsSync(projectJson)) throw new Error(`${projectJson} is missing: scaffold the site with oss-docs-site first.`);
	const imgDir = path.join(repo, site, "content", "assets", "img");
	const skipped = iconsOnly ? ["wordmark.svg", "og.png"] : [];
	const present = Object.keys(FIELDS).filter((name) => !skipped.includes(name) && existsSync(path.join(buildDir, name)));
	const required = iconsOnly ? ["favicon.svg"] : ["wordmark.svg", "favicon.svg"];
	const missing = required.filter((name) => !present.includes(name));
	if (missing.length) throw new Error(`${buildDir} needs ${missing.join(" & ")}: run build.js (& export.js for the rasters) first.`);
	if (!existsSync(path.join(buildDir, "meta.json"))) {
		for (const name of present.filter((n) => n.endsWith(".svg"))) {
			assertNoErrors(name, checkSvg(readFileSync(path.join(buildDir, name), "utf8"), { square: name === "favicon.svg" }));
		}
	}
	const copied = present.map((name) => {
		const from = path.join(buildDir, name);
		const to = path.join(imgDir, name);
		return { from, to, status: copyStatus(from, to) };
	});
	const raw = readFileSync(projectJson, "utf8");
	const project = JSON.parse(raw);
	const fields = {};
	for (const name of present) {
		fields[FIELDS[name]] = name;
		project[FIELDS[name]] = name;
	}
	// Keep the spec beside the site so later color or icon changes rebuild from it.
	const specFile = path.join(buildDir, "spec.json");
	const brandJson = path.join(repo, site, BRAND_FILE);
	let spec = null;
	if (existsSync(specFile)) {
		spec = JSON.parse(readFileSync(specFile, "utf8"));
		spec.font.file = path.relative(path.dirname(brandJson), path.resolve(buildDir, spec.font.file)).split(path.sep).join("/");
	}
	if (!dryRun) {
		mkdirSync(imgDir, { recursive: true });
		for (const { from, to } of copied) copyFileSync(from, to);
		const indent = /^[ \t]+/m.exec(raw)?.[0] ?? "\t";
		writeFileSync(projectJson, JSON.stringify(project, null, indent) + "\n");
		if (spec) writeFileSync(brandJson, JSON.stringify(spec, null, "\t") + "\n");
	}
	return { site, copied, fields, projectJson, spec: spec ? brandJson : "(none: build has no spec.json)" };
}

/**
 * Install a family.js build: one icon (& optional wordmark) per package, found by slug on the site.
 * @param {string} outDir The family.js build folder.
 * @param {string} repo
 * @param {{ dryRun?: boolean, family?: string }} [options]
 * @returns {{ site: string, copied: object[], removed: string[], unmatched: string[], family: string }}
 */
export function wirePackages(outDir, repo, { dryRun = false, family } = {}) {
	const site = siteDir(repo);
	if (!existsSync(path.join(repo, site, "_data", "project.json"))) throw new Error(`${path.join(repo, site)} has no _data/project.json: scaffold the site with oss-docs-site first.`);
	const target = path.join(repo, site, "content", "assets", "img", PACKAGES_DIR);
	const builds = readdirSync(outDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(path.join(outDir, entry.name, "meta.json")))
		.map((entry) => ({ dir: path.join(outDir, entry.name), meta: JSON.parse(readFileSync(path.join(outDir, entry.name, "meta.json"), "utf8")) }))
		.filter(({ meta }) => meta.package);
	if (!builds.length) throw new Error(`${outDir} holds no package builds: run family.js build first.`);
	const slugs = new Set(discoverWorkspaces(repo).map((w) => w.slug));
	const copied = [];
	const removed = [];
	const unmatched = [];
	for (const { dir, meta } of builds) {
		const { slug } = meta.package;
		if (!slugs.has(slug)) unmatched.push(slug);
		const plan = [["favicon.svg", `${slug}.svg`]];
		const wordmark = path.join(target, `${slug}-wordmark.svg`);
		if (existsSync(path.join(dir, "wordmark.svg"))) plan.push(["wordmark.svg", `${slug}-wordmark.svg`]);
		else if (existsSync(wordmark)) removed.push(wordmark);
		for (const [name, dest] of plan) {
			const from = path.join(dir, name);
			const to = path.join(target, dest);
			copied.push({ from, to, status: copyStatus(from, to) });
		}
	}
	let familyOut = "(not saved: pass --family)";
	let familyJson = null;
	if (family) {
		familyJson = JSON.parse(readFileSync(family, "utf8"));
		const brand = path.join(repo, site, BRAND_FILE);
		const base = path.resolve(path.dirname(family), familyJson.base);
		// Point at the site's own brand.json when the base was wired there; otherwise keep the original spec.
		familyJson.base = existsSync(brand) ? BRAND_FILE : path.relative(path.join(repo, site), base).split(path.sep).join("/");
		familyOut = path.join(repo, site, FAMILY_FILE);
	}
	if (!dryRun) {
		mkdirSync(target, { recursive: true });
		for (const { from, to } of copied) copyFileSync(from, to);
		for (const file of removed) rmSync(file);
		if (familyJson) writeFileSync(familyOut, JSON.stringify(familyJson, null, "\t") + "\n");
	}
	return { site, copied, removed, unmatched, family: familyOut };
}

if (isMain(import.meta.url)) {
	run(async () => {
		const { values, positionals } = parseArgs({
			allowPositionals: true,
			options: {
				repo: { type: "string" },
				packages: { type: "string" },
				family: { type: "string" },
				"icons-only": { type: "boolean" },
				"dry-run": { type: "boolean" },
				audit: { type: "boolean" },
			},
		});
		const usage = "Usage: node scripts/wire.js <build-dir> --repo <project-root> [--icons-only] [--dry-run] [--audit]\n       node scripts/wire.js --packages <dir> --repo <project-root> [--family family.json] [--dry-run] [--audit]";
		if (!values.repo || (values.packages ? positionals.length : positionals.length !== 1)) throw new Error(usage);
		const result = values.packages
			? wirePackages(values.packages, values.repo, { dryRun: values["dry-run"], family: values.family })
			: wire(positionals[0], values.repo, { dryRun: values["dry-run"], iconsOnly: values["icons-only"] });
		if (values.audit && !values["dry-run"]) {
			for (const script of ["docs:build", "docs:test"]) {
				try {
					execFileSync("yarn", [script], { cwd: values.repo, stdio: "inherit" });
					result[script] = "passed";
				} catch {
					result[script] = "failed";
					process.exitCode = 1;
					break;
				}
			}
		}
		printJson(result);
	});
}
