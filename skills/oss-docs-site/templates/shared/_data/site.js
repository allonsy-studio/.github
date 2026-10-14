// Site facts, resolved from package.json when the scaffold ran: edit them here.

import project from "./project.json" with { type: "json" };

export default {
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
