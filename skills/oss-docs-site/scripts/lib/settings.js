// What the skill records in a project's package.json, from its own files: the key from
// package.json & the settings from the hosted schema. Existing values are never validated.

import { readFileSync } from "node:fs";
import path from "node:path";

import { SKILL_ROOT } from "./layers.js";

const read = (file) => JSON.parse(readFileSync(path.join(SKILL_ROOT, file), "utf8"));

/** The package.json key for a project's settings. */
export const CONFIG_KEY = read("package.json").skill.settingsKey;

/** The settings the schema defines, by key. */
export const SETTINGS = read("schema/oss-docs.schema.json").properties;

export const DEFAULT_SITE = SETTINGS.site.default;

/**
 * A project's recorded settings, read as written.
 *
 * @param {Record<string, any>} pkg a parsed package.json
 * @returns {{ site?: unknown, flavor?: unknown, signals: Record<string, any> }}
 */
export function readSiteConfig(pkg) {
	const config = pkg?.[CONFIG_KEY] ?? {};
	return { site: config.site, flavor: config.flavor, signals: config.signals ?? {} };
}
