import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const SVG_DIR = path.join(
	path.dirname(createRequire(import.meta.url).resolve("@fortawesome/fontawesome-free/package.json")),
	"svgs",
);
const NAME = /^(?:(brands|regular|solid)\/)?([a-z0-9-]+)$/;
const cache = new Map();

/**
 * Inline a Font Awesome Free icon as decorative SVG.
 *
 * @param {string} name `solid` icon name, or `brands/name` & `regular/name`
 * @returns {string}
 */
export function faIcon(name) {
	const match = NAME.exec(name);
	if (!match) throw new Error(`Invalid icon name "${name}": use "name", "brands/name", or "regular/name".`);
	if (!cache.has(name)) {
		const file = path.join(SVG_DIR, match[1] ?? "solid", `${match[2]}.svg`);
		let svg;
		try {
			svg = readFileSync(file, "utf8");
		} catch {
			throw new Error(`Unknown Font Awesome Free icon "${name}".`);
		}
		cache.set(name, svg.trim().replace("<svg ", '<svg aria-hidden="true" focusable="false" '));
	}
	return cache.get(name);
}

/**
 * @param {string} file icon file name
 * @returns {string} its media type
 */
export function iconType(file) {
	const types = { ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webp": "image/webp" };
	return types[path.extname(file).toLowerCase()] ?? "image/png";
}
