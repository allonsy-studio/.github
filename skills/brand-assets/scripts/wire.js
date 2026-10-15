#!/usr/bin/env node
/**
 * Install a finished build into an oss-docs-site project: copy the assets to <site>/content/assets/img/
 * & set logo, favicon, faviconIco, appleTouchIcon, & ogImage in <site>/_data/project.json.
 * Only files that exist in the build are copied & set; the spec is saved as <site>/brand.json for later edits.
 * --icons-only leaves an existing logo & Open Graph image alone. --audit then runs the site's build & Cypress audit.
 *
 * Usage: node scripts/wire.js <build-dir> --repo <project-root> [--icons-only] [--dry-run] [--audit]
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { isMain, printJson, run } from "./lib/cli.js";

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
	const copied = present.map((name) => {
		const from = path.join(buildDir, name);
		const to = path.join(imgDir, name);
		const status = !existsSync(to) ? "added" : readFileSync(to).equals(readFileSync(from)) ? "unchanged" : "replaced";
		return { from, to, status };
	});
	const raw = readFileSync(projectJson, "utf8");
	const project = JSON.parse(raw);
	const fields = {};
	for (const name of present) {
		fields[FIELDS[name]] = name;
		project[FIELDS[name]] = name;
	}
	// Keep the spec beside the site so later colour or icon changes rebuild from it.
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

if (isMain(import.meta.url)) {
	run(async () => {
		const { values, positionals } = parseArgs({
			allowPositionals: true,
			options: { repo: { type: "string" }, "icons-only": { type: "boolean" }, "dry-run": { type: "boolean" }, audit: { type: "boolean" } },
		});
		if (positionals.length !== 1 || !values.repo) throw new Error("Usage: node scripts/wire.js <build-dir> --repo <project-root> [--icons-only] [--dry-run] [--audit]");
		const result = wire(positionals[0], values.repo, { dryRun: values["dry-run"], iconsOnly: values["icons-only"] });
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
