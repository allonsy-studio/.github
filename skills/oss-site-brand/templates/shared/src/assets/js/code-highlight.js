// Colors code with the CSS Custom Highlight API, from the ranges the build wrote.
// Without support the code stays plain text.

if (typeof CSS !== "undefined" && "highlights" in CSS) {
	const groups = new Map();
	for (const code of document.querySelectorAll("code[data-tokens]")) {
		const text = code.firstChild;
		if (!text) continue;
		for (const [group, start, end] of JSON.parse(code.dataset.tokens)) {
			const range = new Range();
			range.setStart(text, start);
			range.setEnd(text, end);
			groups.set(group, [...(groups.get(group) ?? []), range]);
		}
	}
	for (const [group, ranges] of groups) {
		CSS.highlights.set(`tok-${group}`, new Highlight(...ranges));
	}
}
