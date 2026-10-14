// The site facts resolved from a project's package.json into _data/site.js when the scaffold runs.

import hostedGitInfo from "hosted-git-info";
import { minVersion, validRange } from "semver";

import { CONFIG_KEY } from "./settings.js";
import { repositoryOf } from "./scope.js";

/** Host serving every studio project site, one path per repo. */
const PAGES_HOST = "https://projects.allons-y.studio";

/** Lowest major in an engines range, as `24+`; null when unbounded. */
function minimumVersion(range) {
	if (!validRange(range)) return null;
	const { major } = minVersion(range);
	return major ? `${major}+` : null;
}

/** First sentence, minus the period. */
const firstSentence = (text) => text.split(/(?<=\.)\s/)[0].replace(/\.$/, "");

/**
 * @param {Record<string, any>} pkg a parsed package.json, already checked for scope
 * @param {string} [where] the file, for error messages
 * @returns {Record<string, string | boolean | null>} values by template placeholder
 * @throws when the license or description is missing
 */
export function siteFacts(pkg, where = "package.json") {
	for (const key of ["license", "description"]) {
		if (typeof pkg[key] !== "string" || !pkg[key]) {
			throw new Error(`${where} has no \`${key}\`. The site's facts are resolved from it: set it there.`);
		}
	}
	const repo = hostedGitInfo.fromUrl(repositoryOf(pkg)).browse();
	const repoName = repo.split("/").pop();

	return {
		NAME: pkg.name.split("/").pop(),
		PACKAGE_NAME: pkg.name,
		TAGLINE: firstSentence(pkg.description),
		DESCRIPTION: pkg.description,
		STUDIO: pkg[CONFIG_KEY]?.studio !== false,
		LICENSE: pkg.license,
		LICENSE_URL: `${repo}/blob/main/LICENSE`,
		REPO: repo,
		REPO_NAME: repoName,
		NPM: pkg.private ? null : `https://www.npmjs.com/package/${pkg.name}`,
		NODE: minimumVersion(pkg.engines?.node),
		URL: `${PAGES_HOST}/${repoName}/`,
		ISSUES_URL: pkg.bugs?.url ?? `${repo}/issues`,
		CONTRIBUTING_URL: `${repo}/blob/main/.github/CONTRIBUTING.md`,
		CHANGELOG_URL: `${repo}/blob/main/CHANGELOG.md`,
	};
}
