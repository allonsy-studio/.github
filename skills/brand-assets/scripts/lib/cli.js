/**
 * Shared CLI plumbing: run only when executed, print JSON, fail with one clear line.
 * @module cli
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * True when the module at `url` is the script node was asked to run.
 * @param {string} url `import.meta.url` of the caller.
 * @returns {boolean}
 */
export function isMain(url) {
	return Boolean(process.argv[1]) && url === pathToFileURL(path.resolve(process.argv[1])).href;
}

/**
 * Run an async main, printing errors without a stack trace unless DEBUG is set.
 * @param {() => Promise<void>} main
 */
export function run(main) {
	main().catch((error) => {
		process.stderr.write(`${process.env.DEBUG ? error.stack : `Error: ${error.message}`}\n`);
		process.exitCode = 1;
	});
}

/**
 * Write a value as indented JSON on stdout.
 * @param {unknown} value
 */
export function printJson(value) {
	process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

/**
 * Human-friendly byte count.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
	return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}
