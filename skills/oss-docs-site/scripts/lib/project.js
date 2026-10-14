// One-time check of the project layer (_data/project.json) when the scaffold runs,
// against schema/project.schema.json. Projects own the file afterward & may deviate.

import { readFileSync } from "node:fs";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";

import { SKILL_ROOT } from "./layers.js";
import { CONFIG_KEY } from "./settings.js";

const schema = JSON.parse(readFileSync(path.join(SKILL_ROOT, "schema", "project.schema.json"), "utf8"));
const validate = new Ajv2020({ allErrors: true, verbose: true }).compile(schema);

/**
 * @param {import("ajv").ErrorObject} error
 * @returns {string}
 */
function describe({ keyword, instancePath, params, parentSchema, data, message }) {
	const where = instancePath.split("/").slice(1).join(".");
	if (keyword === "required") return `${[where, params.missingProperty].filter(Boolean).join(".")} is required.`;
	if (keyword === "not") return `${where} is a site setting: set it in package.json under "${CONFIG_KEY}", not here.`;
	if (keyword === "additionalProperties") return `${[where, params.additionalProperty].filter(Boolean).join(".")} is not allowed: ${parentSchema.description}`;
	// A pattern has no readable message of its own: use the schema's description.
	const reason = keyword === "pattern" ? `must be ${parentSchema.description.split(/(?<=\.)\s/)[0].replace(/^A /, "a ").replace(/\.$/, "")}` : message;
	return `${where} ${reason} (found ${JSON.stringify(data)}).`;
}

/**
 * @param {unknown} project
 * @returns {string[]} human-readable problems; empty when valid
 */
export function validateProject(project) {
	return validate(project) ? [] : validate.errors.map(describe);
}

/**
 * @param {string} file path to project.json
 * @returns {string[]} problems; empty when valid
 */
export function checkProject(file) {
	try {
		return validateProject(JSON.parse(readFileSync(file, "utf8")));
	} catch (error) {
		return [`${file} is not valid JSON: ${error.message}`];
	}
}
