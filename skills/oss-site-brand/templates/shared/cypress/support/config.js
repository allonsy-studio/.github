/** Media features each audited mode emulates. */
export const MODES = {
	light: [{ name: "prefers-color-scheme", value: "light" }],
	dark: [{ name: "prefers-color-scheme", value: "dark" }],
	// Windows high contrast.
	"forced-colors": [
		{ name: "forced-colors", value: "active" },
		{ name: "prefers-color-scheme", value: "light" },
	],
};

export const A11Y_MODES = Object.keys(MODES);

export const VIEWPORTS = {
	desktop: [1280, 800],
	mobile: [390, 844],
};

/** WCAG 2.2 AA rule sets. */
export const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
