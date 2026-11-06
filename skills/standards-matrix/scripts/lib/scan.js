/**
 * SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Allons-y Studio
 */

import { CHECKS } from "./checks.js";
import { makeRepo } from "./repo.js";

const GITHUB = "https://github.com/allonsy-studio";

/**
 * @typedef {{ repo: string, area: string, tool: string, std: string, src: string, status: string, state: string, links: { t: string, u: string }[], manual?: boolean, verified?: string }} Row
 * @typedef {{ repo: string, n: number, what: string, state: string, url?: string, open?: boolean }} PullRequest
 */

/** Run one check; a throwing check becomes a visible `you` row instead of aborting the scan. */
function safely(check, repo) {
	try {
		const [status, state] = check.run(repo);
		return { status, state };
	} catch (error) {
		return { status: "you", state: `The check failed to run: ${error.message}.` };
	}
}

/**
 * Scan checkouts of each repository's default branch, then look for rows that an open pull request fixes.
 * @param {object} input
 * @param {{ name: string, dir: string }[]} input.repos Default-branch checkouts, in display order.
 * @param {{ repo: string, n: number, dir: string }[]} [input.prHeads] Checkouts of open pull request heads.
 * @param {object[]} [input.manual] Rows a scan cannot read: decisions & GitHub settings.
 * @param {PullRequest[]} [input.prs] Pull requests gathered from GitHub.
 * @param {{ repo: string, reason: string }[]} [input.skipped] Repositories left out, with why.
 * @param {{ repo: string, tool: string, reason: string, decided?: string }[]} [input.exemptions] Scope decisions: a tool (or `*`) that does not apply to a repository.
 * @param {string} input.asOf Date in `YYYY-MM-DD` form.
 * @param {string} [input.baseline] Name of the org repository the others are compared with.
 */
export function runScan({ repos, prHeads = [], manual = [], prs = [], skipped = [], exemptions = [], asOf, baseline = ".github" }) {
	const baseEntry = repos.find((r) => r.name === baseline);
	const baseRepo = baseEntry ? makeRepo(baseEntry.name, baseEntry.dir) : null;
	const wrap = (name, dir) => (name === baseline ? makeRepo(name, dir) : makeRepo(name, dir, baseRepo));
	const mains = repos.map((r) => ({ name: r.name, repo: wrap(r.name, r.dir) }));
	const heads = prHeads.map((h) => ({ ...h, repo: wrap(h.repo, h.dir) }));
	const pullRequests = prs.map((p) => ({ ...p, url: p.url ?? `${GITHUB}/${p.repo}/pull/${p.n}`, open: p.open ?? /^open/i.test(p.state) }));
	const urlOf = (repo, n) => pullRequests.find((p) => p.repo === repo && p.n === n)?.url ?? `${GITHUB}/${repo}/pull/${n}`;

	const used = new Set();
	/** An exemption turns a row into a not-applicable one that says why. */
	const exempt = (repo, tool, row) => {
		const index = exemptions.findIndex((e) => e.repo === repo && (e.tool === tool || e.tool === "*"));
		if (index < 0) return row;
		used.add(index);
		const e = exemptions[index];
		return { ...row, status: "na", state: `Exempt: ${e.reason}`, links: [], exempt: true, decided: e.decided };
	};

	/** @type {Row[]} */
	const rows = [];
	for (const check of CHECKS) {
		for (const { name, repo } of mains) {
			const base = safely(check, repo);
			let row = { status: base.status, state: base.state, links: [] };
			if (base.status === "gap") {
				for (const head of heads.filter((h) => h.repo.name === name)) {
					const fixed = safely(check, head.repo);
					if (fixed.status === "ok") {
						row = { status: "pr", state: `${base.state} The open PR fixes it: ${fixed.state}`, links: [{ t: `#${head.n} open`, u: urlOf(name, head.n) }] };
						break;
					}
				}
			}
			rows.push(exempt(name, check.tool, { repo: name, area: check.area, tool: check.tool, std: check.std, src: check.src, ...row }));
		}
	}
	for (const item of manual) {
		for (const { name } of mains) {
			const entry = item.repos?.[name] ?? item.default;
			if (!entry) continue;
			rows.push(exempt(name, item.tool, { repo: name, area: item.area, tool: item.tool, std: item.std, src: item.src ?? "", status: entry.status ?? "you", state: entry.state, links: entry.links ?? [], manual: true, verified: entry.verified }));
		}
	}
	const unusedExemptions = exemptions.filter((_, i) => !used.has(i));
	return { asOf, repos: mains.map((m) => m.name), skipped, rows, prs: pullRequests, ...(unusedExemptions.length ? { unusedExemptions } : {}) };
}

const keyOf = (row) => `${row.repo}\u0000${row.tool}`;

/**
 * Compare two scans.
 * @returns {{ repo: string, tool: string, from: string | null, to: string | null, state: string }[]} Rows that appeared, vanished, or changed status.
 */
export function diffScans(previous, next) {
	const before = new Map((previous?.rows ?? []).map((r) => [keyOf(r), r]));
	const after = new Map(next.rows.map((r) => [keyOf(r), r]));
	const changes = [];
	for (const [key, row] of after) {
		const old = before.get(key);
		if (!old) changes.push({ repo: row.repo, tool: row.tool, from: null, to: row.status, state: row.state });
		else if (old.status !== row.status) changes.push({ repo: row.repo, tool: row.tool, from: old.status, to: row.status, state: row.state });
	}
	for (const [key, row] of before) if (!after.has(key)) changes.push({ repo: row.repo, tool: row.tool, from: row.status, to: null, state: "" });
	return changes;
}

const START = "/*DATA:start*/";
const END = "/*DATA:end*/";

/**
 * Read the scan back out of a built page, so a later run can compare against what is published.
 * @param {string} html
 * @returns {object | null}
 */
export function extractData(html) {
	const a = html.indexOf(START);
	const b = html.indexOf(END);
	if (a < 0 || b < a) return null;
	try {
		return JSON.parse(html.slice(a + START.length, b));
	} catch {
		return null;
	}
}

/**
 * Put a scan into the page template.
 * @param {string} template
 * @param {object} data
 */
export function injectData(template, data) {
	if (!Array.isArray(data?.repos) || !Array.isArray(data?.rows) || !Array.isArray(data?.prs)) throw new Error("The data needs repos, rows, and prs arrays.");
	const token = `${START}"__MATRIX_DATA__"${END}`;
	if (template.split(token).length !== 2) throw new Error("The template must hold the data placeholder exactly once.");
	const json = JSON.stringify(data)
		.replace(/</g, "\\u003c")
		.split(String.fromCharCode(0x2028))
		.join("\\u2028")
		.split(String.fromCharCode(0x2029))
		.join("\\u2029");
	return template.replace(token, () => `${START}${json}${END}`);
}
