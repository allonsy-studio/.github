import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { contrastRows, deepenPatch } from "../scripts/lib/audit.js";
import { loadSpec, mergePatch, paintColors, paintsFor, resolveSpec } from "../scripts/lib/spec.js";
import { DASHLY, HERE } from "./helpers.js";

const minimal = () => ({ name: "demo", font: { file: "x.woff2" }, palette: { ink: { light: "#111111" } } });

describe("resolveSpec", () => {
	it("fills defaults & the first palette entry as the letter paint", () => {
		const spec = resolveSpec(minimal(), HERE);
		assert.equal(spec.text, "demo");
		assert.equal(spec.size, 100);
		assert.equal(spec.paint["*"], "ink");
		assert.equal(spec.palette.ink.dark, "#111111");
		assert.equal(spec.favicon.glyph, "d");
		assert.equal(spec.favicon.tile, "ink");
		assert.deepEqual(spec.surfaces, { light: "#ffffff", dark: "#101216" });
	});

	it("lists every schema problem at once", () => {
		assert.throws(
			() => resolveSpec({ name: "", font: {}, palette: {}, skew: 90 }, HERE),
			(error) => /\/name/.test(error.message) && /\/font/.test(error.message) && /\/skew/.test(error.message),
		);
	});

	it("rejects unknown paints & gradients", () => {
		assert.throws(() => resolveSpec({ ...minimal(), paint: { "*": "nope" } }, HERE), /paint\.\*: "nope" is not a palette name/);
		assert.throws(() => resolveSpec({ ...minimal(), paint: { "*": "@nope" } }, HERE), /no gradient named "nope"/);
		assert.throws(
			() => resolveSpec({ ...minimal(), gradients: { g: { stops: ["ink", "@g"] } } }, HERE),
			/gradients are not allowed here/,
		);
	});

	it("loads the dashly fixture", () => {
		const spec = loadSpec(DASHLY);
		assert.equal(spec.motion.thickness, 0.08);
		assert.ok(spec.font.path.endsWith("instrument-sans-var.woff2"));
	});
});

describe("paintsFor", () => {
	it("applies *, ranges, then single indexes", () => {
		assert.deepEqual(paintsFor({ "*": "a", "1-3": "b", 2: "c" }, 5), ["a", "b", "c", "b", "a"]);
	});

	it("ignores indexes past the text", () => {
		assert.deepEqual(paintsFor({ "*": "a", "3-9": "b" }, 4), ["a", "a", "a", "b"]);
	});
});

describe("mergePatch", () => {
	it("merges objects, replaces arrays, & deletes on null", () => {
		const base = { a: { b: 1, c: 2 }, list: [1, 2], gone: true };
		assert.deepEqual(mergePatch(base, { a: { c: 3 }, list: [9], gone: null }), { a: { b: 1, c: 3 }, list: [9] });
		assert.deepEqual(base.a, { b: 1, c: 2 }, "does not mutate the base");
	});
});

describe("paintColors", () => {
	it("expands gradients into their stops per scheme", () => {
		const spec = loadSpec(DASHLY);
		assert.deepEqual(paintColors(spec, "@sunrise"), ["#d22d6f", "#e8700f"]);
		assert.deepEqual(paintColors(spec, "@sunrise", "dark"), ["#ff7aa8", "#ff944d"]);
		assert.deepEqual(paintColors(spec, "white"), ["#ffffff"]);
	});
});

describe("audit", () => {
	it("passes dashly & reports its yellow line as decorative", () => {
		const rows = contrastRows(loadSpec(DASHLY));
		assert.equal(rows.filter((r) => r.status === "fail").length, 0);
		assert.deepEqual(
			rows.filter((r) => r.status === "note").map((r) => `${r.subject} ${r.scheme}`),
			["palette.y light", "palette.y dark"],
		);
	});

	it("fails an ink tile that vanishes in a dark tab strip", () => {
		const rows = contrastRows(loadSpec(DASHLY, { favicon: { tile: "ink" } }));
		const failing = rows.filter((r) => r.status === "fail").map((r) => `${r.subject} ${r.scheme}`);
		assert.deepEqual(failing, ["favicon.tile on tab bar dark"]);
	});

	it("deepens a raw brand orange used as text, light value only", () => {
		const spec = loadSpec(DASHLY, { palette: { hot: { light: "#ff944d", dark: "#ff944d" } } });
		const { patch, changes } = deepenPatch(spec);
		assert.equal(changes.length, 1);
		assert.equal(changes[0].scheme, "light");
		assert.equal(patch.palette.hot.dark, "#ff944d");
		const fixed = loadSpec(DASHLY, mergePatch({ palette: { hot: { light: "#ff944d", dark: "#ff944d" } } }, patch));
		assert.equal(contrastRows(fixed).filter((r) => r.status === "fail").length, 0);
	});
});
