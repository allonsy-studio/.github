#!/usr/bin/env node
/**
 * Package icon families for Workspaces projects: one icon per workspace package, built from the project's spec.
 *
 * Usage:
 *   node scripts/family.js init --repo <project-root> --spec <brand.json> [--out family.json]
 *   node scripts/family.js build <family.json> --out <dir>
 *
 * `init` lists the workspaces & proposes a glyph & tile for each, avoiding tiles that vanish in a tab strip
 * & repeats of the same glyph on the same tile. `build` writes <dir>/<slug>/ per package: favicon.svg,
 * icon-square.svg, meta.json, & wordmark.svg only for packages with `"wordmark": true`.
 */

import { existsSync, globSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import Ajv2020 from "ajv/dist/2020.js";

import { TAB_BARS } from "./lib/audit.js";
import { buildToDir } from "./lib/build.js";
import { isMain, printJson, run } from "./lib/cli.js";
import { TARGETS, contrast } from "./lib/color.js";
import { loadSpec, mergePatch, paintColors } from "./lib/spec.js";

const SCHEMA_FILE = fileURLToPath(new URL("../schema/family.schema.json", import.meta.url));
const validator = new Ajv2020({ allErrors: true, strict: false }).compile(JSON.parse(readFileSync(SCHEMA_FILE, "utf8")));

/**
 * @typedef {object} Workspace
 * @property {string} name Package name.
 * @property {string} slug Last segment of the name, as oss-docs-site's Workspaces flavor uses it.
 * @property {string} dir Folder relative to the repository root.
 */

/**
 * Workspaces from the root package.json globs, honouring `!` exclusions, sorted like the site lists them.
 * @param {string} repo
 * @returns {Workspace[]}
 */
export function discoverWorkspaces(repo) {
	const file = path.join(repo, "package.json");
	if (!existsSync(file)) throw new Error(`${repo} has no package.json.`);
	const { workspaces = [] } = JSON.parse(readFileSync(file, "utf8"));
	const patterns = Array.isArray(workspaces) ? workspaces : (workspaces.packages ?? []);
	const manifests = (list) => globSync(list.map((p) => `${p}/package.json`), { cwd: repo, exclude: (name) => name === "node_modules" });
	const excluded = new Set(manifests(patterns.filter((p) => p.startsWith("!")).map((p) => p.slice(1))));
	const found = manifests(patterns.filter((p) => !p.startsWith("!")))
		.filter((manifest) => !excluded.has(manifest))
		.sort()
		.map((manifest) => {
			const { name } = JSON.parse(readFileSync(path.join(repo, manifest), "utf8"));
			if (!name) throw new Error(`${manifest} has no name.`);
			return { name, slug: name.split("/").pop(), dir: path.dirname(manifest) };
		});
	if (!found.length) throw new Error(`No workspaces found from the "workspaces" field in ${file}.`);
	return found;
}

/**
 * Tiles that read in both tab strips & keep the glyph legible: palette names first, then gradients.
 * @param {object} spec A resolved spec.
 * @returns {string[]}
 */
export function tileCandidates(spec) {
	const ink = paintColors(spec, spec.favicon.ink)[0];
	const passes = (value) => {
		const colors = paintColors(spec, value);
		const readsOnBars = Object.values(TAB_BARS).every((bar) => Math.max(...colors.map((c) => contrast(c, bar))) >= TARGETS.graphic);
		const glyphReads = colors.every((c) => contrast(ink, c) >= TARGETS.graphic);
		return readsOnBars && glyphReads;
	};
	const names = Object.entries(spec.palette)
		.filter(([, entry]) => entry.role !== "decorative")
		.map(([name]) => name);
	const gradients = Object.keys(spec.gradients).map((name) => `@${name}`);
	return [...names, ...gradients].filter(passes);
}

/**
 * The words of a slug that tell packages apart: a leading word most packages share (such as `skill-`) is dropped.
 * @param {string[]} slugs
 * @returns {(slug: string) => string[]}
 */
export function distinctWords(slugs) {
	const words = (slug) => slug.split(/[-_.]+/).filter(Boolean);
	const counts = new Map();
	for (const slug of slugs) {
		const [first] = words(slug);
		counts.set(first, (counts.get(first) ?? 0) + 1);
	}
	// A prefix counts as shared when more than half the packages start with it.
	const shared = new Set([...counts].filter(([, n]) => n > slugs.length / 2 && n > 1).map(([word]) => word));
	return (slug) => {
		const all = words(slug);
		return all.length > 1 && shared.has(all[0]) ? all.slice(1) : all;
	};
}

/**
 * Glyph candidates for a package, best first: first letter, word initials, first two letters.
 * @param {string[]} words
 * @returns {string[]}
 */
export function glyphCandidates(words) {
	const core = words.join("");
	const initials = words.slice(0, 2).map((w) => w[0]).join("");
	return [...new Set([core[0], initials, core.slice(0, 2)].filter(Boolean).map((g) => g.toLowerCase()))];
}

/**
 * Propose a glyph & tile per workspace. Distinct glyphs come first, because a tile colour alone is a weak
 * signal (& none for some colour vision); tiles cycle, & a repeated glyph moves to an unused tile.
 * @param {Workspace[]} workspaces
 * @param {object} spec A resolved spec.
 * @returns {{ packages: { slug: string, name: string, glyph: string, tile: string }[], warnings: string[] }}
 */
export function proposeFamily(workspaces, spec) {
	const warnings = [];
	let tiles = tileCandidates(spec);
	if (!tiles.length) {
		tiles = [spec.favicon.tile];
		warnings.push(`No palette entry or gradient reads in both tab strips with a ${spec.favicon.ink} glyph: every package uses ${spec.favicon.tile}. Add a mid-tone palette colour for variety.`);
	}
	const wordsOf = distinctWords(workspaces.map((w) => w.slug));
	const glyphs = new Set();
	const pairs = new Set();
	const packages = workspaces.map((workspace, i) => {
		const candidates = glyphCandidates(wordsOf(workspace.slug));
		const glyph = candidates.find((g) => !glyphs.has(g)) ?? candidates[0];
		let tile = tiles[i % tiles.length];
		for (let step = 1; step <= tiles.length && pairs.has(`${glyph}|${tile}`); step++) tile = tiles[(i + step) % tiles.length];
		if (pairs.has(`${glyph}|${tile}`)) warnings.push(`${workspace.slug}: "${glyph}" on ${tile} repeats another package; set its glyph by hand.`);
		glyphs.add(glyph);
		pairs.add(`${glyph}|${tile}`);
		return { slug: workspace.slug, name: workspace.name, glyph, tile };
	});
	return { packages, warnings };
}

/**
 * Validate a family object.
 * @param {object} family
 */
export function validateFamily(family) {
	if (validator(family)) return;
	throw new Error(`Family file is invalid:\n${validator.errors.map((e) => `  ${e.instancePath || "(root)"} ${e.message}`).join("\n")}`);
}

/**
 * Patch for one package: its name, glyph, & tile over the base spec, then its own patch.
 * @param {object} pkg A family entry.
 * @returns {object}
 */
export function packagePatch(pkg) {
	const favicon = {};
	if (pkg.glyph) favicon.glyph = pkg.glyph;
	if (pkg.tile) favicon.tile = pkg.tile;
	// Without a wordmark the letters drawn are only the glyph, so a name with characters the font lacks still builds.
	const text = pkg.wordmark ? (pkg.text ?? pkg.slug) : (pkg.glyph ?? pkg.slug.match(/[a-z0-9]/i)?.[0] ?? pkg.slug[0]);
	return mergePatch({ name: pkg.name ?? pkg.slug, text, favicon }, pkg.patch ?? {});
}

/**
 * Pairs of packages whose icons would look the same.
 * @param {object[]} built Each { slug, glyph, tileColors }.
 * @returns {string[]}
 */
export function findClashes(built) {
	const seen = new Map();
	const clashes = [];
	for (const item of built) {
		const key = `${item.glyph.toLowerCase()}|${item.tileColors.join(",")}`;
		if (seen.has(key)) clashes.push(`${seen.get(key)} & ${item.slug} share "${item.glyph}" on the same tile.`);
		else seen.set(key, item.slug);
	}
	return clashes;
}

/**
 * Build every package in a family file.
 * @param {string} familyFile
 * @param {string} outDir
 * @returns {Promise<{ packages: object[], clashes: string[] }>}
 */
export async function buildFamily(familyFile, outDir) {
	const family = JSON.parse(readFileSync(familyFile, "utf8"));
	validateFamily(family);
	const base = path.resolve(path.dirname(familyFile), family.base);
	const slugs = new Set();
	for (const pkg of family.packages) {
		if (slugs.has(pkg.slug)) throw new Error(`Duplicate package slug "${pkg.slug}".`);
		slugs.add(pkg.slug);
	}

	const packages = [];
	for (const pkg of family.packages) {
		const patch = packagePatch(pkg);
		const meta = await buildToDir(base, path.join(outDir, pkg.slug), {
			patch,
			skip: pkg.wordmark ? [] : ["wordmark.svg"],
			extra: { package: { slug: pkg.slug, name: pkg.name ?? pkg.slug, wordmark: Boolean(pkg.wordmark) } },
		});
		const spec = loadSpec(base, patch);
		packages.push({
			slug: pkg.slug,
			dir: meta.dir,
			glyph: spec.favicon.glyph,
			tile: spec.favicon.tile,
			tileColors: paintColors(spec, spec.favicon.tile),
			wordmark: Boolean(pkg.wordmark),
			contrastFailures: meta.contrast.failures.filter((f) => f.startsWith("favicon") || pkg.wordmark),
		});
	}
	return { packages, clashes: findClashes(packages) };
}

if (isMain(import.meta.url)) {
	run(async () => {
		const { values, positionals } = parseArgs({
			allowPositionals: true,
			options: { repo: { type: "string" }, spec: { type: "string" }, out: { type: "string" } },
		});
		const [command, file] = positionals;
		if (command === "init") {
			if (!values.repo || !values.spec) throw new Error("Usage: node scripts/family.js init --repo <project-root> --spec <brand.json> [--out family.json]");
			const out = values.out ?? "family.json";
			const { packages, warnings } = proposeFamily(discoverWorkspaces(values.repo), loadSpec(values.spec));
			const base = path.relative(path.dirname(path.resolve(out)), path.resolve(values.spec)).split(path.sep).join("/");
			writeFileSync(out, JSON.stringify({ base, packages }, null, "\t") + "\n");
			return printJson({ file: out, packages: packages.length, warnings });
		}
		if (command === "build") {
			if (!file || !values.out) throw new Error("Usage: node scripts/family.js build <family.json> --out <dir>");
			return printJson(await buildFamily(file, values.out));
		}
		throw new Error("Usage: node scripts/family.js init … | build …");
	});
}
