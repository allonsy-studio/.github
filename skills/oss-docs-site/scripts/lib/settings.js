// What the skill records in a project's package.json. The key comes from this skill's own
// package.json; the full settings schema ships in @allons-y/webc-oss-site (see schemas.js).

import { readFileSync } from "node:fs";
import path from "node:path";

import { SKILL_ROOT } from "./layers.js";

/** The package.json key for a project's settings. */
export const CONFIG_KEY = JSON.parse(readFileSync(path.join(SKILL_ROOT, "package.json"), "utf8")).skill.settingsKey;

/** The settings the scaffold records itself. The rest are the maintainer's. */
export const RECORDED = Object.freeze(["site", "flavor"]);

export const DEFAULT_SITE = "docs";

/**
 * A project's recorded settings, read as written.
 *
 * @param {Record<string, any>} pkg a parsed package.json
 * @returns {{ site?: unknown, flavor?: unknown, oss?: unknown, studio?: unknown, signals: Record<string, any> }}
 */
export function readSiteConfig(pkg) {
	const config = pkg?.[CONFIG_KEY] ?? {};
	return { site: config.site, flavor: config.flavor, oss: config.oss, studio: config.studio, signals: config.signals ?? {} };
}
