#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Allons-y Studio
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { injectData } from "./lib/scan.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const USAGE = `Usage: node build.js --data <scan.json> --out <page.html> [--template <file>]

Writes the Standards Matrix page: the template with the scan embedded.`;

const args = process.argv.slice(2);
const get = (flag) => {
	const at = args.indexOf(flag);
	return at < 0 ? undefined : args[at + 1];
};

try {
	const data = get("--data");
	const out = get("--out");
	if (!data || !out) {
		console.error(USAGE);
		process.exit(args.includes("--help") ? 0 : 1);
	}
	const template = readFileSync(resolve(get("--template") ?? join(HERE, "..", "templates", "matrix.html")), "utf8");
	const page = injectData(template, JSON.parse(readFileSync(resolve(data), "utf8")));
	writeFileSync(resolve(out), page);
	console.error(`Wrote ${resolve(out)}`);
} catch (error) {
	console.error(`build: ${error.message}`);
	process.exit(1);
}
