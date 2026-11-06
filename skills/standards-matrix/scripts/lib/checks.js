/**
 * SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Allons-y Studio
 */

import { posix } from "node:path";
import { isFixture } from "./repo.js";

/**
 * One check per matrix row. `run(repo)` reads files only and returns `[status, state]`:
 * `ok`, `gap`, or `na`. A check mirrors a rule in docs/testing.md or docs/repository-standards.md;
 * change both together (see references/checks.md).
 */

const ok = (state) => ["ok", state];
const gap = (state) => ["gap", state];
const na = (state) => ["na", state];
/** Join problems into one sentence that starts with a capital. */
const sentence = (items) => {
	const text = items.join("; ");
	return `${text[0].toUpperCase()}${text.slice(1)}.`;
};

const TS_FILE = /\.(ts|tsx|mts|cts)$/;
const SOURCE_FILE = /\.(js|ts|mjs|cjs|tsx|jsx)$/;
const ORG_REPO = ".github";
const ORG_ROOT_NAME = "@allons-y/core";
/** Variables every environment provides, so `.env.example` need not list them. */
const AMBIENT_ENV = new Set(["CI", "NODE_ENV", "HOME", "PATH", "TMPDIR", "TEMP", "TMP", "USER", "SHELL", "NO_COLOR", "FORCE_COLOR", "NODE_OPTIONS", "NODE_PATH", "PWD", "DEBUG"]);

const tsSourceFiles = (repo) => repo.files().filter((f) => TS_FILE.test(f) && !f.endsWith(".d.ts") && !isFixture(f));
const hasTypeScript = (repo) => tsSourceFiles(repo).length > 0;
const tsPackages = (repo) => repo.packages().filter((p) => repo.has(p.dir === "." ? "tsconfig.json" : `${p.dir}/tsconfig.json`));
const workflow = (repo, name) => repo.read(`.github/workflows/${name}`) ?? "";
const workflowNames = (repo) => repo.files().filter((f) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f)).map((f) => f.split("/").pop());
const allWorkflows = (repo) => workflowNames(repo).map((name) => workflow(repo, name)).join("\n");
/** Node majors a workflow runs: a matrix list (`node: [26, 24]`) or explicit `node-version` values. */
function nodeMajors(text) {
	const majors = new Set();
	for (const list of text.matchAll(/\bnode:\s*\[([^\]]*)\]/g)) for (const n of list[1].matchAll(/\d+/g)) majors.add(Number(n[0]));
	for (const m of text.matchAll(/node-version:\s*["']?(\d+)/g)) majors.add(Number(m[1]));
	return majors;
}
const runsStep = (text, step) => new RegExp(`(?:yarn|npm|pnpm)\\s+(?:run\\s+)?${step}\\b`).test(text);
const hooksOf = (repo) => repo.files().filter((f) => /^\.husky\/[^/_]+$/.test(f)).map((f) => f.split("/").pop()).filter((n) => n !== "common.sh");

/** Compiler options of a tsconfig, following relative `extends` chains. */
function compilerOptions(repo, rel, depth = 0) {
	const config = repo.json(rel);
	if (!config) return null;
	let options = { ...config.compilerOptions };
	if (typeof config.extends === "string" && config.extends.startsWith(".") && depth < 3) {
		const target = config.extends.endsWith(".json") ? config.extends : `${config.extends}.json`;
		const parent = compilerOptions(repo, posix.normalize(posix.join(posix.dirname(rel), target)), depth + 1);
		if (parent) options = { ...parent, ...options };
	}
	return options;
}
const joinList = (items, max = 4) => (items.length > max ? `${items.slice(0, max).join(", ")}, & ${items.length - max} more` : items.join(", "));
const scriptsOf = (pkg) => pkg.json.scripts ?? {};
const depsOf = (pkg) => ({ ...pkg.json.dependencies, ...pkg.json.devDependencies, ...pkg.json.peerDependencies, ...pkg.json.optionalDependencies });
const rootPkg = (repo) => repo.json("package.json") ?? {};
/** Source files the standard says carry the license header & read environment variables. */
const standardFiles = (repo) => repo.files().filter((f) => /(^|\/)(src|test|bin)\//.test(f) && SOURCE_FILE.test(f) && !isFixture(f));

export const AREAS = ["Runtime", "Packages", "Language", "Testing", "Build", "Lint", "Hooks", "Release", "CI", "Config", "Docs", "Settings", "Housekeeping"];

/** @type {{ id: string, area: string, tool: string, std: string, src: string, run: (repo: ReturnType<typeof import('./repo.js').makeRepo>) => [string, string] }[]} */
export const CHECKS = [
	{
		id: "node",
		area: "Runtime",
		tool: "Node",
		std: ".nvmrc is 26, engines.node is >=24, and CI runs both versions.",
		src: ".nvmrc · ci.yml",
		run(repo) {
			const nvmrc = repo.read(".nvmrc")?.trim();
			const engines = rootPkg(repo).engines?.node;
			const ci = workflow(repo, "ci.yml");
			const problems = [];
			if (nvmrc !== "26") problems.push(`.nvmrc is ${nvmrc ?? "missing"}`);
			if (!/^>=\s*24(\.\d+){0,2}$/.test(engines ?? "")) problems.push(`engines.node is ${engines ?? "missing"}`);
			if (!nodeMajors(ci).has(24)) problems.push("CI has no Node 24 job");
			return problems.length ? gap(`${problems.join("; ")}.`) : ok(".nvmrc 26, engines >=24, CI matrix runs both.");
		},
	},
	{
		id: "yarn",
		area: "Runtime",
		tool: "Yarn",
		std: "Yarn 4 through Corepack, nodeLinker node-modules, packageManager pinned, release committed.",
		src: ".yarnrc.yml · package.json",
		run(repo) {
			const manager = rootPkg(repo).packageManager ?? "";
			const linker = /nodeLinker:\s*node-modules/.test(repo.read(".yarnrc.yml") ?? "");
			const problems = [];
			if (!/^yarn@4\./.test(manager)) problems.push(`packageManager is ${manager || "missing"}`);
			if (!linker) problems.push("nodeLinker is not node-modules");
			return problems.length ? gap(`${problems.join("; ")}.`) : ok(`${manager.replace("@", " ")} with the node-modules linker.`);
		},
	},
	{
		id: "esm",
		area: "Packages",
		tool: "ESM",
		std: 'type "module"; config & source files end in .js, never .mjs.',
		src: "package.json",
		run(repo) {
			const mjs = repo.files().filter((f) => f.endsWith(".mjs") && !isFixture(f));
			const problems = [];
			if (rootPkg(repo).type !== "module") problems.push('root package.json is not type "module"');
			if (mjs.length) problems.push(`${mjs.length} .mjs file${mjs.length === 1 ? "" : "s"} (${joinList(mjs, 2)})`);
			return problems.length ? gap(`${problems.join("; ")}.`) : ok('type "module"; no .mjs files.');
		},
	},
	{
		id: "typescript",
		area: "Language",
		tool: "TypeScript",
		std: "Only for packages that benefit from strong typing; vanilla JS elsewhere. Strict, on NodeNext.",
		src: "tsconfig.json",
		run(repo) {
			if (!hasTypeScript(repo)) return ok("No TypeScript source.");
			const configs = tsPackages(repo).map((p) => (p.dir === "." ? "tsconfig.json" : `${p.dir}/tsconfig.json`));
			if (!configs.length) return gap("TypeScript source without a tsconfig.json.");
			const weak = [];
			for (const rel of configs) {
				const options = compilerOptions(repo, rel) ?? {};
				const nodeNext = /^nodenext$/i.test(options.module ?? "") && /^nodenext$/i.test(options.moduleResolution ?? "");
				if (options.strict !== true || !nodeNext) weak.push(rel.replace(/\/?tsconfig\.json$/, "") || ".");
			}
			if (weak.length) return gap(`${weak.length} of ${configs.length} TypeScript package${configs.length === 1 ? " is" : "s are"} not strict on NodeNext (${joinList(weak, 3)}).`);
			return ok(`Strict TypeScript on NodeNext in ${configs.length} package${configs.length === 1 ? "" : "s"}.`);
		},
	},
	{
		id: "root-name",
		area: "Packages",
		tool: "Root package name",
		std: "Unscoped; the @allons-y/ scope is for published packages. Exception: @allons-y/core in this repo.",
		src: "package.json",
		run(repo) {
			const name = rootPkg(repo).name;
			if (!name) return gap("The root package.json has no name.");
			if (repo.name === ORG_REPO && name === ORG_ROOT_NAME) return ok(`${name}, recorded as the exception in the standards.`);
			if (!name.startsWith("@")) return ok(`${name}.`);
			if (rootPkg(repo).private !== true) return ok(`${name}: the root is the published package, so the scope fits.`);
			return gap(`${name} is a private root with a scoped name; only published packages use the @allons-y/ scope.`);
		},
	},
	{
		id: "internal-ranges",
		area: "Packages",
		tool: "Internal dependency ranges",
		std: "Real semver ranges such as ^0.1.0, not workspace:^, because opx release publishes with npm publish.",
		src: "packages/*/package.json",
		run(repo) {
			const packages = repo.packages();
			const names = new Set(packages.map((p) => p.json.name).filter(Boolean));
			let internal = 0;
			let workspace = 0;
			for (const pkg of packages) {
				for (const [dep, range] of Object.entries(depsOf(pkg))) {
					if (!names.has(dep) || dep === pkg.json.name) continue;
					internal += 1;
					if (String(range).startsWith("workspace:")) workspace += 1;
				}
			}
			if (internal === 0) return na("No dependencies between workspace packages.");
			if (workspace) return gap(`${workspace} workspace: range${workspace === 1 ? "" : "s"} among ${internal} internal dependencies.`);
			return ok(`${internal} internal dependencies use semver ranges.`);
		},
	},
	{
		id: "test-runner",
		area: "Testing",
		tool: "Test runner",
		std: "Vitest for web & TypeScript packages; AVA for lightweight plain-JS plugins & CLIs; the host ecosystem's technique wins when it has one.",
		src: "package.json scripts",
		run(repo) {
			const ts = new Set(tsPackages(repo).map((p) => p.dir));
			const seen = [];
			for (const pkg of repo.packages()) {
				const script = scriptsOf(pkg).test;
				if (!script) continue;
				const runner = /\bvitest\b/.test(script) ? "vitest" : /\bava\b/.test(script) ? "ava" : /node(\s+--\S+)*\s+--test\b/.test(script) ? "node:test" : "other";
				seen.push({ dir: pkg.dir, name: pkg.json.name ?? pkg.dir, runner, ts: ts.has(pkg.dir) });
			}
			// A root script that fans out to the workspaces is not a runner itself.
			const real = seen.filter((s) => !(s.dir === "." && s.runner === "other"));
			if (!real.length) return na("No package defines a test script.");
			const nodeTest = real.filter((s) => s.runner === "node:test");
			const tsWrong = real.filter((s) => s.ts && s.runner !== "vitest" && s.runner !== "other");
			if (nodeTest.length) return gap(`${nodeTest.length} package${nodeTest.length === 1 ? " uses" : "s use"} node:test (${joinList(nodeTest.map((s) => s.name), 3)}); AVA is the standard for plain-JS scripts.`);
			if (tsWrong.length) return gap(`TypeScript package${tsWrong.length === 1 ? "" : "s"} not on Vitest: ${joinList(tsWrong.map((s) => s.name), 3)}.`);
			const runners = [...new Set(real.filter((s) => s.runner !== "other").map((s) => s.runner))];
			return ok(runners.length ? `${runners.join(" & ")} in ${real.length} package${real.length === 1 ? "" : "s"}.` : "Tests run through a root script.");
		},
	},
	{
		id: "test-layout",
		area: "Testing",
		tool: "Test layout",
		std: "test/ beside src/, <module>.test.ts, shared helpers in test/helpers.ts.",
		src: "test/",
		run(repo) {
			const files = repo.files().filter((f) => !isFixture(f));
			const wrong = [...new Set(files.filter((f) => /(^|\/)tests\//.test(f)).map((f) => f.slice(0, f.indexOf("tests/") + "tests".length)))];
			if (wrong.length) return gap(`${wrong.length} folder${wrong.length === 1 ? " is" : "s are"} named tests/, not test/ (${joinList(wrong, 2)}).`);
			const any = files.some((f) => /(^|\/)test\//.test(f));
			return any ? ok("test/ folders beside the source.") : na("No test folders.");
		},
	},
	{
		id: "license-header",
		area: "Testing",
		tool: "License header",
		std: "Every file under src/, test/, & bin/ starts with the block from .license-header.js; lint enforces it.",
		src: ".license-header.js · eslint.config.js",
		run(repo) {
			const files = standardFiles(repo);
			if (!files.length) return na("No files under src/, test/, or bin/.");
			const missing = files.filter((f) => !(repo.read(f) ?? "").slice(0, 400).includes("SPDX-License-Identifier"));
			const rule = repo.has(".license-header.js") && /license-header/.test(repo.read("eslint.config.js") ?? "");
			if (missing.length) return gap(`${missing.length} of ${files.length} files carry no header${rule ? "" : ", and there is no .license-header.js or lint rule"}.`);
			return rule ? ok(`eslint-plugin-license-header runs on src, test, & bin (${files.length} files).`) : gap("Every file has a header, but no .license-header.js or lint rule enforces it.");
		},
	},
	{
		id: "typecheck",
		area: "Testing",
		tool: "Typecheck",
		std: "tsconfig.test.json & yarn typecheck cover src & test, with a CI step after build.",
		src: "tsconfig.test.json",
		run(repo) {
			if (!hasTypeScript(repo)) return na("No TypeScript.");
			const problems = [];
			if (!repo.has("tsconfig.test.json")) problems.push("no root tsconfig.test.json");
			if (!scriptsOf({ json: rootPkg(repo) }).typecheck) problems.push("no typecheck script");
			if (!runsStep(allWorkflows(repo), "typecheck")) problems.push("no CI step");
			return problems.length ? gap(sentence(problems)) : ok("Root tsconfig.test.json, yarn typecheck, and a CI step.");
		},
	},
	{
		id: "a11y",
		area: "Testing",
		tool: "Accessibility audit",
		std: "Cypress & cypress-axe at WCAG 2.2 AA on any site or UI.",
		src: "cypress/",
		run(repo) {
			const hasSite = repo.has("site") || repo.has("docs/eleventy.config.js");
			if (!hasSite) return na("No built pages in this repository.");
			const audited = repo.packages().some((p) => "cypress-axe" in depsOf(p)) || repo.files().some((f) => /(^|\/)cypress\/.*a11y/.test(f));
			return audited ? ok("Cypress & cypress-axe audit the site.") : gap("No audit for the docs site.");
		},
	},
	{
		id: "build-tool",
		area: "Build",
		tool: "Build tool",
		std: "opx-build-* if one exists (none is published), else tsc for unbundled TypeScript or esbuild for bundling.",
		src: "package.json scripts",
		run(repo) {
			const builds = repo.packages().filter((p) => scriptsOf(p).build);
			const ts = tsPackages(repo);
			if (!ts.length && !builds.length) return na("Nothing to build.");
			const tools = new Set();
			for (const pkg of builds) {
				const script = scriptsOf(pkg).build;
				if (/\btsc\b/.test(script)) tools.add("tsc");
				if (/\besbuild\b/.test(script)) tools.add("esbuild");
				if (/\bopx build\b/.test(script)) tools.add("opx build");
				if (/foreach/.test(script)) tools.add("workspaces");
			}
			const real = [...tools].filter((t) => t !== "workspaces");
			if (ts.length && !real.length) return gap("TypeScript packages have no tsc or esbuild build script.");
			return ok(`${real.join(" & ") || "A root build script"}: emits JS & declarations.`);
		},
	},
	{
		id: "css",
		area: "Build",
		tool: "CSS pipeline",
		std: "PostCSS with autoprefixer and/or cssnano when CSS is compiled.",
		src: "postcss.config.js",
		run(repo) {
			return repo.has("postcss.config.js") ? ok("PostCSS is configured.") : na("No compiled CSS.");
		},
	},
	{
		id: "lint",
		area: "Lint",
		tool: "opx lint",
		std: "eslint.config.js spreads the three opx-lint-* presets. typescript is a dev dependency, a peer of opx-lint-js.",
		src: "eslint.config.js · .opx/config.json",
		run(repo) {
			const config = repo.read("eslint.config.js") ?? "";
			const dev = rootPkg(repo).devDependencies ?? {};
			const problems = [];
			if (!config) problems.push("no eslint.config.js");
			else if (!/@allons-y\/opx-lint-/.test(config)) problems.push("eslint.config.js does not spread the opx-lint-* presets");
			if (!("typescript" in dev)) problems.push("typescript is not a dev dependency, so lint fails on a clean install");
			return problems.length ? gap(`${problems.join("; ")}.`) : ok("opx presets with typescript installed.");
		},
	},
	{
		id: "lint-staged",
		area: "Lint",
		tool: "lint-staged",
		std: "Keep only if a hook runs it, with scripts that exist.",
		src: "package.json",
		run(repo) {
			const pkg = rootPkg(repo);
			if (!pkg["lint-staged"] && !("lint-staged" in (pkg.devDependencies ?? {}))) return ok("Removed.");
			return repo.has(".husky/pre-commit") ? ok("Run by the pre-commit hook.") : gap("lint-staged is configured but no pre-commit hook runs it.");
		},
	},
	{
		id: "husky",
		area: "Hooks",
		tool: "Husky",
		std: "post-commit runs opx hooks & lint and never blocks a commit.",
		src: ".husky/post-commit",
		run(repo) {
			const own = repo.read(".husky/post-commit");
			if (own == null) {
				const hooks = hooksOf(repo);
				return gap(hooks.length ? `No .husky/post-commit; it has ${joinList(hooks)} instead.` : "No .husky hooks.");
			}
			const base = repo.baseline?.read(".husky/post-commit");
			if (base != null && base !== own) return gap("Differs from the baseline in the org repository.");
			return ok(base == null ? "Baseline file." : "Identical to the org baseline.");
		},
	},
	{
		id: "opx-release",
		area: "Release",
		tool: "opx release",
		std: "@allons-y/opx-release wraps Changesets: changeset, version, & release scripts, release true in .opx/config.json.",
		src: ".opx/config.json · package.json",
		run(repo) {
			const publishable = repo.packages().filter((p) => !p.root && p.json.private !== true && p.json.name);
			if (!publishable.length) return na("Nothing is published.");
			const scripts = scriptsOf({ json: rootPkg(repo) });
			const problems = [];
			if (!("@allons-y/opx-release" in (rootPkg(repo).devDependencies ?? {}))) problems.push("@allons-y/opx-release is not installed");
			if (repo.json(".opx/config.json")?.release !== true) problems.push('.opx/config.json lacks "release": true');
			for (const name of ["changeset", "version", "release"]) if (!scripts[name]) problems.push(`no ${name} script`);
			if (/changeset publish/.test(scripts.release ?? "")) problems.push("release still calls changeset publish");
			return problems.length ? gap(`${problems.join("; ")}.`) : ok("opx release with changeset, version, & release scripts.");
		},
	},
	{
		id: "ci",
		area: "CI",
		tool: "ci.yml",
		std: "One job named CI (node26) and CI (node24), running lint, build, typecheck, & test; both required.",
		src: ".github/workflows/ci.yml",
		run(repo) {
			const names = workflowNames(repo);
			let file = "ci.yml";
			if (!names.includes(file)) {
				file = names.find((n) => /^(ci|test|tests|testing)\.ya?ml$/.test(n));
				if (!file) return gap(names.length ? `No CI workflow that runs tests (workflows: ${joinList(names, 5)}).` : "No workflows.");
			}
			const ci = workflow(repo, file);
			const everything = allWorkflows(repo);
			const ts = hasTypeScript(repo);
			const need = ["lint", "test", ...(ts ? ["build", "typecheck"] : [])];
			const missing = need.filter((step) => !runsStep(everything, step));
			const majors = nodeMajors(ci);
			const named = /name:\s*CI \(node(?:\$\{\{\s*matrix\.node\s*\}\}|\d+)\)/.test(ci);
			const problems = [];
			if (file !== "ci.yml") problems.push(`the CI workflow is ${file}, not ci.yml`);
			if (missing.length) problems.push(`no ${joinList(missing)} step in any workflow`);
			if (!(majors.has(26) && majors.has(24))) problems.push("no node 26 & node 24 jobs");
			if (!named) problems.push("the jobs are not named CI (node26) & CI (node24)");
			if (problems.length) return gap(sentence(problems));
			return ok(ts ? "Lint, build, typecheck, & test on both Node versions." : "Lint & test on both Node versions; build & typecheck are omitted because nothing builds.");
		},
	},
	{
		id: "pages",
		area: "CI",
		tool: "Pages",
		std: "Call the shared pages workflow with output-dir.",
		src: ".github/workflows/pages.yml",
		run(repo) {
			const pages = workflow(repo, "pages.yml");
			if (/workflow_call/.test(pages)) return na("Hosts the reusable workflow.");
			if (/allonsy-studio\/\.github\/\.github\/workflows\/pages\.yml@/.test(pages)) return ok("Calls the shared pages workflow.");
			return repo.has("site") || repo.has("docs/eleventy.config.js") ? gap("A site exists but pages.yml does not call the shared workflow.") : na("No site to publish.");
		},
	},
	{
		id: "renovate",
		area: "CI",
		tool: "Renovate",
		std: "Baseline renovate.json: one-month release age, monthly lockfile refresh.",
		src: "renovate.json",
		run(repo) {
			const read = (r) => r.json(".github/renovate.json") ?? r.json("renovate.json");
			const own = read(repo);
			if (!own) return gap("No renovate.json.");
			const base = repo.baseline ? read(repo.baseline) : null;
			if (base && JSON.stringify(base) !== JSON.stringify(own)) return gap("Differs from the baseline in the org repository.");
			return ok(base ? "Identical to the org baseline." : "Baseline file.");
		},
	},
	{
		id: "agents",
		area: "Docs",
		tool: "AGENTS.md",
		std: "Links the org file; Stack, Commands, Layout, Testing, Source conventions, Commits & attribution.",
		src: "AGENTS.md",
		run(repo) {
			const agents = repo.read("AGENTS.md");
			if (agents == null) return gap(repo.has("CLAUDE.md") ? "No AGENTS.md; only CLAUDE.md." : "No AGENTS.md.");
			if (!repo.baseline) return ok("Org file with Testing & Repository configuration sections.");
			const missing = ["Stack", "Commands", "Layout", "Testing", "Source conventions", "Commits"].filter((h) => !new RegExp(`^## ${h}`, "m").test(agents));
			if (!/allonsy-studio\/\.github\/blob\/main\/AGENTS\.md/.test(agents)) missing.unshift("link to the org file");
			return missing.length ? gap(`Missing: ${joinList(missing, 6)}.`) : ok("Links the org file & carries every standard section.");
		},
	},
	{
		id: "readme",
		area: "Docs",
		tool: "README & Weaver blocks",
		std: "Weaver-managed header, contribution, license, funding, & footer blocks; contribution links resolve.",
		src: "README.md · templates/",
		run(repo) {
			const template = repo.read("templates/contribution.md");
			const relative = /\]\((\.github\/(?:CONTRIBUTING|CODE_OF_CONDUCT)\.md)\)/g;
			if (template != null) {
				const broken = [...template.matchAll(relative)].map((m) => m[1]).filter((p) => !repo.has(p));
				return broken.length ? gap(`templates/contribution.md links ${joinList(broken)} relatively; repos without local copies get dead links.`) : ok("templates/contribution.md uses absolute URLs.");
			}
			const readme = repo.read("README.md") ?? "";
			if (!/weaver:/.test(readme)) return na("No Weaver blocks in the README.");
			const broken = [...readme.matchAll(relative)].map((m) => m[1]).filter((p) => !repo.has(p));
			return broken.length ? gap(`The contribution links point at ${joinList([...new Set(broken)])}, which this repository does not contain.`) : ok("Weaver blocks link to files that exist.");
		},
	},
	{
		id: "env-example",
		area: "Config",
		tool: ".env.example",
		std: "Lists every variable the repository reads.",
		src: ".env.example",
		run(repo) {
			const example = repo.read(".env.example");
			if (example == null) return gap("No .env.example.");
			const used = new Set();
			for (const file of standardFiles(repo)) {
				for (const match of (repo.read(file) ?? "").matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) if (!AMBIENT_ENV.has(match[1])) used.add(match[1]);
			}
			const missing = [...used].filter((name) => !new RegExp(`\\b${name}\\b`).test(example));
			if (missing.length) return gap(`.env.example does not list ${joinList(missing)}.`);
			return ok(used.size ? `Lists ${joinList([...used])}.` : "No variables are read.");
		},
	},
];
