import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Join sheets in order. `tokens.css` leads: it declares the cascade layers.
 *
 * @param {string} dir directory holding the sheets
 * @param {readonly string[]} names sheet names without `.css`
 * @returns {string}
 */
export function bundleCss(dir, names) {
	return names.map((name) => readFileSync(path.join(dir, `${name}.css`), "utf8")).join("\n");
}
