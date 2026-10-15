/**
 * Contrast checks for a resolved spec, & a palette patch that deepens failing colors.
 * @module audit
 */

import { TARGETS, contrast, deepen, formatRatio } from "./color.js";
import { paintColors } from "./spec.js";

/**
 * @typedef {object} ContrastRow
 * @property {string} subject What is measured, e.g. `palette.hot` or `favicon.ink on tile`.
 * @property {"light" | "dark"} scheme
 * @property {string} color
 * @property {string} against
 * @property {number} ratio
 * @property {string} role
 * @property {number} target
 * @property {"pass" | "fail" | "note"} status `note` for decorative paints, which are reported but never fail.
 */

/**
 * @param {Omit<ContrastRow, "ratio" | "status">} row
 * @returns {ContrastRow}
 */
function measure(row) {
	const ratio = contrast(row.color, row.against);
	const status = row.role === "decorative" ? "note" : ratio >= row.target ? "pass" : "fail";
	return { ...row, ratio, status };
}

/**
 * Every palette color against its surface in both schemes, plus the favicon glyph on its tile.
 * @param {object} spec A resolved spec.
 * @returns {ContrastRow[]}
 */
export function contrastRows(spec) {
	const rows = [];
	for (const [name, entry] of Object.entries(spec.palette)) {
		for (const scheme of ["light", "dark"]) {
			rows.push(
				measure({
					subject: `palette.${name}`,
					scheme,
					color: entry[scheme],
					against: spec.surfaces[scheme],
					role: entry.role,
					target: TARGETS[entry.role],
				}),
			);
		}
	}
	const ink = paintColors(spec, spec.favicon.ink)[0];
	const tiles = [...new Set(paintColors(spec, spec.favicon.tile))];
	for (const tile of tiles) {
		rows.push(measure({ subject: "favicon.ink on tile", scheme: "light", color: ink, against: tile, role: "graphic", target: TARGETS.graphic }));
	}
	// The tile's edge is the icon's outline in a tab strip: its strongest stop must stand out.
	for (const [scheme, bar] of Object.entries(TAB_BARS)) {
		const strongest = tiles.reduce((best, tile) => (contrast(tile, bar) > contrast(best, bar) ? tile : best));
		rows.push(measure({ subject: "favicon.tile on tab bar", scheme, color: strongest, against: bar, role: "graphic", target: TARGETS.graphic }));
	}
	return rows;
}

/** Chrome's light & dark tab-strip colors, where favicons sit. */
export const TAB_BARS = { light: "#dee1e6", dark: "#202124" };

/**
 * Lightest change that brings every failing palette color up to its target.
 * @param {object} spec A resolved spec.
 * @returns {{ patch: { palette: Record<string, { light?: string, dark?: string }> }, changes: { name: string, scheme: string, from: string, to: string, ratio: number, reached: boolean }[] }}
 */
export function deepenPatch(spec) {
	const palette = {};
	const changes = [];
	for (const [name, entry] of Object.entries(spec.palette)) {
		const target = TARGETS[entry.role];
		if (!target) continue;
		for (const scheme of ["light", "dark"]) {
			const result = deepen(entry[scheme], spec.surfaces[scheme], target);
			if (!result.changed) continue;
			palette[name] = { ...palette[name], [scheme]: result.hex };
			// Keep dark equal to light when the spec left it unset.
			if (scheme === "light" && entry.dark === entry.light) palette[name].dark ??= entry.dark;
			changes.push({ name, scheme, from: entry[scheme], to: result.hex, ratio: result.ratio, reached: result.reached });
		}
	}
	return { patch: { palette }, changes };
}

/**
 * Markdown table of contrast rows.
 * @param {ContrastRow[]} rows
 * @returns {string}
 */
export function contrastTable(rows) {
	const lines = ["| Subject | Scheme | Color | Against | Ratio | Target | Result |", "| --- | --- | --- | --- | --- | --- | --- |"];
	for (const row of rows) {
		const result = { pass: "pass", fail: "**fail**", note: "decorative" }[row.status];
		const target = row.target ? `${row.target}:1` : "none";
		lines.push(`| ${row.subject} | ${row.scheme} | \`${row.color}\` | \`${row.against}\` | ${formatRatio(row.ratio)} | ${target} | ${result} |`);
	}
	return lines.join("\n");
}
