import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
	buildFamily,
	discoverWorkspaces,
	distinctWords,
	findClashes,
	glyphCandidates,
	packagePatch,
	proposeFamily,
	tileCandidates,
	validateFamily,
} from "../scripts/family.js";
import { instance, loadFont } from "../scripts/lib/font.js";
import { loadSpec } from "../scripts/lib/spec.js";
import { TILE, buildFavicon } from "../scripts/lib/svg.js";
import { wirePackages } from "../scripts/wire.js";
import { DASHLY, tempDir } from "./helpers.js";

/** A Workspaces repo shaped like agent-skills, scaffolded with a site. */
function workspacesRepo() {
	const repo = tempDir();
	const write = (file, value) => {
		mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
		writeFileSync(path.join(repo, file), typeof value === "string" ? value : JSON.stringify(value));
	};
	write("package.json", { name: "@demo/root", workspaces: ["skills/*", "!skills/private"], "oss-docs": { site: "site" } });
	for (const slug of ["design-system", "dreamlight-valley", "structured-data", "private"]) write(`skills/${slug}/package.json`, { name: `@demo/skill-${slug}` });
	write("site/_data/project.json", "{}\n");
	return repo;
}

describe("discoverWorkspaces", () => {
	it("reads the globs, honours exclusions, & slugs like the site", () => {
		assert.deepEqual(
			discoverWorkspaces(workspacesRepo()).map((w) => w.slug),
			["skill-design-system", "skill-dreamlight-valley", "skill-structured-data"],
		);
	});

	it("says so when there are no workspaces", () => {
		const repo = tempDir();
		writeFileSync(path.join(repo, "package.json"), "{}");
		assert.throws(() => discoverWorkspaces(repo), /No workspaces found/);
	});
});

describe("glyph proposals", () => {
	it("drops a prefix most packages share", () => {
		const words = distinctWords(["skill-design-system", "skill-structured-data", "docs"]);
		assert.deepEqual(words("skill-design-system"), ["design", "system"]);
		assert.deepEqual(words("docs"), ["docs"]);
	});

	it("keeps a shared word when it is the whole name", () => {
		assert.deepEqual(distinctWords(["skill", "skill-a", "skill-b"])("skill"), ["skill"]);
	});

	it("offers first letter, initials, then two letters", () => {
		assert.deepEqual(glyphCandidates(["design", "system"]), ["d", "ds", "de"]);
		assert.deepEqual(glyphCandidates(["docs"]), ["d", "do"]);
	});

	it("keeps glyphs distinct across a family", () => {
		const spec = loadSpec(DASHLY);
		const { packages } = proposeFamily(discoverWorkspaces(workspacesRepo()), spec);
		assert.deepEqual(packages.map((p) => p.glyph), ["d", "dv", "s"]);
	});

	it("never proposes a tile that vanishes in a tab strip", () => {
		const tiles = tileCandidates(loadSpec(DASHLY));
		assert.ok(!tiles.includes("ink"));
		assert.ok(tiles.includes("hot"));
	});
});

describe("family file", () => {
	it("validates slugs & glyph length", () => {
		assert.throws(() => validateFamily({ base: "b.json", packages: [{ slug: "Bad Slug" }] }), /\/packages\/0\/slug/);
		assert.throws(() => validateFamily({ base: "b.json", packages: [{ slug: "a", glyph: "abcd" }] }), /\/packages\/0\/glyph/);
	});

	it("draws only the glyph unless a wordmark is wanted", () => {
		assert.deepEqual(packagePatch({ slug: "skill-x", glyph: "x" }), { name: "skill-x", text: "x", favicon: { align: "baseline", glyph: "x" } });
		assert.equal(packagePatch({ slug: "skill-x", wordmark: true, text: "x-ray" }).text, "x-ray");
	});

	it("finds look-alike icons", () => {
		const clashes = findClashes([
			{ slug: "a", glyph: "S", tileColors: ["#111111"] },
			{ slug: "b", glyph: "s", tileColors: ["#111111"] },
			{ slug: "c", glyph: "s", tileColors: ["#222222"] },
		]);
		assert.deepEqual(clashes, ['a & b share "s" on the same tile.']);
	});
});

describe("buildFamily & wirePackages", () => {
	it("builds icons, a wordmark only where asked, & wires them by slug", async () => {
		const repo = workspacesRepo();
		const work = tempDir();
		const family = path.join(work, "family.json");
		writeFileSync(
			family,
			JSON.stringify({
				base: DASHLY,
				packages: [
					{ slug: "skill-design-system", glyph: "ds", tile: "hot", wordmark: true, text: "dashly" },
					{ slug: "skill-structured-data", glyph: "s" },
					{ slug: "missing-package", glyph: "m" },
				],
			}),
		);
		const out = path.join(work, "out");
		const { packages, clashes } = await buildFamily(family, out);
		assert.deepEqual(clashes, []);
		assert.ok(existsSync(path.join(out, "skill-design-system", "wordmark.svg")));
		assert.ok(!existsSync(path.join(out, "skill-structured-data", "wordmark.svg")));
		assert.deepEqual(packages.map((p) => p.contrastFailures), [[], [], []]);

		const result = wirePackages(out, repo, { family });
		const img = path.join(repo, "site", "content", "assets", "img", "packages");
		assert.ok(existsSync(path.join(img, "skill-design-system.svg")));
		assert.ok(existsSync(path.join(img, "skill-design-system-wordmark.svg")));
		assert.ok(existsSync(path.join(img, "skill-structured-data.svg")));
		assert.deepEqual(result.unmatched, ["missing-package"]);
		const saved = JSON.parse(readFileSync(path.join(repo, "site", "brand.packages.json"), "utf8"));
		assert.ok(!path.isAbsolute(saved.base));

		// Dropping the wordmark removes the stale file on the next wire.
		const next = JSON.parse(readFileSync(family, "utf8"));
		next.packages[0].wordmark = false;
		writeFileSync(family, JSON.stringify(next));
		await buildFamily(family, out);
		assert.deepEqual(wirePackages(out, repo).removed, [path.join(img, "skill-design-system-wordmark.svg")]);
		assert.ok(!existsSync(path.join(img, "skill-design-system-wordmark.svg")));
	});

	it("puts every baseline-aligned icon on one size & one baseline", async () => {
		const work = tempDir();
		const family = path.join(work, "family.json");
		const glyphs = ["a", "d", "g", "i", "s", "ds", "dv"];
		writeFileSync(family, JSON.stringify({ base: DASHLY, packages: glyphs.map((glyph, i) => ({ slug: `p${i}`, glyph, patch: { favicon: { dashes: 0 } } })) }));
		const out = path.join(work, "out");
		const { layout } = await buildFamily(family, out);
		const baselines = glyphs.map((_, i) => {
			const svg = readFileSync(path.join(out, `p${i}`, "favicon.svg"), "utf8");
			return Number(/<g transform="translate\([\d.-]+ ([\d.-]+)\) skewX/.exec(svg)[1]);
		});
		assert.deepEqual(new Set(baselines), new Set([Math.round(layout.baselineY * 100) / 100]));
	});

	it("leaves a package that opts out with align: ink centred on its letter", async () => {
		const work = tempDir();
		const family = path.join(work, "family.json");
		writeFileSync(family, JSON.stringify({ base: DASHLY, packages: [{ slug: "a", glyph: "a" }, { slug: "g", glyph: "g", patch: { favicon: { align: "ink" } } }] }));
		await buildFamily(family, path.join(work, "out"));
		const spec = JSON.parse(readFileSync(path.join(work, "out", "g", "spec.json"), "utf8"));
		assert.equal(spec.favicon.baselineY, undefined);
	});

	it("rejects duplicate slugs", async () => {
		const work = tempDir();
		const family = path.join(work, "family.json");
		writeFileSync(family, JSON.stringify({ base: DASHLY, packages: [{ slug: "a" }, { slug: "a" }] }));
		await assert.rejects(buildFamily(family, path.join(work, "out")), /Duplicate package slug "a"/);
	});
});

describe("favicon fit", () => {
	it("shrinks a three-letter glyph to keep a margin inside the tile", async () => {
		const spec = loadSpec(DASHLY, { favicon: { glyph: "dsh", dashes: 0 } });
		const { font } = instance(await loadFont(spec.font.path), spec.font.axes);
		const { svg } = buildFavicon(spec, font);
		const x = Number(/<g transform="translate\(([\d.-]+) /.exec(svg)[1]);
		assert.ok(x > TILE * 0.08, `left margin ${x}`);
	});
});
