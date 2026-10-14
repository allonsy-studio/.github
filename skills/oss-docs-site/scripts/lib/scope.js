// The skill serves projects in the org that owns this checkout; others are declined.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import hostedGitInfo from "hosted-git-info";

import { SKILL_ROOT } from "./layers.js";

const repositoryOf = (pkg) => (typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url);

/** The org is the GitHub owner in the root `package.json` of the checkout this skill lives in. */
function checkoutOrg() {
	const file = path.resolve(SKILL_ROOT, "..", "..", "package.json");
	const raw = existsSync(file) && repositoryOf(JSON.parse(readFileSync(file, "utf8")));
	const info = raw && hostedGitInfo.fromUrl(raw);
	if (info?.type !== "github") {
		throw new Error(
			`The org is read from the "repository" in ${file}. Run this skill from a checkout of your org's .github repository.`,
		);
	}
	return info.user.toLowerCase();
}

/**
 * @param {Record<string, any>} pkg a parsed package.json
 * @param {string} [where] the file, for error messages
 * @param {string} [org] defaults to the org of this checkout
 * @throws when the repository is missing or not the org's
 */
export function assertInScope(pkg, where = "package.json", org = checkoutOrg()) {
	const raw = repositoryOf(pkg);
	if (!raw) {
		throw new Error(
			`${where} has no \`repository\`. This skill only builds sites for ${org} projects, so it needs one to check: github.com/${org}/<name>.`,
		);
	}
	const info = hostedGitInfo.fromUrl(raw);
	if (info?.type !== "github" || info.user.toLowerCase() !== org) {
		throw new Error(
			`${pkg.name ?? where} is outside this skill's scope: its repository is ${info ? `${info.user}/${info.project}` : raw}, not ${org}. Nothing was written.`,
		);
	}
}
