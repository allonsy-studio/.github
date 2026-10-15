import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { contrast, deepen, formatRatio, normalize, parseColor, toOklch } from "../scripts/lib/color.js";

describe("contrast", () => {
	it("matches the ratios measured for the dashly mark", () => {
		const round = (a, b) => contrast(a, b).toFixed(2);
		assert.equal(round("#ff944d", "#ffffff"), "2.19");
		assert.equal(round("#1f91ad", "#ffffff"), "3.68");
		assert.equal(round("#ffd36b", "#ffffff"), "1.42");
		assert.equal(round("#d22d6f", "#ffffff"), "4.83");
	});

	it("confirms the deepened brand values pass on white", () => {
		assert.ok(contrast("#c4510a", "#ffffff") >= 4.5);
		assert.ok(contrast("#177a93", "#ffffff") >= 4.5);
	});

	it("never rounds a ratio up for display", () => {
		assert.equal(formatRatio(contrast("#ff944d", "#ffffff")), "2.18:1");
		assert.equal(formatRatio(4.4999), "4.49:1");
	});

	it("is symmetric", () => {
		assert.equal(contrast("#000", "#fff"), contrast("#fff", "#000"));
		assert.equal(contrast("#000", "#fff"), 21);
	});
});

describe("parseColor", () => {
	it("accepts hex, short hex, rgb(), & names", () => {
		assert.deepEqual(parseColor("#f80"), { r: 255, g: 136, b: 0 });
		assert.deepEqual(parseColor("rgb(1 2 3)"), { r: 1, g: 2, b: 3 });
		assert.equal(normalize("White"), "#ffffff");
	});

	it("rejects anything else with the accepted forms", () => {
		assert.throws(() => parseColor("hsl(0 0% 0%)"), /#rrggbb/);
	});
});

describe("deepen", () => {
	it("darkens a failing colour on white until it passes, keeping its hue", () => {
		const result = deepen("#ff944d", "#ffffff", 4.5);
		assert.ok(result.changed && result.reached);
		assert.ok(result.ratio >= 4.5);
		assert.ok(result.ratio < 4.7, `stays near the target, got ${result.ratio}`);
		assert.ok(Math.abs(toOklch(result.hex).h - toOklch("#ff944d").h) < 4);
	});

	it("lightens a failing colour on a dark surface", () => {
		const result = deepen("#5a1030", "#101216", 4.5);
		assert.ok(result.reached);
		assert.ok(toOklch(result.hex).l > toOklch("#5a1030").l);
	});

	it("leaves passing colours alone", () => {
		assert.deepEqual(deepen("#d22d6f", "#ffffff", 4.5), { hex: "#d22d6f", ratio: contrast("#d22d6f", "#ffffff"), changed: false, reached: true });
	});
});
