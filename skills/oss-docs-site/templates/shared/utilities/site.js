// Site facts derived from the project's package.json. In lib/, not _data/:
// Eleventy merges a data file's named exports into the data.

import { readFileSync } from "node:fs";

import hostedGitInfo from "hosted-git-info";
import { minVersion, validRange } from "semver";

/** Host serving every studio project site, one path per repo. */
const PAGES_HOST = "https://projects.allons-y.studio";

/**
 * Normalize `repository` to a plain https URL.
 *
 * @param {string | { url?: string }} repository
 * @returns {string}
 */
function normalizeRepository(repository) {
	const raw = typeof repository === "string" ? repository : repository?.url;
	if (!raw) {
		throw new Error(
			"package.json needs a `repository` so the site can link to it.",
		);
	}
	const info = hostedGitInfo.fromUrl(raw);
	return info ? info.browse() : raw.replace(/^git\+/, "").replace(/\.git$/, "");
}

/** Lowest major in an engines range, as `24+`; null when unbounded. */
function minimumVersion(range) {
	if (!validRange(range)) return null;
	const { major } = minVersion(range);
	return major ? `${major}+` : null;
}

/** First sentence, minus the period. */
function firstSentence(text) {
	const sentence = text.split(/(?<=\.)\s/)[0];
	return sentence.replace(/\.$/, "");
}

/**
 * @param {{ packagePath: string, projectPath: string }} paths
 */
export function buildSite({ packagePath, projectPath }) {
	const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
	const project = JSON.parse(readFileSync(projectPath, "utf8"));

	if (typeof pkg.license !== "string" || !pkg.license) {
		throw new Error(
			`${packagePath} has no \`license\`. The site reads the license from package.json; set it there.`,
		);
	}
	if (typeof pkg.description !== "string" || !pkg.description) {
		throw new Error(
			`${packagePath} has no \`description\`. The site reads its description from package.json.`,
		);
	}

	const repo = normalizeRepository(pkg.repository);
	const repoName = repo.split("/").pop();
	const name = pkg.name.split("/").pop();
	const url = (project.url ?? `${PAGES_HOST}/${repoName}/`).replace(
		/\/?$/,
		"/",
	);

	return {
		name,
		packageName: pkg.name,
		tagline: project.tagline ?? firstSentence(pkg.description),
		description: pkg.description,
		studio: pkg?.["oss-docs"]?.studio !== false,
		license: pkg.license,
		licenseUrl: `${repo}/blob/main/LICENSE`,
		repo,
		repoName,
		npm: pkg.private ? null : `https://www.npmjs.com/package/${pkg.name}`,
		node: minimumVersion(pkg.engines?.node),
		url,
		issuesUrl: pkg.bugs?.url ?? `${repo}/issues`,
		contributingUrl: `${repo}/blob/main/.github/CONTRIBUTING.md`,
		changelogUrl: `${repo}/blob/main/CHANGELOG.md`,
	};
}
