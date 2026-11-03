import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { chooseSite, suggestFlavor, suggestTooling, useRecorded } from "../scripts/lib/flavor.js";
import { suggest } from "../scripts/suggest.js";
import { put, tempProject } from "./helpers.js";

const facts = (overrides = {}) => ({ hasNestedDocsPages: false, isSingleAction: false, usesTypeScript: false, hasJavaScript: false, ...overrides });

describe("flavor suggestion", () => {
	it("picks workspaces, then landing, then docs", () => {
		assert.equal(suggestFlavor(facts({ hasNestedDocsPages: true, isSingleAction: true })).flavor, "workspaces");
		assert.equal(suggestFlavor(facts({ isSingleAction: true })).flavor, "landing");
		assert.equal(suggestFlavor(facts()).flavor, "docs");
	});

	it("suggests typedoc for TypeScript & jsdoc for JavaScript", () => {
		assert.deepEqual(suggestTooling(facts({ usesTypeScript: true, hasJavaScript: true })).map((t) => t.tool), ["typedoc", "jsdoc"]);
	});

	it("asks, applies a choice, or applies unattended", () => {
		assert.equal(chooseSite(facts(), { userPresent: true }).status, "needs-confirmation");
		assert.equal(chooseSite(facts(), { userPresent: true, choice: "landing" }).flavor, "landing");
		assert.equal(chooseSite(facts(), { userPresent: false }).confirmedBy, "unattended");
		assert.throws(() => chooseSite(facts(), { userPresent: true, choice: "blog" }), /Unknown flavor/);
		assert.throws(() => useRecorded("blog"), /Unknown flavor/);
	});
});

describe("suggest.js", () => {
	it("calls a repository without settings new, & asks about an existing site", () => {
		const dir = tempProject();
		put(dir, "cli.js", "export const run = () => {};\n");
		const result = suggest({ repo: dir });
		assert.equal(result.scenario, "new");
		assert.ok(result.existingSiteQuestion);
		assert.equal(result.applied, false);
	});

	it("uses a recorded flavor without scanning", () => {
		const dir = tempProject({ "oss-docs": { site: "docs", flavor: "workspaces" } });
		const result = suggest({ repo: dir });
		assert.equal(result.scenario, "migrate");
		assert.equal(result.flavor, "workspaces");
		assert.equal(result.confirmedBy, "project");
	});

	it("declines a project outside the org", () => {
		const dir = tempProject({ repository: { type: "git", url: "git+https://github.com/someone-else/demo.git" } });
		assert.throws(() => suggest({ repo: dir }), /outside this skill's scope/);
	});
});
