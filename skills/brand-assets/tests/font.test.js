import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { inspectFonts } from "../scripts/fonts.js";
import { assertAllowed, describeFont, instance, loadFont, outline } from "../scripts/lib/font.js";
import { FONTS, SANS, golden } from "./helpers.js";

describe("loadFont & describeFont", () => {
	it("reports the studio sans axes from a WOFF2 subset", async () => {
		const info = describeFont(await loadFont(SANS));
		assert.equal(info.family, "Instrument Sans");
		assert.deepEqual(Object.keys(info.axes), ["wght"]);
		assert.equal(info.axes.wght.min, 400);
		assert.equal(info.axes.wght.max, 700);
		assert.equal(info.forbidden, false);
	});

	it("flags Yellowtail & refuses it for a wordmark", async () => {
		const font = await loadFont(path.join(FONTS, "yellowtail.woff2"));
		assert.equal(describeFont(font).forbidden, true);
		assert.throws(() => assertAllowed(font), /reserved for signatures/);
	});

	it("names the missing file", async () => {
		await assert.rejects(loadFont("nope.woff2"), /Font not found: nope\.woff2/);
	});

	it("lists every font in a folder", async () => {
		const infos = await inspectFonts([FONTS]);
		assert.deepEqual(new Set(infos.map((i) => i.family)), new Set(["Instrument Sans", "PT Mono", "Yellowtail"]));
	});
});

describe("instance", () => {
	it("ignores axes the font lacks instead of failing (the wdth error)", async () => {
		const { applied, ignored } = instance(await loadFont(SANS), { wght: 700, wdth: 90 });
		assert.deepEqual(applied, { wght: 700 });
		assert.deepEqual(ignored, ["wdth"]);
	});

	it("clamps out-of-range values & says so", async () => {
		const { applied, clamped } = instance(await loadFont(SANS), { wght: 900 });
		assert.deepEqual(applied, { wght: 700 });
		assert.deepEqual(clamped, ["wght: 900 → 700"]);
	});

	it("returns static fonts unchanged", async () => {
		const font = await loadFont(path.join(FONTS, "pt-mono.woff2"));
		assert.equal(instance(font, {}).font, font);
	});
});

describe("outline", () => {
	it("matches the dashly favicon 'd' at 46 px, weight 700", async () => {
		const { font } = instance(await loadFont(SANS), { wght: 700 });
		const [glyph] = outline(font, "d", { size: 46 }).glyphs;
		assert.ok(glyph.d.startsWith("M19.37 0L19.37 -5.2"), glyph.d.slice(0, 40));
	});

	it("lays out dashly with the font's own advances", async () => {
		const { font } = instance(await loadFont(SANS), { wght: 700 });
		const { glyphs, advance, metrics } = outline(font, "dashly", { size: 100 });
		assert.deepEqual(glyphs.map((g) => g.char), [..."dashly"]);
		assert.equal(Math.round(advance * 10) / 10, 312.1);
		assert.equal(metrics.xHeight, 51);
		const d = glyphs.map((g) => g.d).join("\n");
		assert.equal(d, golden("dashly-outline.txt", d));
	});

	it("adds tracking between letters only", async () => {
		const font = await loadFont(SANS);
		const plain = outline(font, "ab", { size: 100 });
		const tracked = outline(font, "ab", { size: 100, tracking: 0.1 });
		assert.equal(Math.round(tracked.advance - plain.advance), 10);
	});

	it("fails on a letter the subset lacks", async () => {
		const font = await loadFont(SANS);
		assert.throws(() => outline(font, "日", { size: 100 }), /no glyph for "日"/);
	});
});
