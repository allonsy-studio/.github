import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inflateSync } from "node:zlib";

import { encodeIco, encodePng, readIco, readPngHeader } from "../scripts/lib/png.js";

/** 2×1: one opaque red pixel, one fully transparent pixel. */
const image = { width: 2, height: 1, data: Uint8Array.from([255, 0, 0, 255, 0, 0, 0, 0]) };

/** @param {Buffer} png */
function idat(png) {
	const at = png.indexOf("IDAT");
	return inflateSync(png.subarray(at + 4, at + 4 + png.readUInt32BE(at - 4)));
}

describe("encodePng", () => {
	it("writes RGBA by default", () => {
		const png = encodePng(image);
		assert.deepEqual(readPngHeader(png), { width: 2, height: 1, colorType: 6, alpha: true });
		assert.deepEqual([...idat(png)], [0, 255, 0, 0, 255, 0, 0, 0, 0]);
	});

	it("writes opaque RGB, compositing transparency over white", () => {
		const png = encodePng(image, { alpha: false });
		assert.deepEqual(readPngHeader(png), { width: 2, height: 1, colorType: 2, alpha: false });
		assert.deepEqual([...idat(png)], [0, 255, 0, 0, 255, 255, 255]);
	});

	it("checks the pixel count", () => {
		assert.throws(() => encodePng({ width: 2, height: 2, data: new Uint8Array(4) }), /Expected 16 RGBA bytes/);
	});
});

describe("encodeIco", () => {
	it("packs PNG entries with a correct directory", () => {
		const small = encodePng({ width: 1, height: 1, data: Uint8Array.from([0, 0, 0, 255]) });
		const ico = encodeIco([small, encodePng(image)]);
		assert.deepEqual(readIco(ico), [
			{ width: 1, height: 1, bytes: small.length },
			{ width: 2, height: 1, bytes: encodePng(image).length },
		]);
		assert.equal(ico.readUInt32LE(6 + 12), 6 + 32);
		assert.ok(ico.subarray(6 + 32).subarray(0, 8).equals(small.subarray(0, 8)));
	});
});
