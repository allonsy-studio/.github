import js from "@allons-y/opx-lint-js/eslint.config.js";
import json from "@allons-y/opx-lint-json/eslint.config.js";
import md from "@allons-y/opx-lint-md/eslint.config.js";

export default [
	...js,
	...json,
	...md,
	// Org templates: placeholders & task lists the Markdown rules misread.
	{ ignores: ["PULL_REQUEST_TEMPLATE.md", "ISSUE_TEMPLATE/**", "templates/**"] },
	{
		files: ["skills/oss-docs-site/templates/shared/content/assets/scripts/**/*.js"],
		languageOptions: { globals: { CSS: "readonly", document: "readonly", Highlight: "readonly", Range: "readonly" } },
	},
	{
		files: ["skills/oss-docs-site/templates/shared/cypress/**/*.js"],
		languageOptions: {
			globals: { cy: "readonly", Cypress: "readonly", describe: "readonly", it: "readonly" },
		},
	},
];
