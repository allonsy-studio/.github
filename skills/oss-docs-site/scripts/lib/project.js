// Check of the project layer (_data/project.json) when the scaffold runs, against the schema
// in @allons-y/webc-patterns. Projects own the file afterward & may deviate.

import { readFileSync } from "node:fs";

import { loadSchema, PROJECT_SCHEMA, schemaProblems } from "./schemas.js";

/** Settings that belong in package.json, not here. */
const SETTING_KEYS = ["flavor", "site", "oss", "studio"];

/**
 * Problems the schema cannot express: settings kept in the wrong file, & fields the Norn layouts no longer render.
 *
 * @param {Record<string, any>} project
 * @returns {string[]}
 */
function extraProblems(project) {
	const problems = SETTING_KEYS.filter((key) => key in project).map(
		(key) => `${key} is a site setting: set it in package.json under \`oss-docs\`.`,
	);
	if (Array.isArray(project.features) && project.features.some((f) => f && typeof f === "object" && "icon" in f)) {
		problems.push("features[].icon is not rendered: the Norn cards take no icon. Remove it.");
	}
	if ("faviconIco" in project) problems.push("faviconIco is not linked by the Norn layouts: the favicon & appleTouchIcon are.");
	return problems;
}

/**
 * @param {unknown} project
 * @param {object} [schema] the schema from @allons-y/webc-patterns; without it only the extra checks run
 * @returns {string[]} human-readable problems; empty when valid
 */
export function validateProject(project, schema) {
	if (project === null || typeof project !== "object" || Array.isArray(project)) return ["project.json must be an object."];
	return [...(schema ? schemaProblems(schema, project) : []), ...extraProblems(project)];
}

/**
 * @param {string} file path to project.json
 * @param {string} root the project root, to find the installed schema
 * @returns {{ problems: string[], schemaFound: boolean }}
 */
export function checkProject(file, root) {
	const schema = loadSchema(PROJECT_SCHEMA, root);
	try {
		return { problems: validateProject(JSON.parse(readFileSync(file, "utf8")), schema), schemaFound: Boolean(schema) };
	} catch (error) {
		return { problems: [`${file} is not valid JSON: ${error.message}`], schemaFound: Boolean(schema) };
	}
}
