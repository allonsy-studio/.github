/**
 * SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Allons-y Studio
 */

import test from "ava";
import { diffScans, extractData, injectData, runScan } from "../scripts/lib/scan.js";
import { tempRepo } from "./helpers.js";

const BEFORE = { ".nvmrc": "24\n", "package.json": { name: "example", type: "module", engines: { node: ">=24" } } };
const AFTER = { ...BEFORE, ".nvmrc": "26\n", ".github/workflows/ci.yml": "node-version-file: .nvmrc\nnode-version: 24\n" };

const nodeRow = (scan, repo) => scan.rows.find((r) => r.repo === repo && r.tool === "Node");

test("a gap that an open pull request fixes becomes in-open-PR with a link", (t) => {
	const scan = runScan({
		repos: [{ name: "example", dir: tempRepo(BEFORE) }],
		prHeads: [{ repo: "example", n: 10, dir: tempRepo(AFTER) }],
		prs: [{ repo: "example", n: 10, what: "move to Node 26", state: "Open" }],
		asOf: "2026-11-06",
	});
	const row = nodeRow(scan, "example");
	t.is(row.status, "pr");
	t.deepEqual(row.links, [{ t: "#10 open", u: "https://github.com/allonsy-studio/example/pull/10" }]);
	t.regex(row.state, /The open PR fixes it/);
});

test("a gap stays a gap when the open pull request does not fix it", (t) => {
	const scan = runScan({ repos: [{ name: "example", dir: tempRepo(BEFORE) }], prHeads: [{ repo: "example", n: 11, dir: tempRepo(BEFORE) }], asOf: "2026-11-06" });
	t.is(nodeRow(scan, "example").status, "gap");
});

test("pull requests default to a url & detect whether they are open", (t) => {
	const scan = runScan({ repos: [{ name: "example", dir: tempRepo(BEFORE) }], prs: [{ repo: "example", n: 3, what: "x", state: "Open · CI green" }, { repo: "example", n: 2, what: "y", state: "Merged" }], asOf: "2026-11-06" });
	t.is(scan.prs[0].open, true);
	t.is(scan.prs[1].open, false);
	t.is(scan.prs[0].url, "https://github.com/allonsy-studio/example/pull/3");
});

test("manual rows appear for the repositories they name & carry their flag", (t) => {
	const manual = [{ area: "Settings", tool: "Required checks", std: "x", repos: { example: { state: "Not verified.", verified: "2026-11-06" }, other: { state: "n/a" } } }];
	const scan = runScan({ repos: [{ name: "example", dir: tempRepo(BEFORE) }], manual, asOf: "2026-11-06" });
	const row = scan.rows.find((r) => r.tool === "Required checks");
	t.truthy(row);
	t.is(row.manual, true);
	t.is(row.status, "you");
	t.is(scan.rows.filter((r) => r.tool === "Required checks").length, 1);
});

test("a manual default applies to every repository the item does not name", (t) => {
	const manual = [{ area: "Testing", tool: "Coverage", std: "x", repos: { alpha: { state: "Chosen." } }, default: { state: "Undecided." } }];
	const scan = runScan({ repos: [{ name: "alpha", dir: tempRepo(BEFORE) }, { name: "beta", dir: tempRepo(BEFORE) }], manual, asOf: "2026-11-06" });
	const state = (repo) => scan.rows.find((r) => r.repo === repo && r.tool === "Coverage").state;
	t.is(state("alpha"), "Chosen.");
	t.is(state("beta"), "Undecided.");
});

test("skipped repositories pass through with their reasons", (t) => {
	const skipped = [{ repo: "forked", reason: "a fork" }];
	t.deepEqual(runScan({ repos: [{ name: "example", dir: tempRepo(BEFORE) }], skipped, asOf: "2026-11-06" }).skipped, skipped);
	t.deepEqual(runScan({ repos: [{ name: "example", dir: tempRepo(BEFORE) }], asOf: "2026-11-06" }).skipped, []);
});

test("the org repository is compared against nothing & the others against it", (t) => {
	const scan = runScan({
		repos: [
			{ name: ".github", dir: tempRepo({ "renovate.json": { extends: ["config:recommended"] } }) },
			{ name: "example", dir: tempRepo({ "renovate.json": { extends: ["config:base"] } }) },
		],
		asOf: "2026-11-06",
	});
	const renovate = (repo) => scan.rows.find((r) => r.repo === repo && r.tool === "Renovate");
	t.is(renovate(".github").status, "ok");
	t.is(renovate("example").status, "gap");
});

test("diffScans reports new, removed, & changed rows but not unchanged ones", (t) => {
	const row = (tool, status) => ({ repo: "example", tool, status, state: "" });
	const changes = diffScans({ rows: [row("A", "gap"), row("B", "ok"), row("C", "ok")] }, { rows: [row("A", "ok"), row("B", "ok"), row("D", "gap")] });
	t.deepEqual(changes.map((c) => `${c.tool}:${c.from}->${c.to}`).sort(), ["A:gap->ok", "C:ok->null", "D:null->gap"]);
});

test("diffScans treats a missing previous scan as all new", (t) => {
	t.is(diffScans(null, { rows: [{ repo: "r", tool: "T", status: "ok", state: "" }] }).length, 1);
});

test("injectData embeds the scan so extractData reads it back", (t) => {
	const template = 'var DATA = /*DATA:start*/"__MATRIX_DATA__"/*DATA:end*/;';
	const data = { asOf: "2026-11-06", repos: ["a"], rows: [], prs: [] };
	t.deepEqual(extractData(injectData(template, data)), data);
});

test("injectData escapes markup that could close the script tag", (t) => {
	const template = 'var DATA = /*DATA:start*/"__MATRIX_DATA__"/*DATA:end*/;';
	const page = injectData(template, { asOf: "x", repos: [], rows: [{ state: "</script><b>" }], prs: [] });
	t.false(page.includes("</script>"));
	t.is(extractData(page).rows[0].state, "</script><b>");
});

test("injectData rejects a template without exactly one placeholder & data without arrays", (t) => {
	t.throws(() => injectData("no placeholder", { repos: [], rows: [], prs: [] }), { message: /exactly once/ });
	t.throws(() => injectData('/*DATA:start*/"__MATRIX_DATA__"/*DATA:end*/', { repos: [] }), { message: /repos, rows, and prs/ });
});

test("extractData returns null for a page without data", (t) => {
	t.is(extractData("<html></html>"), null);
});
