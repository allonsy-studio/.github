/**
 * Shared test helpers: fixture paths, temp folders, golden files.
 * @module helpers
 */

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SKILL = path.resolve(HERE, "..");
export const FONTS = path.resolve(SKILL, "../../assets/fonts");
export const SANS = path.join(FONTS, "instrument-sans-var.woff2");
export const DASHLY = path.join(HERE, "fixtures", "dashly.json");

/** @returns {string} A fresh temporary folder. */
export function tempDir() {
	return mkdtempSync(path.join(tmpdir(), "brand-assets-"));
}

/**
 * Compare with a golden file; UPDATE_GOLDEN=1 rewrites it.
 * @param {string} name File under tests/golden/.
 * @param {string} actual
 * @returns {string} The expected content.
 */
export function golden(name, actual) {
	const file = path.join(HERE, "golden", name);
	if (process.env.UPDATE_GOLDEN || !existsSync(file)) writeFileSync(file, actual);
	return readFileSync(file, "utf8");
}
