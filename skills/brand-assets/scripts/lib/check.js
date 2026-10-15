/**
 * Static checks for SVGs the skill did not build, before they ship as <img> sources.
 * @module check
 */

/**
 * @typedef {object} SvgFinding
 * @property {"error" | "warning"} level `error` breaks rendering in an <img>; `warning` is worth fixing.
 * @property {string} message
 */

/**
 * Check one SVG for what breaks or degrades it as an <img> source.
 * @param {string} svg
 * @param {{ square?: boolean }} [options] `square` for icons, which must have a 1:1 viewBox.
 * @returns {SvgFinding[]}
 */
export function checkSvg(svg, { square = false } = {}) {
	const findings = [];
	const add = (level, message) => findings.push({ level, message });
	if (!/<svg\b/i.test(svg)) {
		add("error", "Not an SVG document.");
		return findings;
	}
	if (/<text\b/i.test(svg)) add("error", "Contains <text>: an <img> SVG cannot load fonts, so the letters fall back to a system face. Outline the text to paths.");
	if (/@font-face|@import/i.test(svg)) add("error", "Loads a font or stylesheet: an <img> SVG never fetches them.");
	if (/(?:xlink:)?href="(?:https?:|\/\/)/i.test(svg)) add("error", "References an external file: an <img> SVG never fetches it.");
	if (/<script\b|\son[a-z]+="/i.test(svg)) add("error", "Contains script or event handlers: they never run in an <img> & some hosts strip the file.");
	if (/<image\b[^>]*href="data:image\/(?:png|jpe?g|webp)/i.test(svg)) add("warning", "Embeds a raster image: it blurs when scaled. Prefer vector shapes.");

	const viewBox = /\bviewBox="\s*([\d.+-]+)[\s,]+([\d.+-]+)[\s,]+([\d.+-]+)[\s,]+([\d.+-]+)\s*"/i.exec(svg);
	if (!viewBox) add("error", "No viewBox: the SVG cannot scale to the header or icon sizes.");
	else if (square) {
		const [, , , width, height] = viewBox.map(Number);
		if (Math.abs(width - height) > 0.01) add("error", `Icon viewBox is ${width}×${height}: icons must be square.`);
	}
	if (!/<title\b/i.test(svg)) add("warning", "No <title>: add the project name so the file names itself when opened or inlined.");
	if (!/prefers-color-scheme:\s*dark/i.test(svg) && !square) add("warning", "No dark-mode rules: check the mark on the dark surface of the contact sheet.");
	return findings;
}

/**
 * Throw when any finding is an error, listing every finding.
 * @param {string} name File label for the message.
 * @param {SvgFinding[]} findings
 */
export function assertNoErrors(name, findings) {
	const errors = findings.filter((f) => f.level === "error");
	if (errors.length) throw new Error(`${name} cannot ship as an <img>:\n${errors.map((f) => `  ${f.message}`).join("\n")}`);
}
