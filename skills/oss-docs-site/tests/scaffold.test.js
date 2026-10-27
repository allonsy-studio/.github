import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { FLAVORS, NORN_PACKAGES, NORN_RANGE } from "../scripts/lib/layers.js";
import { installSchemas, listing, put, read, readJson, run, snapshot, statusOf, tempProject } from "./helpers.js";

/** Files every flavor writes. */
const COMMON = [
	".github/workflows/pages.yml",
	"docs/_data/project.json",
	"docs/_data/site.js",
	"docs/content/assets/styles/project.css",
	"docs/cypress.config.js",
	"docs/cypress/e2e/a11y.cy.js",
	"docs/cypress/support/commands.js",
	"docs/cypress/support/config.js",
	"docs/cypress/support/e2e.js",
	"docs/eleventy.config.js",
];

const EXPECTED = {
	landing: { files: ["docs/content/index.md"], layouts: { "docs/content/index.md": "norn-landing.webc" } },
	docs: {
		files: ["docs/content/getting-started.md", "docs/content/index.11tydata.js", "docs/content/index.md", "docs/content/usage.md"],
		layouts: { "docs/content/index.md": "norn-docs-home.webc" },
		directoryLayout: "norn-docs.webc",
	},
	workspaces: {
		files: ["docs/_data/workspaces.js", "docs/content/index.md", "docs/content/workspaces.11tydata.js", "docs/content/workspaces.md"],
		layouts: { "docs/content/index.md": "norn-workspaces-home.webc" },
		directoryLayout: "norn-workspace.webc",
	},
};

describe("a fresh scaffold", () => {
	for (const flavor of FLAVORS) {
		it(`writes the ${flavor} files & the right layouts`, async () => {
			const dir = tempProject();
			const result = await run(dir, { flavor });
			const written = listing(dir).filter((file) => file !== "package.json" && file !== "README.md");
			assert.deepEqual(written, [...COMMON, ...EXPECTED[flavor].files].sort());
			assert.equal(result.flavor, flavor);
			assert.equal(result.site, "docs");
			for (const [file, layout] of Object.entries(EXPECTED[flavor].layouts)) {
				assert.match(read(dir, file), new RegExp(`^layout: ${layout}$`, "m"));
			}
			if (EXPECTED[flavor].directoryLayout) {
				const data = read(dir, flavor === "docs" ? "docs/content/index.11tydata.js" : "docs/content/workspaces.11tydata.js");
				assert.ok(data.includes(`"${EXPECTED[flavor].directoryLayout}"`));
			}
			assert.deepEqual(result.lockedEdits, []);
			assert.deepEqual(result.orphans, []);
			assert.deepEqual(result.legacy, []);
		});

		it(`writes a ${flavor} config the Norn packages can load`, async () => {
			const dir = tempProject();
			await run(dir, { flavor });
			const config = read(dir, "docs/eleventy.config.js");
			assert.match(config, /from "@allons-y\/webc-oss-site"/);
			assert.match(config, /ossEnabled\(\{ packagePath: path\.resolve\(import\.meta\.dirname, "\.\.\/package\.json"\) \}\)/);
			assert.match(config, /output: at\("_site"\)/);
			assert.match(config, /markdownTemplateEngine: false/);
			assert.doesNotMatch(config, /\{\{|prism|utilities/i);
			for (const file of ["docs/eleventy.config.js", "docs/_data/site.js"]) {
				const check = spawnSync(process.execPath, ["--check", path.join(dir, file)], { encoding: "utf8" });
				assert.equal(check.status, 0, check.stderr);
			}
		});
	}

	it("builds the site data from the packages", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "landing" });
		const site = read(dir, "docs/_data/site.js");
		assert.match(site, /import \{ accentHex, buildSite, npmRelease \} from "@allons-y\/webc-patterns\/project"/);
		assert.match(site, /import \{ host \} from "@allons-y\/webc-oss-site"/);
		assert.match(site, /"\.\.\/\.\.\/package\.json"/);
		assert.doesNotMatch(site, /eleventy-fetch/);
	});

	it("fills the accent & points at the Norn token", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "landing", accent: "#1f6f8b" });
		const css = read(dir, "docs/content/assets/styles/project.css");
		assert.match(css, /--norn-ui-accent: #1f6f8b;/);
		assert.match(css, /--norn-font-body/);
	});

	it("starts project.json with the schema link", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "landing" });
		const project = readJson(dir, "docs/_data/project.json");
		assert.match(project.$schema, /webc-resources\/main\/packages\/webc-patterns\/schema\/project\.schema\.json$/);
		assert.deepEqual(project.features, []);
	});

	it("records the site & flavor in package.json", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "docs" });
		assert.deepEqual(readJson(dir, "package.json")["oss-docs"], { site: "docs", flavor: "docs" });
	});

	it("uses the recorded flavor & site on a later run", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "docs", targetDir: "website" });
		const again = await run(dir);
		assert.equal(again.flavor, "docs");
		assert.equal(again.site, "website");
		assert.equal(statusOf(again, "website/eleventy.config.js"), "unchanged");
	});

	it("pins the Pages workflow to the site's output", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "landing", targetDir: "website" });
		const workflow = read(dir, ".github/workflows/pages.yml");
		assert.match(workflow, /output-dir: website\/_site/);
		assert.match(workflow, /build-command: yarn docs:build && yarn docs:test/);
	});
});

describe("the package.json wiring", () => {
	it("adds the three Norn packages, the build tools, & the scripts", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "landing" });
		const pkg = readJson(dir, "package.json");
		for (const name of ["@allons-y/webc-patterns", "@allons-y/webc-oss-site", "@allons-y/webc-code-sample"]) {
			assert.equal(pkg.devDependencies[name], "^0.1.0-beta.1", name);
		}
		assert.equal(NORN_RANGE, "^0.1.0-beta.1");
		assert.deepEqual(Object.keys(NORN_PACKAGES).sort(), ["@allons-y/webc-code-sample", "@allons-y/webc-oss-site", "@allons-y/webc-patterns"]);
		for (const name of ["@11ty/eleventy", "@11ty/eleventy-plugin-webc", "cypress", "cypress-axe", "axe-core"]) {
			assert.ok(name in pkg.devDependencies, name);
		}
		assert.deepEqual(pkg.scripts, {
			"docs:build": "eleventy --config=docs/eleventy.config.js",
			"docs:start": "eleventy --serve --config=docs/eleventy.config.js",
			"docs:test": "cypress run --project docs",
		});
	});

	it("leaves out what the packages now provide", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "docs" });
		const names = Object.keys(readJson(dir, "package.json").devDependencies);
		for (const name of ["prismjs", "@fortawesome/fontawesome-free", "@11ty/eleventy-fetch", "markdown-it"]) {
			assert.ok(!names.includes(name), name);
		}
		assert.doesNotMatch(read(dir, "package.json"), /prismjs/);
	});

	it("keeps a package or script the project already has", async () => {
		const dir = tempProject({
			devDependencies: { "@11ty/eleventy": "^3.0.0" },
			scripts: { "docs:build": "eleventy --config=site/eleventy.config.js", test: "node --test" },
		});
		const result = await run(dir, { flavor: "landing" });
		const pkg = readJson(dir, "package.json");
		assert.equal(pkg.devDependencies["@11ty/eleventy"], "^3.0.0");
		assert.equal(pkg.scripts["docs:build"], "eleventy --config=site/eleventy.config.js");
		assert.equal(pkg.scripts.test, "node --test");
		assert.ok(result.next.some((line) => line.includes("already defines docs:build")));
	});

	it("asks for an ES module project", async () => {
		const dir = tempProject({ type: undefined });
		const result = await run(dir, { flavor: "landing" });
		assert.ok(result.next.some((line) => line.includes('Set "type": "module"')));
		assert.equal(existsSync(path.join(dir, "docs/cypress.config.mjs")), true);
	});
});

describe("re-running", () => {
	it("is a no-op the second time", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "docs" });
		const before = snapshot(dir);
		const again = await run(dir);
		assert.deepEqual(snapshot(dir), before);
		assert.ok(again.actions.filter((a) => !/^(unchanged|kept)/.test(a.status)).length === 0, JSON.stringify(again.actions));
		assert.deepEqual(again.drift, []);
	});

	for (const update of [false, true]) {
		it(`never overwrites project.json, project.css, or pages${update ? ", even with --update" : ""}`, async () => {
			const dir = tempProject();
			await run(dir, { flavor: "docs" });
			put(dir, "docs/_data/project.json", '{ "lede": "Mine." }\n');
			put(dir, "docs/content/assets/styles/project.css", ":root { --norn-ui-accent: #123456; }\n");
			put(dir, "docs/content/getting-started.md", "---\ntitle: Getting started\norder: 1\n---\nMy words.\n");
			const result = await run(dir, { update });
			assert.equal(read(dir, "docs/_data/project.json"), '{ "lede": "Mine." }\n');
			assert.equal(read(dir, "docs/content/assets/styles/project.css"), ":root { --norn-ui-accent: #123456; }\n");
			assert.match(read(dir, "docs/content/getting-started.md"), /My words\./);
			assert.equal(statusOf(result, "docs/content/assets/styles/project.css"), "kept (project file)");
			assert.equal(statusOf(result, "docs/_data/project.json"), "kept (project layer)");
		});
	}

	it("reports an edited owned file as drift, & --update takes the template", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "landing" });
		put(dir, "docs/eleventy.config.js", "// mine\n");
		const drifted = await run(dir);
		assert.deepEqual(drifted.drift, ["docs/eleventy.config.js"]);
		assert.equal(read(dir, "docs/eleventy.config.js"), "// mine\n");
		const updated = await run(dir, { update: true });
		assert.equal(statusOf(updated, "docs/eleventy.config.js"), "updated");
		assert.match(read(dir, "docs/eleventy.config.js"), /ossEnabled/);
	});

	it("flags a layout the flavor does not use", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "docs" });
		put(dir, "docs/content/index.md", "---\nlayout: norn-landing.webc\npermalink: /index.html\n---\nHello.\n");
		const result = await run(dir);
		assert.ok(result.review.some((r) => r.path === "docs/content/index.md" && r.note.includes("norn-docs-home.webc")));
		assert.match(read(dir, "docs/content/index.md"), /Hello\./);
	});

	it("validates project.json against the installed schema", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "landing" });
		put(dir, "docs/_data/project.json", JSON.stringify({ features: [{ title: "A" }], accent: "#fff", flavor: "docs" }));
		const missing = await run(dir);
		assert.ok(missing.next.some((line) => line.includes("was not checked")));
		installSchemas(dir);
		const checked = await run(dir);
		const line = checked.next.find((l) => l.includes("project.json has"));
		assert.ok(line, "problems reported");
		assert.match(line, /body is required/);
		assert.match(line, /accent is not set here/);
		assert.match(line, /flavor is a site setting/);
		assert.ok(!checked.next.some((l) => l.includes("was not checked")));
	});

	it("checks the oss-docs settings against the installed schema", async () => {
		const dir = tempProject({ "oss-docs": { site: "docs", flavor: "landing", oss: "no" } });
		installSchemas(dir);
		const result = await run(dir);
		assert.ok(result.next.some((line) => line.includes("settings in package.json have 1 problem")));
	});
});

describe("--dry-run", () => {
	it("writes nothing on a fresh project", async () => {
		const dir = tempProject();
		const before = snapshot(dir);
		const result = await run(dir, { flavor: "workspaces", dryRun: true });
		assert.deepEqual(snapshot(dir), before);
		assert.equal(statusOf(result, "docs/eleventy.config.js"), "created");
		assert.equal(statusOf(result, "package.json"), "created (oss-docs)");
	});

	it("writes nothing on a flavor switch with --update & --prune", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "docs" });
		const before = snapshot(dir);
		const result = await run(dir, { flavor: "landing", update: true, prune: true, dryRun: true });
		assert.deepEqual(snapshot(dir), before);
		assert.equal(statusOf(result, "docs/content/usage.md"), "pruned (previous flavor)");
	});
});

describe("switching flavor", () => {
	it("replaces unedited pages, & orphans the old flavor's files", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "docs" });
		const result = await run(dir, { flavor: "landing" });
		assert.equal(statusOf(result, "docs/content/index.md"), "switched (flavor)");
		assert.equal(statusOf(result, "docs/eleventy.config.js"), "switched (flavor)");
		assert.match(read(dir, "docs/content/index.md"), /layout: norn-landing\.webc/);
		assert.match(read(dir, "docs/eleventy.config.js"), /anchors: data\.anchors === true/);
		assert.deepEqual(result.orphans.sort(), ["docs/content/getting-started.md", "docs/content/index.11tydata.js", "docs/content/usage.md"]);
		assert.deepEqual(readJson(dir, "package.json")["oss-docs"], { site: "docs", flavor: "landing" });
		assert.ok(existsSync(path.join(dir, "docs/content/usage.md")));
	});

	it("--prune removes only unedited orphans", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "docs" });
		put(dir, "docs/content/usage.md", "---\ntitle: Usage\n---\nMy usage notes.\n");
		const result = await run(dir, { flavor: "landing", prune: true });
		assert.equal(statusOf(result, "docs/content/getting-started.md"), "pruned (previous flavor)");
		assert.equal(statusOf(result, "docs/content/index.11tydata.js"), "pruned (previous flavor)");
		assert.ok(!existsSync(path.join(dir, "docs/content/getting-started.md")));
		assert.match(read(dir, "docs/content/usage.md"), /My usage notes\./);
	});

	it("keeps an edited page as the project's", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "landing" });
		put(dir, "docs/content/index.md", "---\nlayout: norn-landing.webc\npermalink: /index.html\nanchors: true\n---\nExtra copy.\n");
		const result = await run(dir, { flavor: "docs" });
		assert.equal(statusOf(result, "docs/content/index.md"), "kept (project file)");
		assert.match(read(dir, "docs/content/index.md"), /Extra copy\./);
		assert.ok(result.review.some((r) => r.path === "docs/content/index.md"));
	});

	it("goes from docs to workspaces", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "docs" });
		await run(dir, { flavor: "workspaces", prune: true });
		assert.deepEqual(
			listing(path.join(dir, "docs/content")).filter((file) => !file.startsWith("assets/")),
			["index.md", "workspaces.11tydata.js", "workspaces.md"],
		);
		assert.match(read(dir, "docs/content/index.md"), /norn-workspaces-home\.webc/);
	});

	it("rejects an unknown flavor", async () => {
		await assert.rejects(run(tempProject(), { flavor: "blog" }), /Unknown flavor "blog"/);
	});
});

describe("scope & safety", () => {
	it("declines a project outside the org & writes nothing", async () => {
		const dir = tempProject({ repository: { type: "git", url: "git+https://github.com/someone-else/demo.git" } });
		const before = snapshot(dir);
		await assert.rejects(run(dir, { flavor: "landing" }), /outside this skill's scope/);
		assert.deepEqual(snapshot(dir), before);
	});

	it("needs a repository, a license, & a description", async () => {
		await assert.rejects(run(tempProject({ repository: undefined })), /no `repository`/);
		await assert.rejects(run(tempProject({ license: undefined })), /no `license`/);
		await assert.rejects(run(tempProject({ description: undefined })), /no `description`/);
	});

	it("refuses to write into a site directory it did not make", async () => {
		const dir = tempProject();
		put(dir, "docs/docusaurus.config.js", "module.exports = {};\n");
		await assert.rejects(run(dir, { flavor: "landing" }), /already has files/);
		const adopted = await run(dir, { flavor: "landing", adopt: true });
		assert.equal(statusOf(adopted, "docs/eleventy.config.js"), "created");
		assert.ok(existsSync(path.join(dir, "docs/docusaurus.config.js")));
	});

	it("keeps the site directory inside the repository", async () => {
		await assert.rejects(run(tempProject(), { targetDir: "../elsewhere" }), /inside the repository/);
	});

	it("flags a project file that shadows a locked studio component", async () => {
		const dir = tempProject();
		await run(dir, { flavor: "landing" });
		put(dir, "docs/_includes/oss-cta.webc", "<p>mine</p>\n");
		put(dir, "docs/_includes/norn-card.webc", "<p>mine</p>\n");
		const result = await run(dir);
		assert.deepEqual(result.lockedEdits, ["docs/_includes/oss-cta.webc"]);
		assert.ok(result.review.some((r) => r.path === "docs/_includes/norn-card.webc"));
		assert.ok(result.next.some((line) => line.includes('"oss": false')));
	});
});
