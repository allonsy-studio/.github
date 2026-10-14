// Studio layer data. Locked: do not edit in a project.
// Fetched from the studio website & cached for a day; the bundled values fill any gaps or an offline build.

import Fetch from "@11ty/eleventy-fetch";

const ENDPOINT = "https://allons-y.studio/api/meta.json";

const bundled = Object.freeze({
	name: "Allons-y Studio",
	url: "https://allons-y.studio",
	// Sales call to action, footer only.
	contact: "contact@allons-y.studio",
	// Conduct & vulnerability reports.
	conductUrl: "https://github.com/allonsy-studio/.github/blob/main/CODE_OF_CONDUCT.md",
	securityUrl: "https://github.com/allonsy-studio/.github/blob/main/SECURITY.md",
	banner: Object.freeze({
		src: "/assets/img/studio/oss-banner.svg",
		alt: "Brought to you by Allons-y Studio",
		width: 1600,
		height: 64,
	}),
	footer: Object.freeze({
		light: "/assets/img/studio/oss-footer-light.svg",
		dark: "/assets/img/studio/oss-footer-dark.svg",
		alt: "Brought to you by Allons-y Studio",
		width: 440,
		height: 75,
	}),
	cta: Object.freeze({
		title: "Work with Allons-y Studio",
		body: "Design systems, front-end engineering, & accessibility consulting for teams that depend on open source.",
	}),
});

export default async function () {
	try {
		return { ...bundled, ...(await Fetch(ENDPOINT, { duration: "1d", type: "json" })) };
	} catch (error) {
		console.warn(`Studio data: using the bundled values (${error.message})`);
		return bundled;
	}
}
