/**
 * SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Allons-y Studio
 */

import test from "ava";
import { HEADER, runCheck } from "./helpers.js";

const CI_BOTH = "jobs:\n  check:\n    steps:\n      - uses: actions/setup-node@v6\n        with:\n          node-version-file: ${{ matrix.node-version-file }}\n          node-version: 24\n      - run: yarn lint\n      - run: yarn test\n";

test("node passes with .nvmrc 26, engines >=24, & a Node 24 job", (t) => {
	const [status] = runCheck("node", { ".nvmrc": "26\n", "package.json": { engines: { node: ">=24" } }, ".github/workflows/ci.yml": CI_BOTH });
	t.is(status, "ok");
});

test("node lists each way the setup misses the standard", (t) => {
	const [status, state] = runCheck("node", { ".nvmrc": "24\n", "package.json": { engines: { node: ">=22" } } });
	t.is(status, "gap");
	t.regex(state, /\.nvmrc is 24/);
	t.regex(state, /engines\.node is >=22/);
	t.regex(state, /no Node 24 job/);
});

test("esm names the .mjs files it finds", (t) => {
	const [status, state] = runCheck("esm", { "package.json": { type: "module" }, "config/site.mjs": "export default {};\n" });
	t.is(status, "gap");
	t.regex(state, /config\/site\.mjs/);
});

test("root-name accepts the org exception only in the org repository", (t) => {
	t.is(runCheck("root-name", { "package.json": { name: "@allons-y/core", private: true } }, { name: ".github" })[0], "ok");
	t.is(runCheck("root-name", { "package.json": { name: "@allons-y/core", private: true } }, { name: "webc-docs" })[0], "gap");
	t.is(runCheck("root-name", { "package.json": { name: "webc-docs", private: true } }, { name: "webc-docs" })[0], "ok");
});

test("root-name allows a scope when the root is the published package", (t) => {
	const [status, state] = runCheck("root-name", { "package.json": { name: "@allons-y/envoy" } }, { name: "envoy" });
	t.is(status, "ok");
	t.regex(state, /published package/);
});

test("node accepts an engines floor written as >=24.0.0 & rejects one below 24", (t) => {
	const files = (engines) => ({ ".nvmrc": "26\n", "package.json": { engines: { node: engines } }, ".github/workflows/ci.yml": CI_BOTH });
	t.is(runCheck("node", files(">=24.0.0"))[0], "ok");
	t.is(runCheck("node", files(">=22"))[0], "gap");
});

test("typescript reads a root tsconfig & follows extends to a base", (t) => {
	const strict = { compilerOptions: { strict: true, module: "NodeNext", moduleResolution: "NodeNext" } };
	t.is(runCheck("typescript", { "package.json": {}, "tsconfig.json": strict, "src/a.ts": "export {};\n" })[0], "ok");
	const extended = { "package.json": {}, "tsconfig.base.json": strict, "packages/a/package.json": { name: "a" }, "packages/a/tsconfig.json": { extends: "../../tsconfig.base.json" }, "packages/a/src/a.ts": "export {};\n" };
	t.is(runCheck("typescript", extended)[0], "ok");
});

test("typescript flags a package that is not strict on NodeNext", (t) => {
	const [status, state] = runCheck("typescript", { "package.json": {}, "tsconfig.json": { compilerOptions: { strict: false } }, "src/a.ts": "export {};\n" });
	t.is(status, "gap");
	t.regex(state, /not strict on NodeNext/);
});

test("ci finds the workflow that runs tests when it is not called ci.yml", (t) => {
	const [status, state] = runCheck("ci", { ".github/workflows/testing.yml": CI_BOTH });
	t.is(status, "gap");
	t.regex(state, /^The CI workflow is testing\.yml, not ci\.yml/);
	t.notRegex(state, /no lint step|no test step/);
});

test("ci reports a repository with workflows but none that run tests", (t) => {
	const [status, state] = runCheck("ci", { ".github/workflows/release.yml": "name: Release\n" });
	t.is(status, "gap");
	t.regex(state, /No CI workflow that runs tests \(workflows: release\.yml\)/);
});

test("husky names the hooks a repository has instead of post-commit", (t) => {
	const [status, state] = runCheck("husky", { ".husky/pre-commit": "npx lint-staged\n", ".husky/commit-msg": "x\n", ".husky/common.sh": "x\n" });
	t.is(status, "gap");
	t.regex(state, /pre-commit, commit-msg|commit-msg, pre-commit/);
	t.notRegex(state, /common\.sh/);
});

test("agents notes a CLAUDE.md that stands in for AGENTS.md", (t) => {
	const [, state] = runCheck("agents", { "CLAUDE.md": "# Notes\n" }, { baseline: { "AGENTS.md": "# Org\n" } });
	t.regex(state, /only CLAUDE\.md/);
});

test("internal-ranges flags workspace: ranges between local packages", (t) => {
	const files = {
		"package.json": { name: "root", private: true },
		"packages/a/package.json": { name: "@x/a", version: "1.0.0", dependencies: { "@x/b": "workspace:^" } },
		"packages/b/package.json": { name: "@x/b", version: "1.0.0" },
	};
	const [status, state] = runCheck("internal-ranges", files);
	t.is(status, "gap");
	t.regex(state, /1 workspace: range/);
});

test("internal-ranges passes semver ranges & skips repos with no internal dependencies", (t) => {
	const semver = { "packages/a/package.json": { name: "@x/a", dependencies: { "@x/b": "^1.0.0" } }, "packages/b/package.json": { name: "@x/b" } };
	t.is(runCheck("internal-ranges", semver)[0], "ok");
	t.is(runCheck("internal-ranges", { "packages/a/package.json": { name: "@x/a" } })[0], "na");
});

test("test-runner flags node:test & accepts vitest on TypeScript packages", (t) => {
	const nodeTest = { "package.json": { name: "root" }, "skills/a/package.json": { name: "a", scripts: { test: 'node --test "test/**/*.test.js"' } } };
	t.is(runCheck("test-runner", nodeTest)[0], "gap");
	const vitest = { "package.json": { name: "root", scripts: { test: "yarn workspaces foreach -A run test" } }, "packages/a/package.json": { name: "a", scripts: { test: "vitest run" } }, "packages/a/tsconfig.json": {} };
	const [status, state] = runCheck("test-runner", vitest);
	t.is(status, "ok");
	t.regex(state, /vitest in 1 package/);
});

test("test-layout flags tests/ folders but ignores sample content", (t) => {
	t.is(runCheck("test-layout", { "skills/a/tests/a.test.js": "" })[0], "gap");
	t.is(runCheck("test-layout", { "skills/a/test/a.test.js": "", "evals/files/app/tests/x.js": "" })[0], "ok");
});

test("license-header counts files without a header & wants an enforcing rule", (t) => {
	const [status, state] = runCheck("license-header", { "test/a.test.js": HEADER + "export {};\n", "test/b.test.js": "export {};\n" });
	t.is(status, "gap");
	t.regex(state, /1 of 2 files carry no header/);
	const withRule = runCheck("license-header", { "test/a.test.js": HEADER, ".license-header.js": HEADER, "eslint.config.js": 'import h from "eslint-plugin-license-header";\n' });
	t.is(withRule[0], "ok");
});

test("lint needs typescript installed for typescript-eslint", (t) => {
	const files = { "eslint.config.js": 'import js from "@allons-y/opx-lint-js/eslint.config.js";\n', "package.json": { devDependencies: {} } };
	const [status, state] = runCheck("lint", files);
	t.is(status, "gap");
	t.regex(state, /typescript is not a dev dependency/);
	t.is(runCheck("lint", { ...files, "package.json": { devDependencies: { typescript: "^5.9.3" } } })[0], "ok");
});

test("lint-staged is a gap only when no pre-commit hook runs it", (t) => {
	t.is(runCheck("lint-staged", { "package.json": { "lint-staged": { "*": "x" } } })[0], "gap");
	t.is(runCheck("lint-staged", { "package.json": { "lint-staged": { "*": "x" } }, ".husky/pre-commit": "npx lint-staged\n" })[0], "ok");
	t.is(runCheck("lint-staged", { "package.json": {} })[0], "ok");
});

test("husky compares the hook with the org baseline", (t) => {
	const hook = "#!/usr/bin/env sh\nnpx --no-install opx lint || true\n";
	t.is(runCheck("husky", { ".husky/post-commit": hook }, { baseline: { ".husky/post-commit": hook } })[0], "ok");
	t.is(runCheck("husky", { ".husky/post-commit": hook + "echo hi\n" }, { baseline: { ".husky/post-commit": hook } })[0], "gap");
	t.is(runCheck("husky", {})[0], "gap");
});

test("opx-release is not applicable when nothing is published", (t) => {
	t.is(runCheck("opx-release", { "package.json": { private: true }, "skills/a/package.json": { name: "a", private: true } })[0], "na");
});

test("opx-release lists what a publishing repository is missing", (t) => {
	const files = { "package.json": { devDependencies: {}, scripts: { release: "yarn build && changeset publish" } }, "packages/a/package.json": { name: "@x/a" }, ".opx/config.json": {} };
	const [status, state] = runCheck("opx-release", files);
	t.is(status, "gap");
	t.regex(state, /@allons-y\/opx-release is not installed/);
	t.regex(state, /lacks "release": true/);
	t.regex(state, /no changeset script/);
	t.regex(state, /still calls changeset publish/);
});

test("ci wants the build & typecheck steps only where TypeScript exists", (t) => {
	const plain = runCheck("ci", { ".github/workflows/ci.yml": CI_BOTH });
	t.is(plain[0], "ok");
	t.regex(plain[1], /nothing builds/);
	const ts = runCheck("ci", { ".github/workflows/ci.yml": CI_BOTH, "src/index.ts": "export {};\n" });
	t.is(ts[0], "gap");
	t.regex(ts[1], /^No build, typecheck step/);
});

test("readme accepts relative contribution links whose targets exist", (t) => {
	const readme = "<!-- weaver:contribution:START -->\n[guide](.github/CONTRIBUTING.md)\n";
	t.is(runCheck("readme", { "README.md": readme })[0], "gap");
	t.is(runCheck("readme", { "README.md": readme, ".github/CONTRIBUTING.md": "# Guide\n" })[0], "ok");
	t.is(runCheck("readme", { "README.md": "# Plain\n" })[0], "na");
});

test("env-example flags variables the source reads but the file omits", (t) => {
	const files = { "src/index.js": "export const dir = process.env.STUBS_DIR;\nexport const ci = process.env.CI;\n", ".env.example": "# nothing\n" };
	const [status, state] = runCheck("env-example", files);
	t.is(status, "gap");
	t.regex(state, /STUBS_DIR/);
	t.notRegex(state, /\bCI\b/);
	t.is(runCheck("env-example", { ...files, ".env.example": "STUBS_DIR=\n" })[0], "ok");
});

test("env-example is not needed where no variable is read", (t) => {
	t.is(runCheck("env-example", { "src/index.js": "export const x = 1;\n" })[0], "na");
	t.is(runCheck("env-example", { "src/index.js": "export const x = 1;\n", ".env.example": "# none\n" })[0], "ok");
});

test("env-example flags a missing file when the source reads a variable", (t) => {
	const [status, state] = runCheck("env-example", { "test/helpers.js": "export const update = process.env.UPDATE_GOLDEN;\n" });
	t.is(status, "gap");
	t.regex(state, /^No \.env\.example; the source reads UPDATE_GOLDEN/);
});

test("agents wants the org link & every standard section outside the org repository", (t) => {
	const org = "https://github.com/allonsy-studio/.github/blob/main/AGENTS.md";
	const sections = ["Stack", "Commands", "Layout", "Testing", "Source conventions", "Commits & attribution"].map((h) => `## ${h}\n`).join("\n");
	t.is(runCheck("agents", { "AGENTS.md": `[org](${org})\n${sections}` }, { baseline: { "AGENTS.md": "# Org\n" } })[0], "ok");
	const [status, state] = runCheck("agents", { "AGENTS.md": "## Stack\n" }, { baseline: { "AGENTS.md": "# Org\n" } });
	t.is(status, "gap");
	t.regex(state, /link to the org file/);
});
