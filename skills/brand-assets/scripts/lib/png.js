/**
 * Minimal PNG & ICO encoders, so opaque RGB output needs no image library.
 * @module png
 */

import { crc32, deflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * @param {string} type
 * @param {Buffer} data
 * @returns {Buffer}
 */
function chunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body) >>> 0);
	return Buffer.concat([length, body, crc]);
}

/**
 * Encode RGBA pixels as a PNG.
 * @param {{ width: number, height: number, data: Uint8Array | number[] }} image Straight (unpremultiplied) RGBA, row-major.
 * @param {{ alpha?: boolean, background?: { r: number, g: number, b: number } }} [options]
 *   `alpha: false` writes RGB (colour type 2), compositing any transparency over `background` (white by default).
 * @returns {Buffer}
 */
export function encodePng({ width, height, data }, { alpha = true, background = { r: 255, g: 255, b: 255 } } = {}) {
	if (data.length !== width * height * 4) throw new Error(`Expected ${width * height * 4} RGBA bytes, found ${data.length}.`);
	const channels = alpha ? 4 : 3;
	const stride = width * channels + 1;
	const raw = Buffer.alloc(stride * height);
	for (let y = 0; y < height; y++) {
		raw[y * stride] = 0;
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const o = y * stride + 1 + x * channels;
			if (alpha) {
				raw[o] = data[i];
				raw[o + 1] = data[i + 1];
				raw[o + 2] = data[i + 2];
				raw[o + 3] = data[i + 3];
			} else {
				const a = data[i + 3] / 255;
				raw[o] = Math.round(data[i] * a + background.r * (1 - a));
				raw[o + 1] = Math.round(data[i + 1] * a + background.g * (1 - a));
				raw[o + 2] = Math.round(data[i + 2] * a + background.b * (1 - a));
			}
		}
	}
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8;
	header[9] = alpha ? 6 : 2;
	return Buffer.concat([SIGNATURE, chunk("IHDR", header), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

/**
 * Read width, height, & colour type from a PNG header.
 * @param {Buffer} png
 * @returns {{ width: number, height: number, colorType: number, alpha: boolean }}
 */
export function readPngHeader(png) {
	if (!png.subarray(0, 8).equals(SIGNATURE)) throw new Error("Not a PNG file.");
	const colorType = png[25];
	return { width: png.readUInt32BE(16), height: png.readUInt32BE(20), colorType, alpha: colorType === 4 || colorType === 6 };
}

/**
 * Pack PNG images into an ICO (PNG-compressed entries, supported since Windows Vista & by every browser).
 * @param {Buffer[]} pngs One PNG per size, each 256 px or smaller.
 * @returns {Buffer}
 */
export function encodeIco(pngs) {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(pngs.length, 4);
	let offset = 6 + 16 * pngs.length;
	const entries = pngs.map((png) => {
		const { width, height } = readPngHeader(png);
		if (width > 256 || height > 256) throw new Error(`ICO entries are at most 256 px; found ${width}×${height}.`);
		const entry = Buffer.alloc(16);
		// 0 means 256 in the ICO directory.
		entry[0] = width === 256 ? 0 : width;
		entry[1] = height === 256 ? 0 : height;
		entry.writeUInt16LE(1, 4);
		entry.writeUInt16LE(32, 6);
		entry.writeUInt32LE(png.length, 8);
		entry.writeUInt32LE(offset, 12);
		offset += png.length;
		return entry;
	});
	return Buffer.concat([header, ...entries, ...pngs]);
}

/**
 * Read the ICO directory.
 * @param {Buffer} ico
 * @returns {{ width: number, height: number, bytes: number }[]}
 */
export function readIco(ico) {
	if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) throw new Error("Not an ICO file.");
	const count = ico.readUInt16LE(4);
	return Array.from({ length: count }, (_, i) => {
		const at = 6 + i * 16;
		return { width: ico[at] || 256, height: ico[at + 1] || 256, bytes: ico.readUInt32LE(at + 8) };
	});
}
