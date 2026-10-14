// Build-time tokenizing with Prism. The page colors the ranges with the CSS
// Custom Highlight API (assets/scripts/code-highlight.js), styled by the --tok-* tokens.

import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";

loadLanguages(["bash", "css", "diff", "json", "typescript", "yaml"]);

/** Prism token types by highlight group. */
const GROUPS = {
	comment: ["comment", "prolog", "doctype", "cdata"],
	string: ["string", "attr-value", "char", "inserted"],
	keyword: ["keyword", "atom", "important", "tag"],
	function: ["function", "class-name", "attr-name", "property", "selector"],
	number: ["number", "boolean", "constant", "symbol", "parameter"],
	punctuation: ["punctuation", "operator"],
};

const GROUP_OF = new Map(
	Object.entries(GROUPS).flatMap(([group, types]) => types.map((type) => [type, group])),
);

/**
 * Render Markdown code fences like <code-sample>: a figure with highlight ranges.
 *
 * @param {import("markdown-it")} md
 */
export function highlightFences(md) {
	md.renderer.rules.fence = (tokens, idx) => {
		const { content, info } = tokens[idx];
		const ranges = tokenRanges(content, info.trim().split(/\s+/)[0]);
		const attribute = ranges ? ` data-tokens="${md.utils.escapeHtml(ranges)}"` : "";
		return `<figure><pre tabindex="0"><code${attribute}>${md.utils.escapeHtml(content)}</code></pre></figure>\n`;
	};
}

/**
 * @param {string} code
 * @param {string} [language]
 * @returns {string | undefined} JSON `[group, start, end][]` of character offsets; undefined when there are none
 */
export function tokenRanges(code, language = "") {
	const grammar = Prism.languages[language];
	if (!grammar) return undefined;
	const ranges = [];
	const walk = (tokens, inherited, at) => {
		for (const token of tokens) {
			if (typeof token === "string") {
				if (inherited) ranges.push([inherited, at, at + token.length]);
				at += token.length;
				continue;
			}
			const types = [token.type, ...[].concat(token.alias ?? [])];
			const group = types.map((type) => GROUP_OF.get(type)).find(Boolean) ?? inherited;
			at = walk([].concat(token.content), group, at);
		}
		return at;
	};
	walk(Prism.tokenize(code, grammar), undefined, 0);
	return ranges.length ? JSON.stringify(ranges) : undefined;
}
