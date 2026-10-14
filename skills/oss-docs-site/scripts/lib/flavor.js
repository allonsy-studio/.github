// Flavor & tooling suggestions: confirmed by the maintainer, or applied & reported when unattended.

import { FLAVORS } from "./layers.js";

/**
 * @typedef {Object} Facts
 * @property {boolean} hasNestedDocsPages each workspace surfaced as its own product, a page each
 * @property {boolean} isSingleAction one command or function whose install & usage fit on one page
 * @property {boolean} usesTypeScript a tsconfig.json or .ts sources
 * @property {boolean} hasJavaScript .js or .mjs sources
 */

/**
 * @param {Facts} p
 * @returns {{ flavor: "workspaces" | "landing" | "docs", reason: string }}
 */
export function suggestFlavor(p) {
	if (p.hasNestedDocsPages) {
		return { flavor: "workspaces", reason: "Docs nest under workspaces." };
	}
	if (p.isSingleAction) {
		return { flavor: "landing", reason: "One action, one page." };
	}
	return { flavor: "docs", reason: "Default." };
}

/**
 * @param {Facts} p
 * @returns {{ tool: "typedoc" | "jsdoc", reason: string }[]}
 */
export function suggestTooling(p) {
	const tools = [];
	if (p.usesTypeScript) {
		tools.push({
			tool: "typedoc",
			reason: "TypeScript source: generate the API reference.",
		});
	}
	if (p.hasJavaScript) {
		tools.push({
			tool: "jsdoc",
			reason: "JavaScript resources: document them with JSDoc.",
		});
	}
	return tools;
}

function confirmationQuestion({ flavor, reason }) {
	return `Suggested flavor: ${flavor} (${reason}) Confirm, or pick landing, docs, or workspaces.`;
}

/**
 * With a person present & no `choice`, the result asks for confirmation.
 * A `choice` is their answer; with nobody present the suggestion is applied.
 *
 * @param {Facts} p
 * @param {{ userPresent: boolean, choice?: string }} ctx
 */
export function chooseSite(p, { userPresent, choice }) {
	const suggestion = { ...suggestFlavor(p), tooling: suggestTooling(p) };

	if (choice !== undefined) {
		if (!FLAVORS.includes(choice)) {
			throw new Error(
				`Unknown flavor "${choice}". Choose one of: ${FLAVORS.join(", ")}.`,
			);
		}
		return {
			...suggestion,
			flavor: choice,
			status: "applied",
			applied: true,
			confirmedBy: "maintainer",
			listedInReport: true,
			suggestedFlavor: suggestion.flavor,
		};
	}

	if (!userPresent) {
		return {
			...suggestion,
			status: "applied",
			applied: true,
			confirmedBy: "unattended",
			listedInReport: true,
			suggestedFlavor: suggestion.flavor,
		};
	}

	return {
		...suggestion,
		status: "needs-confirmation",
		applied: false,
		question: confirmationQuestion(suggestion),
	};
}

/**
 * A flavor the project already recorded: used as is, with no repository scan.
 *
 * @param {string} flavor
 */
export function useRecorded(flavor) {
	if (!FLAVORS.includes(flavor)) {
		throw new Error(`Unknown flavor "${flavor}". Choose one of: ${FLAVORS.join(", ")}.`);
	}
	return {
		flavor,
		status: "applied",
		applied: true,
		confirmedBy: "project",
		listedInReport: true,
	};
}
