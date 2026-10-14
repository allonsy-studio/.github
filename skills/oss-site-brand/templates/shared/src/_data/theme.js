// Theme tokens: accent, font overrides, & the font stylesheet URL.

import { readFileSync } from "node:fs";
import path from "node:path";

import { computeTheme } from "../../lib/theme.js";

export default function () {
	const project = JSON.parse(readFileSync(path.join(import.meta.dirname, "project.json"), "utf8"));
	return computeTheme({ project });
}
