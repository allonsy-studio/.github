import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, describe, it } from "node:test";

import { exportBuild, leftInk, ogWordmarkSize } from "../scripts/export.js";
import { browserAvailable, rasterize, withBrowser } from "../scripts/lib/browser.js";
import { BUILD_FILES, buildToDir } from "../scripts/lib/build.js";
import { readIco, readPngHeader } from "../scripts/lib/png.js";
import { findBuilds, renderSheet, sheetHtml } from "../scripts/sheet.js";
import { accentVariants, buildVariants } from "../scripts/variants.js";
import { wire } from "../scripts/wire.js";
import { DASHLY, golden, tempDir } from "./helpers.js";

describe("build & variants", () => {
	it("writes every file & confirms them", async () => {
		const dir = path.join(tempDir(), "dashly");
		const meta = await buildToDir(DASHLY, dir);
		for (const name of [...BUILD_FILES, "meta.json"]) assert.ok(existsSync(path.join(dir, name)), name);
		assert.deepEqual(meta.contrast.failures, []);
		const spec = JSON.parse(readFileSync(path.join(dir, "spec.json"), "utf8"));
		assert.ok(path.isAbsolute(spec.font.file));
		assert.equal(spec.$schema, undefined);
	});

	it("builds accent variants & deepens failing light values", async () => {
		const out = tempDir();
		const results = await buildVariants(DASHLY, accentVariants("hot", ["#ff944d", "#d22d6f"]), out, { deepen: true });
		assert.deepEqual(results.map((r) => r.id), ["hot-ff944d", "hot-d22d6f"]);
		assert.equal(results[0].deepened.length, 1);
		assert.deepEqual(results[0].contrastFailures, []);
		assert.deepEqual(
			results[1].deepened.map((c) => c.scheme),
			["dark"],
			"magenta passes on white but is lightened for the dark surface",
		);
		assert.equal(findBuilds(out).length, 2);
	});

	it("rejects bad variant ids", async () => {
		await assert.rejects(buildVariants(DASHLY, [{ id: "Bad Id", patch: {} }], tempDir()), /must be lowercase/);
	});
});

describe("ogWordmarkSize", () => {
	it("fits the wordmark to 180 px tall, or 800 px wide when it is long", () => {
		assert.deepEqual(ogWordmarkSize('<svg viewBox="0 0 456 129">'), { width: 636, height: 180 });
		assert.deepEqual(ogWordmarkSize('<svg viewBox="0 0 1000 100">'), { width: 800, height: 80 });
	});
});

describe("sheetHtml", () => {
	it("matches the golden layout for a stub build", () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>';
		const html = sheetHtml([{ label: "a", note: "Stub & co", failures: ["palette.x (light)"], wordmark: svg, favicon: svg, square: svg }], {
			header: 32,
			title: "Sheet",
			rasters: new Map([["a", { light16: "data:16", light32: "data:32" }]]),
		});
		assert.equal(html, golden("sheet.html", html));
		assert.doesNotMatch(html, /<h2>Together<\/h2>/, "one build needs no side-by-side strip");
	});

	it("adds a side-by-side strip for families", () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>';
		const build = (label) => ({ label, note: "", failures: [], wordmark: null, favicon: svg, square: null });
		const html = sheetHtml([build("a"), build("b")], { header: 32, title: "Family", rasters: new Map() });
		assert.match(html, /<h2>Together<\/h2>/);
		assert.equal(html.match(/class="strip"/g).length, 2);
	});
});

describe("wire", () => {
	/** @returns {string} A scaffolded-looking project. */
	function project() {
		const repo = tempDir();
		writeFileSync(path.join(repo, "package.json"), JSON.stringify({ name: "demo", "oss-docs": { site: "site" } }));
		mkdirSync(path.join(repo, "site", "_data"), { recursive: true });
		writeFileSync(path.join(repo, "site", "_data", "project.json"), '{\n\t"tagline": "Demo",\n\t"logo": "old.svg"\n}\n');
		return repo;
	}

	it("plans without writing on a dry run", async () => {
		const build = path.join(tempDir(), "b");
		await buildToDir(DASHLY, build);
		const repo = project();
		const result = wire(build, repo, { dryRun: true });
		assert.deepEqual(result.fields, { logo: "wordmark.svg", favicon: "favicon.svg" });
		assert.equal(existsSync(path.join(repo, "site", "content")), false);
		assert.match(readFileSync(path.join(repo, "site", "_data", "project.json"), "utf8"), /old\.svg/);
	});

	it("copies files, sets fields with the file's indent, & keeps the spec beside the site", async () => {
		const build = path.join(tempDir(), "b");
		await buildToDir(DASHLY, build);
		const repo = project();
		wire(build, repo);
		const json = readFileSync(path.join(repo, "site", "_data", "project.json"), "utf8");
		assert.match(json, /\n\t"logo": "wordmark.svg"/);
		assert.ok(existsSync(path.join(repo, "site", "content", "assets", "img", "favicon.svg")));
		const brand = JSON.parse(readFileSync(path.join(repo, "site", "brand.json"), "utf8"));
		assert.ok(!path.isAbsolute(brand.font.file));
	});

	it("leaves the logo alone in icons-only mode", async () => {
		const build = path.join(tempDir(), "b");
		await buildToDir(DASHLY, build);
		const repo = project();
		const result = wire(build, repo, { iconsOnly: true });
		assert.equal(result.fields.logo, undefined);
		assert.match(readFileSync(path.join(repo, "site", "_data", "project.json"), "utf8"), /"logo": "old\.svg"/);
	});

	it("refuses an unscaffolded project", async () => {
		const repo = tempDir();
		writeFileSync(path.join(repo, "package.json"), "{}");
		assert.throws(() => wire(tempDir(), repo), /scaffold the site with oss-docs-site first/);
	});
});

describe("browser steps", () => {
	let available = false;
	before(async () => {
		available = await browserAvailable();
	});

	it("rasterizes the wordmark with the scheme's colors", async (t) => {
		if (!available) return t.skip("Chromium unavailable");
		const build = path.join(tempDir(), "b");
		await buildToDir(DASHLY, build);
		const svg = readFileSync(path.join(build, "wordmark.svg"), "utf8");
		const pixels = await withBrowser(async (browser) => ({
			light: await rasterize(browser, svg, { width: 456, height: 129, scheme: "light" }),
			dark: await rasterize(browser, svg, { width: 456, height: 129, scheme: "dark" }),
		}));
		/** Darkest opaque pixel: a letter stroke. */
		const ink = ({ data }) => {
			let best = 765;
			for (let i = 0; i < data.length; i += 4) if (data[i + 3] === 255) best = Math.min(best, data[i] + data[i + 1] + data[i + 2]);
			return best;
		};
		assert.ok(ink(pixels.light) < 100, "light scheme draws near-black letters");
		assert.ok(ink(pixels.dark) > 300, "dark scheme has no near-black letters");
	});

	it("exports an opaque touch icon, a three-size .ico, & an Open Graph image", async (t) => {
		if (!available) return t.skip("Chromium unavailable");
		const build = path.join(tempDir(), "b");
		await buildToDir(DASHLY, build);
		const { source, files, warnings } = await exportBuild(build, { og: true });
		assert.equal(source, "build");
		assert.deepEqual(warnings, []);
		assert.deepEqual(files.map((r) => r.file), ["apple-touch-icon.png", "favicon.ico", "og.png"]);
		assert.deepEqual(readPngHeader(readFileSync(path.join(build, "apple-touch-icon.png"))), { width: 180, height: 180, colorType: 2, alpha: false });
		assert.deepEqual(readIco(readFileSync(path.join(build, "favicon.ico"))).map((e) => e.width), [16, 32, 48]);
		const og = readPngHeader(readFileSync(path.join(build, "og.png")));
		assert.equal(og.width, 1200);
		assert.equal(og.height, 630);
	});

	it("exports hand-made SVGs, asking for a background for transparent corners", async (t) => {
		if (!available) return t.skip("Chromium unavailable");
		const built = path.join(tempDir(), "b");
		await buildToDir(DASHLY, built);
		const hand = tempDir();
		for (const name of ["wordmark.svg", "favicon.svg"]) copyFileSync(path.join(built, name), path.join(hand, name));
		await assert.rejects(exportBuild(hand, { og: true }), /transparent pixels.*--background/s);
		const { source, files } = await exportBuild(hand, { og: true, background: "#d22d6f", accent: "#d22d6f", name: "dashly" });
		assert.equal(source, "hand-made");
		assert.deepEqual(files.map((r) => r.file), ["apple-touch-icon.png", "favicon.ico", "og.png"]);
		assert.equal(readPngHeader(readFileSync(path.join(hand, "apple-touch-icon.png"))).alpha, false);
	});

	it("refuses a hand-made wordmark that relies on a font", async (t) => {
		if (!available) return t.skip("Chromium unavailable");
		const hand = tempDir();
		writeFileSync(path.join(hand, "favicon.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><title>x</title><rect width="8" height="8"/></svg>');
		writeFileSync(path.join(hand, "wordmark.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 20"><text>x</text></svg>');
		await assert.rejects(exportBuild(hand, { og: true }), /wordmark\.svg cannot ship as an <img>:\n.*<text>/);
	});

	it("measures where the wordmark's ink starts", async (t) => {
		if (!available) return t.skip("Chromium unavailable");
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20" width="100" height="20"><rect x="30" width="40" height="20"/></svg>';
		const pixels = await withBrowser((browser) => rasterize(browser, svg, { width: 100, height: 20 }));
		assert.equal(leftInk(pixels), 30);
	});

	it("renders light, dark, & forced-colors sheets", async (t) => {
		if (!available) return t.skip("Chromium unavailable");
		const out = tempDir();
		await buildToDir(DASHLY, path.join(out, "a"));
		const result = await renderSheet(out, { forcedColors: true });
		assert.deepEqual(result.images.map((f) => path.basename(f)), ["sheet-light.png", "sheet-dark.png", "sheet-forced.png"]);
		for (const file of result.images) assert.ok(readPngHeader(readFileSync(file)).width >= 1000);
	});
});
