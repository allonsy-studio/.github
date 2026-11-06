#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Allons-y Studio
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diffScans, extractData, runScan } from "./lib/scan.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const USAGE = `Usage: node scan.js --repo <name>=<dir> [--repo ...] [options]

  --repo <name>=<dir>     Checkout of a repository's default branch. Repeat for each; order sets display order.
  --pr <name>#<n>=<dir>   Checkout of an open pull request head. Repeat as needed.
  --baseline <name>       The org repository the others are compared with (default .github).
  --manual <file>         Rows a scan cannot read (default data/manual.json).
  --prs <file>            Pull requests gathered from GitHub, as JSON.
  --previous <file>       An earlier scan (JSON) or a built page (HTML), to report changes.
  --as-of <YYYY-MM-DD>    Date shown on the page (default today).
  --out <file>            Write the scan here (default stdout).`;

function parse(argv) {
	const opts = { repos: [], prs: [], baseline: ".github", manual: join(HERE, "..", "data", "manual.json") };
	for (let i = 0; i < argv.length; i += 1) {
		const flag = argv[i];
		const value = () => {
			const v = argv[(i += 1)];
			if (v == null) throw new Error(`${flag} needs a value.`);
			return v;
		};
		if (flag === "--repo") {
			const [name, dir] = splitOnce(value(), "=");
			opts.repos.push({ name, dir: resolve(dir) });
		} else if (flag === "--pr") {
			const [ref, dir] = splitOnce(value(), "=");
			const [repo, n] = splitOnce(ref, "#");
			if (!/^\d+$/.test(n ?? "")) throw new Error(`--pr expects <name>#<number>=<dir>, got ${ref}.`);
			opts.prs.push({ repo, n: Number(n), dir: resolve(dir) });
		} else if (flag === "--baseline") opts.baseline = value();
		else if (flag === "--manual") opts.manual = resolve(value());
		else if (flag === "--prs") opts.prsFile = resolve(value());
		else if (flag === "--previous") opts.previous = resolve(value());
		else if (flag === "--as-of") opts.asOf = value();
		else if (flag === "--out") opts.out = resolve(value());
		else if (flag === "--help" || flag === "-h") opts.help = true;
		else throw new Error(`Unknown option ${flag}.`);
	}
	return opts;
}

function splitOnce(text, sep) {
	const at = text.indexOf(sep);
	if (at < 0) throw new Error(`Expected "${sep}" in ${text}.`);
	return [text.slice(0, at), text.slice(at + 1)];
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

try {
	const opts = parse(process.argv.slice(2));
	if (opts.help || !opts.repos.length) {
		console.error(USAGE);
		process.exit(opts.help ? 0 : 1);
	}
	const asOf = opts.asOf ?? new Date().toISOString().slice(0, 10);
	const scan = runScan({
		repos: opts.repos,
		prHeads: opts.prs,
		manual: readJson(opts.manual),
		prs: opts.prsFile ? readJson(opts.prsFile) : [],
		asOf,
		baseline: opts.baseline,
	});
	if (opts.previous) {
		const text = readFileSync(opts.previous, "utf8");
		const previous = text.trimStart().startsWith("{") ? JSON.parse(text) : extractData(text);
		scan.changes = diffScans(previous, scan);
	}
	const json = `${JSON.stringify(scan, null, 2)}\n`;
	if (opts.out) writeFileSync(opts.out, json);
	else process.stdout.write(json);

	for (const repo of scan.repos) {
		const counts = {};
		for (const row of scan.rows.filter((r) => r.repo === repo)) counts[row.status] = (counts[row.status] ?? 0) + 1;
		console.error(`${repo}: ${Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(", ")}`);
	}
	if (scan.changes) {
		console.error(scan.changes.length ? `Changes since the previous scan: ${scan.changes.length}` : "No status changes since the previous scan.");
		for (const c of scan.changes) console.error(`  ${c.repo} / ${c.tool}: ${c.from ?? "new"} -> ${c.to ?? "removed"}`);
	}
	const stale = scan.rows.filter((r) => r.manual);
	if (stale.length) console.error(`${stale.length} manual rows need confirming with the user (see SKILL.md step 5).`);
} catch (error) {
	console.error(`scan: ${error.message}`);
	process.exit(1);
}
