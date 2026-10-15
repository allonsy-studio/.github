// Site facts, resolved from package.json when the scaffold ran: edit them here.

import { readFileSync } from "node:fs";
import Fetch from "@11ty/eleventy-fetch";
import project from "./project.json" with { type: "json" };

/**
 * Whether the package has a release on npm, so the footer badges have something to show.
 * A missing package, or no network, counts as no release.
 *
 * @param {string} name package name
 * @returns {Promise<boolean>}
 */
async function hasNpmRelease(name) {
	try {
		const info = await Fetch(`https://registry.npmjs.org/${name}`, { duration: "1h", type: "json" });
		return Boolean(info["dist-tags"]?.latest);
	} catch {
		return false;
	}
}

/**
 * The project accent as a bare hex for badge URLs, read from project.css.
 *
 * @returns {string}
 */
function accentHex() {
	const css = readFileSync(new URL("../content/assets/styles/project.css", import.meta.url), "utf8");
	return css.match(/--accent:\s*#([0-9a-f]{6})\b/i)?.[1] ?? "2346d4";
}

const site = {
	name: "{{NAME}}",
	packageName: "{{PACKAGE_NAME}}",
	tagline: project.tagline ?? "{{TAGLINE}}",
	description: "{{DESCRIPTION}}",
	studio: "{{STUDIO}}",
	license: "{{LICENSE}}",
	licenseUrl: "{{LICENSE_URL}}",
	repo: "{{REPO}}",
	repoName: "{{REPO_NAME}}",
	npm: "{{NPM}}",
	node: "{{NODE}}",
	url: (project.url ?? "{{URL}}").replace(/\/?$/, "/"),
	issuesUrl: "{{ISSUES_URL}}",
	contributingUrl: "{{CONTRIBUTING_URL}}",
	changelogUrl: "{{CHANGELOG_URL}}",
};

export default async function () {
	return { ...site, npmRelease: await hasNpmRelease(site.packageName), badgeColor: accentHex() };
}
