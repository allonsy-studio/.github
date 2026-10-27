// The schemas live in the Norn packages. They are read from the project's own node_modules,
// so they are found once the project has installed the packages.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";

/** The `project.json` schema, in @allons-y/webc-patterns. */
export const PROJECT_SCHEMA = "@allons-y/webc-patterns/schema/project.schema.json";

/** The `oss-docs` settings schema, in @allons-y/webc-oss-site. */
export const SETTINGS_SCHEMA = "@allons-y/webc-oss-site/schema/oss-docs.schema.json";

/**
 * @param {string} specifier a package subpath, such as PROJECT_SCHEMA
 * @param {string} root the project root, whose node_modules is searched
 * @returns {object | undefined} the parsed schema; undefined when the package is not installed
 */
export function loadSchema(specifier, root) {
	try {
		const file = createRequire(path.join(path.resolve(root), "package.json")).resolve(specifier);
		return JSON.parse(readFileSync(file, "utf8"));
	} catch (error) {
		if (error?.code === "MODULE_NOT_FOUND" || error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") return undefined;
		throw error;
	}
}

/**
 * @param {import("ajv").ErrorObject} error
 * @returns {string}
 */
function describe({ keyword, instancePath, params, parentSchema, data, message }) {
	const where = instancePath.split("/").slice(1).join(".");
	const hint = parentSchema?.description ?? "";
	if (keyword === "required") return `${[where, params.missingProperty].filter(Boolean).join(".")} is required.`;
	if (keyword === "not") return `${where} is not set here. ${hint}`;
	if (keyword === "additionalProperties") return `${[where, params.additionalProperty].filter(Boolean).join(".")} is not allowed: ${hint}`;
	return `${where} ${message} (found ${JSON.stringify(data)}).`;
}

/**
 * @param {object} schema
 * @param {unknown} data
 * @returns {string[]} human-readable problems; empty when valid
 */
export function schemaProblems(schema, data) {
	const validate = new Ajv2020({ allErrors: true, verbose: true, strict: false }).compile(schema);
	return validate(data) ? [] : validate.errors.map(describe);
}
