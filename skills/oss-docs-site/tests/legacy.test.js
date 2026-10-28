import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { suggest } from "../scripts/suggest.js";
import { findLegacy, hasTemplateTags, legacyLayouts, legacyTokens, LEGACY_FILES, migrateLayouts } from "../scripts/lib/legacy.js";
import { listing, put, read, readJson, run, snapshot, statusOf, tempProject } from "./helpers.js";

const OLD_PACKAGES = { "@11ty/eleventy-fetch": "^5.1.0", "@fortawesome/fontawesome-free": "^7.3.1", "markdown-it": "^14.1.0", prismjs: "^1.30.0", cypress: "^15.21.1" };

/**
 * A project the previous scaffold built, as far as the new scaffold can tell: its copied files, old config & data, a page on an old layout, old tokens.
 *
 * @param {Record<string, any>} [overrides] package.json overrides
 * @returns {string}
 */
function legacyProject(overrides = {}) {
	const dir = tempProject({ devDependencies: OLD_PACKAGES, "oss-docs": { site: "docs", flavor: "docs" }, ...overrides });
	for (const rel of LEGACY_FILES) put(dir, `docs/${rel}`, `old ${rel}\n`);
	put(dir, "docs/eleventy.config.js", 'import { highlightFences } from "./utilities/highlight.js";\n');
	put(dir, "docs/_data/site.js", 'import Fetch from "@11ty/eleventy-fetch";\n');
	put(dir, "docs/cypress.config.js", 'const sheet = "assets/styles/tokens.css";\n');
	put(dir, "docs/content/index.md", "---\nlayout: docs-home.webc\npermalink: /index.html\n---\n");
	put(dir, "docs/content/index.11tydata.js", 'export default {\n\tlayout: "docs.webc",\n};\n');
	put(dir, "docs/content/getting-started.md", "---\ntitle: Getting started\n---\n```sh\nnpm install {{ site.packageName }}\n```\n");
	put(dir, "docs/content/usage.md", "---\ntitle: Usage\nlayout: docs.webc\n---\nMine.\n");
	put(dir, "docs/content/assets/styles/project.css", ":root { --accent: #6b2fc2; --font-sans: Georgia, serif; }\n");
	put(dir, "docs/_data/project.json", '{ "lede": "Mine.", "features": [{ "title": "A", "body": "b", "icon": "plug" }] }\n');
	return dir;
}

describe("the legacy file list", () => {
	it("names no file the new scaffold writes", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "docs" });
		const written = new Set(listing(dir).map((file) => file.replace(/^docs\//, "")));
		assert.deepEqual(
			LEGACY_FILES.filter((rel) => written.has(rel)),
			[],
		);
	});

	it("names no project file", () => {
		assert.ok(!LEGACY_FILES.includes("content/assets/styles/project.css"));
		assert.ok(!LEGACY_FILES.some((rel) => rel.endsWith("project.json")));
	});

	it("finds the copies in a site", () => {
		const dir = legacyProject();
		assert.deepEqual(findLegacy(path.join(dir, "docs")), [...LEGACY_FILES]);
		assert.deepEqual(findLegacy(path.join(tempProject(), "docs")), []);
	});
});

describe("a site from the previous scaffold", () => {
	it("reports the copies as orphans & lists the files to review, without changing anything", async () => {
		const dir = legacyProject();
		const before = snapshot(dir);
		const result = await run(dir, { dryRun: true });
		assert.deepEqual(snapshot(dir), before);
		assert.deepEqual(result.legacy.sort(), LEGACY_FILES.map((rel) => `docs/${rel}`).sort());
		for (const file of result.legacy) assert.ok(result.orphans.includes(file), file);
		assert.equal(statusOf(result, "docs/_layouts/docs.webc"), "orphaned (legacy)");
		assert.equal(statusOf(result, "docs/content/assets/fonts/pt-mono.woff2"), "orphaned (legacy)");

		const reviewed = Object.fromEntries(result.review.map((r) => [r.path, r.note]));
		assert.match(reviewed["docs/eleventy.config.js"], /previous scaffold/);
		assert.match(reviewed["docs/_data/site.js"], /previous scaffold/);
		assert.match(reviewed["docs/cypress.config.js"], /previous scaffold/);
		assert.match(reviewed["docs/content/index.md"], /docs-home\.webc to norn-docs-home\.webc/);
		assert.match(reviewed["docs/content/usage.md"], /docs\.webc to norn-docs\.webc/);
		assert.match(reviewed["docs/content/getting-started.md"], /tags/);
		assert.match(reviewed["docs/content/assets/styles/project.css"], /--accent is now --norn-ui-accent, --font-sans is now --norn-font-body/);
		assert.match(reviewed["package.json"], /@11ty\/eleventy-fetch, @fortawesome\/fontawesome-free, markdown-it, prismjs/);
		assert.ok(!("docs/_data/project.json" in reviewed));
		assert.ok(result.next[0].includes("The build fails until they are removed"));
		assert.ok(result.next.some((line) => line.includes("features[].icon is not rendered")));
	});

	it("--prune removes the copies & the folders they leave empty", async () => {
		const dir = legacyProject();
		const result = await run(dir, { prune: true });
		for (const rel of LEGACY_FILES) assert.ok(!existsSync(path.join(dir, "docs", rel)), rel);
		for (const folder of ["_includes", "_layouts", "utilities", "content/assets/fonts", "content/assets/img", "content/assets/scripts"]) {
			assert.ok(!existsSync(path.join(dir, "docs", folder)), folder);
		}
		assert.equal(statusOf(result, "docs/_includes/site-head.webc"), "pruned (legacy)");
		assert.deepEqual(result.orphans, []);
		assert.ok(existsSync(path.join(dir, "docs/content/assets/styles/project.css")));
		assert.ok(result.next[0].startsWith(`Removed ${LEGACY_FILES.length} copied files`), result.next[0]);
	});

	it("--prune with --dry-run removes nothing", async () => {
		const dir = legacyProject();
		const before = snapshot(dir);
		const result = await run(dir, { prune: true, dryRun: true });
		assert.deepEqual(snapshot(dir), before);
		assert.equal(statusOf(result, "docs/_layouts/base.webc"), "pruned (legacy)");
	});

	it("--update replaces the old config & data, & only renames the layouts in pages", async () => {
		const dir = legacyProject();
		const result = await run(dir, { update: true, prune: true });
		assert.equal(statusOf(result, "docs/eleventy.config.js"), "updated");
		assert.equal(statusOf(result, "docs/_data/site.js"), "updated");
		assert.equal(statusOf(result, "docs/cypress.config.js"), "updated");
		assert.match(read(dir, "docs/eleventy.config.js"), /ossEnabled/);
		assert.equal(read(dir, "docs/content/index.md"), "---\nlayout: norn-docs-home.webc\npermalink: /index.html\n---\n");
		assert.match(read(dir, "docs/content/index.11tydata.js"), /layout: "norn-docs\.webc"/);
		assert.equal(read(dir, "docs/content/usage.md"), "---\ntitle: Usage\nlayout: norn-docs.webc\n---\nMine.\n");
		assert.equal(read(dir, "docs/content/getting-started.md").includes("{{ site.packageName }}"), true);
		assert.equal(read(dir, "docs/_data/project.json").includes('"icon": "plug"'), true);
		assert.equal(read(dir, "docs/content/assets/styles/project.css"), ":root { --accent: #6b2fc2; --font-sans: Georgia, serif; }\n");
	});

	it("never touches project.json or project.css, with any flags", async () => {
		const dir = legacyProject();
		const json = read(dir, "docs/_data/project.json");
		const css = read(dir, "docs/content/assets/styles/project.css");
		await run(dir, { update: true, prune: true });
		await run(dir, { update: true, prune: true });
		assert.equal(read(dir, "docs/_data/project.json"), json);
		assert.equal(read(dir, "docs/content/assets/styles/project.css"), css);
	});

	it("keeps a project's own components when pruning", async () => {
		const dir = legacyProject();
		put(dir, "docs/_includes/my-badge.webc", "<span>mine</span>\n");
		await run(dir, { prune: true });
		assert.ok(existsSync(path.join(dir, "docs/_includes/my-badge.webc")));
		assert.ok(!existsSync(path.join(dir, "docs/_includes/site-head.webc")));
	});

	it("turns the studio opt-out into the oss setting", async () => {
		const dir = legacyProject({ "oss-docs": { site: "docs", flavor: "docs", studio: false } });
		const result = await run(dir);
		assert.deepEqual(readJson(dir, "package.json")["oss-docs"], { site: "docs", flavor: "docs", oss: false });
		assert.equal(statusOf(result, "package.json"), "updated (studio → oss)");
	});

	it("drops a studio setting that was on", async () => {
		const dir = legacyProject({ "oss-docs": { site: "docs", flavor: "docs", studio: true } });
		await run(dir);
		assert.deepEqual(readJson(dir, "package.json")["oss-docs"], { site: "docs", flavor: "docs" });
	});

	it("leaves the old devDependencies for the maintainer & adds the Norn packages", async () => {
		const dir = legacyProject();
		await run(dir, { update: true, prune: true });
		const dev = readJson(dir, "package.json").devDependencies;
		assert.equal(dev.prismjs, "^1.30.0");
		assert.equal(dev["@allons-y/webc-patterns"], "^0.1.0-beta.1");
		assert.equal(dev.cypress, "^15.21.1");
	});

	it("is quiet about the past once the copies are gone", async () => {
		const dir = legacyProject();
		await run(dir, { update: true, prune: true });
		const again = await run(dir);
		assert.deepEqual(again.legacy, []);
		assert.deepEqual(again.orphans, []);
		assert.deepEqual(again.drift, []);
	});

	it("is reported by suggest.js", () => {
		const dir = legacyProject();
		assert.equal(suggest({ repo: dir }).legacySite, true);
		assert.equal(suggest({ repo: tempProject({ "oss-docs": { site: "docs", flavor: "docs" } }) }).legacySite, false);
	});
});

describe("the legacy helpers", () => {
	it("finds & renames old layout names, in front matter & data files", () => {
		const page = "---\nlayout: landing.webc\n---\n";
		assert.deepEqual(legacyLayouts(page), [{ from: "landing.webc", to: "norn-landing.webc" }]);
		assert.equal(migrateLayouts(page), "---\nlayout: norn-landing.webc\n---\n");
		assert.equal(migrateLayouts('layout: "workspaces-home.webc"'), 'layout: "norn-workspaces-home.webc"');
		assert.equal(migrateLayouts("layout: workspace.webc"), "layout: norn-workspace.webc");
		assert.equal(migrateLayouts("layout: docs-home.webc"), "layout: norn-docs-home.webc");
	});

	it("leaves Norn layouts alone", () => {
		assert.deepEqual(legacyLayouts("layout: norn-docs.webc"), []);
		assert.equal(migrateLayouts("layout: norn-docs.webc"), "layout: norn-docs.webc");
	});

	it("finds old tokens", () => {
		assert.deepEqual(legacyTokens(":root { --accent: red; }"), [{ from: "--accent", to: "--norn-ui-accent" }]);
		assert.deepEqual(legacyTokens(":root { --norn-ui-accent: red; --accent-text: blue; }"), []);
	});

	it("finds template tags outside front matter", () => {
		assert.equal(hasTemplateTags("---\npermalink: x\n---\n{% if a %}b{% endif %}"), true);
		assert.equal(hasTemplateTags("Plain text.\n"), false);
	});
});
