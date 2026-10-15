import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { instance, loadFont } from "../scripts/lib/font.js";
import { loadSpec } from "../scripts/lib/spec.js";
import { buildFavicon, buildWordmark, escapeXml, motionRects } from "../scripts/lib/svg.js";
import { DASHLY, golden } from "./helpers.js";

async function setup(patch) {
	const spec = loadSpec(DASHLY, patch);
	const { font } = instance(await loadFont(spec.font.path), spec.font.axes);
	return { spec, font };
}

describe("buildWordmark", () => {
	it("matches the dashly golden file", async () => {
		const { spec, font } = await setup();
		const { svg } = buildWordmark(spec, font);
		assert.equal(svg, golden("dashly-wordmark.svg", svg));
	});

	it("outlines every letter & loads no font", async () => {
		const { spec, font } = await setup();
		const { svg } = buildWordmark(spec, font);
		assert.doesNotMatch(svg, /<text|@font-face|font-family/);
		assert.equal(svg.match(/<path /g).length, 6);
		assert.match(svg, /<title>dashly<\/title>/);
		assert.match(svg, /role="img"/);
	});

	it("swaps colours inside one file", async () => {
		const { spec, font } = await setup();
		const { svg } = buildWordmark(spec, font);
		assert.match(svg, /\.b-ink\{fill:#16181d\}/);
		assert.match(svg, /@media \(prefers-color-scheme:dark\)\{.*\.b-ink\{fill:#eceef3\}.*\}<\/style>/);
	});

	it("spans one userSpaceOnUse gradient across the letters that share it", async () => {
		const { spec, font } = await setup();
		const { svg } = buildWordmark(spec, font);
		assert.equal(svg.match(/<linearGradient /g).length, 1);
		assert.match(svg, /id="sunrise-text" gradientUnits="userSpaceOnUse"/);
		assert.equal(svg.match(/fill="url\(#sunrise-text\)"/g).length, 2);
	});

	it("skews the letters but not the speed lines", async () => {
		const { spec, font } = await setup();
		const { svg } = buildWordmark(spec, font);
		assert.match(svg, /skewX\(-11\)">(<path )/);
		assert.equal(svg.match(/<rect /g).length, 3);
	});

	it("grows the viewBox to fit decorations & drops motion on request", async () => {
		const plain = buildWordmark(...Object.values(await setup({ motion: null })));
		const withMotion = buildWordmark(...Object.values(await setup()));
		assert.ok(withMotion.width - plain.width > 90);
		const cursor = buildWordmark(
			...Object.values(await setup({ motion: null, decorations: [{ x: 3.2, y: -0.7, width: 0.08, height: 0.8, paint: "hot", layer: "front" }] })),
		);
		assert.ok(cursor.width > plain.width);
		assert.doesNotMatch(plain.svg, /<rect /);
	});
});

describe("motionRects", () => {
	it("right-aligns lines inside the x-height band, longest in the middle", () => {
		const lines = motionRects({ lines: [{ length: 0.56, paint: "a" }, { length: 0.92, paint: "b" }, { length: 0.4, paint: "c" }], thickness: 0.08, gap: 0.08, inset: 0.05 }, 100, 51);
		assert.deepEqual(lines.map((l) => Math.round(l.x + l.width)), [-8, -8, -8]);
		assert.equal(Math.round(lines[0].y), -51);
		assert.equal(Math.round(lines[2].y + lines[2].height), -5);
	});
});

describe("buildFavicon", () => {
	it("draws a rounded gradient tile, a white glyph, & two fading dashes", async () => {
		const { spec, font } = await setup();
		const { svg } = buildFavicon(spec, font);
		assert.equal(svg, golden("dashly-favicon.svg", svg));
		assert.match(svg, /<rect width="64" height="64" rx="14.08" fill="url\(#tile\)"\/>/);
		assert.equal(svg.match(/<rect x=/g).length, 2);
		assert.match(svg, /fill-opacity="0.75"/);
	});

	it("drops the radius for the touch icon", async () => {
		const { spec, font } = await setup();
		assert.match(buildFavicon(spec, font, { square: true }).svg, /<rect width="64" height="64" fill=/);
	});
});

describe("escapeXml", () => {
	it("escapes names", () => {
		assert.equal(escapeXml('a & <b> "c"'), "a &amp; &lt;b&gt; &quot;c&quot;");
	});
});
