/**
 * Load, validate, default, & patch brand asset specs.
 * @module spec
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import { normalize } from "./color.js";

const SCHEMA_FILE = fileURLToPath(new URL("../../schema/brand.schema.json", import.meta.url));
const schema = JSON.parse(readFileSync(SCHEMA_FILE, "utf8"));
const validator = new Ajv2020({ allErrors: true, useDefaults: false, strict: false }).compile(schema);

/** Defaults the schema documents, applied here so specs stay short. */
const DEFAULTS = {
	size: 100,
	tracking: 0,
	skew: 0,
	padding: 0.18,
	surfaces: { light: "#ffffff", dark: "#101216" },
};

/**
 * Validate a spec object, throwing one readable message per problem.
 * @param {object} spec
 */
export function validateSpec(spec) {
	if (validator(spec)) return;
	const lines = validator.errors.map((error) => `  ${error.instancePath || "(root)"} ${error.message}`);
	throw new Error(`Spec is invalid:\n${lines.join("\n")}`);
}

/**
 * Deep merge for variant patches: objects merge, everything else replaces; `null` deletes.
 * @param {any} base
 * @param {any} patch
 * @returns {any}
 */
export function mergePatch(base, patch) {
	if (patch === null || typeof patch !== "object" || Array.isArray(patch)) return structuredClone(patch);
	const out = base && typeof base === "object" && !Array.isArray(base) ? structuredClone(base) : {};
	for (const [key, value] of Object.entries(patch)) {
		if (value === null) delete out[key];
		else out[key] = mergePatch(out[key], value);
	}
	return out;
}

/**
 * Fill defaults & check every paint reference.
 * @param {object} raw A valid spec.
 * @param {string} baseDir Directory font paths resolve against.
 * @returns {object} A resolved spec: `font.path` is absolute, palettes are normalized.
 */
export function resolveSpec(raw, baseDir) {
	validateSpec(raw);
	const spec = mergePatch(DEFAULTS, raw);
	spec.text ??= spec.name;
	spec.font.path = path.isAbsolute(spec.font.file) ? spec.font.file : path.resolve(baseDir, spec.font.file);
	spec.surfaces = { light: normalize(spec.surfaces.light), dark: normalize(spec.surfaces.dark) };
	for (const entry of Object.values(spec.palette)) {
		entry.light = normalize(entry.light);
		entry.dark = normalize(entry.dark ?? entry.light);
		entry.role ??= "text";
	}
	spec.gradients ??= {};
	for (const [id, gradient] of Object.entries(spec.gradients)) {
		gradient.direction ??= "diagonal";
		gradient.stops.forEach((stop) => checkPaint(spec, stop, `gradients.${id}.stops`, { allowGradient: false }));
	}
	spec.paint ??= {};
	spec.paint["*"] ??= Object.keys(spec.palette)[0];
	for (const [key, value] of Object.entries(spec.paint)) checkPaint(spec, value, `paint.${key}`, { allowLiteral: false });
	if (spec.motion) {
		spec.motion = { thickness: 0.08, gap: 0.08, inset: 0.05, ...spec.motion };
		spec.motion.lines.forEach((line, i) => checkPaint(spec, line.paint, `motion.lines.${i}`, { allowLiteral: false }));
	}
	spec.decorations = (spec.decorations ?? []).map((item, i) => {
		checkPaint(spec, item.paint, `decorations.${i}`, { allowLiteral: false });
		return { radius: 0, layer: "behind", skew: true, ...item };
	});
	spec.favicon = { ink: "#ffffff", radius: 0.22, scale: 0.72, dashes: 0, fit: "x-height", descender: 0.5, lift: 0, ...spec.favicon };
	spec.favicon.glyph ??= [...spec.text][0];
	spec.favicon.tile ??= Object.keys(spec.palette).find((name) => spec.palette[name].role !== "decorative");
	checkPaint(spec, spec.favicon.tile, "favicon.tile");
	checkPaint(spec, spec.favicon.ink, "favicon.ink", { allowGradient: false });
	spec.og ??= {};
	if (spec.og.accent) checkPaint(spec, spec.og.accent, "og.accent");
	return spec;
}

/**
 * @param {object} spec
 * @param {string} value
 * @param {string} where
 * @param {{ allowGradient?: boolean, allowLiteral?: boolean }} [options]
 */
function checkPaint(spec, value, where, { allowGradient = true, allowLiteral = true } = {}) {
	if (value.startsWith("@")) {
		if (!allowGradient) throw new Error(`${where}: gradients are not allowed here (${value}).`);
		if (!spec.gradients?.[value.slice(1)]) throw new Error(`${where}: no gradient named "${value.slice(1)}".`);
		return;
	}
	if (spec.palette[value]) return;
	if (allowLiteral) {
		try {
			normalize(value);
			return;
		} catch {
			// Falls through to the error below.
		}
	}
	throw new Error(`${where}: "${value}" is not a palette name${allowGradient ? " or @gradient" : ""}${allowLiteral ? " or color" : ""}.`);
}

/**
 * Read & resolve a spec file.
 * @param {string} file
 * @param {object} [patch] Optional variant patch merged before validation.
 * @returns {object}
 */
export function loadSpec(file, patch) {
	let raw;
	try {
		raw = JSON.parse(readFileSync(file, "utf8"));
	} catch (error) {
		throw new Error(`Cannot read spec ${file}: ${error.message}`, { cause: error });
	}
	return resolveSpec(patch ? mergePatch(raw, patch) : raw, path.dirname(path.resolve(file)));
}

/**
 * The paint for each letter index, from `*`, single indexes, & ranges (later keys win, ranges before indexes).
 * @param {Record<string, string>} paint
 * @param {number} count
 * @returns {string[]}
 */
export function paintsFor(paint, count) {
	const out = Array.from({ length: count }, () => paint["*"]);
	const ranges = Object.entries(paint).filter(([key]) => key.includes("-"));
	const singles = Object.entries(paint).filter(([key]) => /^\d+$/.test(key));
	for (const [key, value] of ranges) {
		const [from, to] = key.split("-").map(Number);
		for (let i = from; i <= Math.min(to, count - 1); i++) out[i] = value;
	}
	for (const [key, value] of singles) if (+key < count) out[+key] = value;
	return out;
}

/**
 * The light-mode color of a paint: palette name, literal, or a gradient's stops.
 * @param {object} spec
 * @param {string} value
 * @param {"light" | "dark"} [scheme]
 * @returns {string[]}
 */
export function paintColors(spec, value, scheme = "light") {
	if (value.startsWith("@")) return spec.gradients[value.slice(1)].stops.flatMap((stop) => paintColors(spec, stop, scheme));
	if (spec.palette[value]) return [spec.palette[value][scheme]];
	return [normalize(value)];
}
