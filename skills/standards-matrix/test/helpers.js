/**
 * SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Allons-y Studio
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { CHECKS } from "../scripts/lib/checks.js";
import { makeRepo } from "../scripts/lib/repo.js";

/** The block every source & test file starts with. */
export const HEADER = "/**\n * SPDX-License-Identifier: MPL-2.0\n * Copyright (c) 2026 Allons-y Studio\n */\n";

/**
 * Write a throwaway checkout.
 * @param {Record<string, string | object>} files Relative path to content; objects are written as JSON.
 * @returns {string} The checkout's path.
 */
export function tempRepo(files) {
	const dir = mkdtempSync(join(tmpdir(), "standards-matrix-"));
	for (const [rel, content] of Object.entries(files)) {
		mkdirSync(dirname(join(dir, rel)), { recursive: true });
		writeFileSync(join(dir, rel), typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`);
	}
	return dir;
}

/**
 * Run one check against a set of files.
 * @param {string} id Check id from checks.js.
 * @param {Record<string, string | object>} files
 * @param {{ name?: string, baseline?: Record<string, string | object> }} [options]
 * @returns {[string, string]} Status & state.
 */
export function runCheck(id, files, { name = "example", baseline } = {}) {
	const check = CHECKS.find((c) => c.id === id);
	if (!check) throw new Error(`No check named ${id}`);
	const base = baseline ? makeRepo(".github", tempRepo(baseline)) : null;
	return check.run(makeRepo(name, tempRepo(files), base));
}
