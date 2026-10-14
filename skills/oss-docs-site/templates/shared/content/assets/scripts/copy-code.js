// Progressive enhancement: a copy button on each code sample.

const CONFIRMATION_MS = 2000;

/**
 * Strip a leading `$ ` prompt from each line; `$HOME` is untouched.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripPrompt(text) {
	return text
		.split("\n")
		.map((line) => line.replace(/^\$\s+/, ""))
		.join("\n");
}

function enhance(pre) {
	const button = document.createElement("button");
	button.type = "button";
	button.textContent = "Copy";
	button.setAttribute("aria-label", "Copy code to clipboard");

	const status = document.createElement("span");
	status.setAttribute("role", "status");
	pre.after(button, status);

	let timer;
	button.addEventListener("click", async () => {
		const ok = await navigator.clipboard
			.writeText(stripPrompt(pre.textContent ?? ""))
			.then(() => true, () => false);
		button.textContent = ok ? "Copied" : "Press Ctrl+C";
		status.textContent = ok ? "Copied to clipboard" : "Copy failed";
		clearTimeout(timer);
		timer = setTimeout(() => {
			button.textContent = "Copy";
			status.textContent = "";
		}, CONFIRMATION_MS);
	});
}

if (typeof document !== "undefined") {
	for (const pre of document.querySelectorAll("figure pre")) {
		enhance(pre);
	}
}
