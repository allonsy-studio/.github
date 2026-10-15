// Studio layer data. Locked: do not edit in a project.
// Text & links come from the studio website, cached for a day; images are the local copies the scaffold writes.

import Fetch from "@11ty/eleventy-fetch";

const IMG = "/assets/img/studio";

/**
 * @param {string} text
 * @returns {string}
 */
const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Call to action text as HTML, with the studio name set in the signature font.
 *
 * @param {string} text
 * @param {string} name studio name
 * @returns {string}
 */
function sign(text, name) {
	const at = name ? text.indexOf(name) : -1;
	if (at < 0) return escapeHtml(text);
	return `${escapeHtml(text.slice(0, at))}<span data-signature>${escapeHtml(name)}</span>${escapeHtml(text.slice(at + name.length))}`;
}

export default async function () {
	const meta = await Fetch("https://allons-y.studio/api/meta.json", { duration: "1d", type: "json" });
	return {
		...meta,
		banner: { ...meta.banner, src: `${IMG}/oss-banner.svg` },
		footer: { ...meta.footer, light: `${IMG}/oss-footer-light.svg`, dark: `${IMG}/oss-footer-dark.svg` },
		mark: { src: `${IMG}/mark.svg`, width: 72, height: 72 },
		// A response from before the call to action took actions has none: email is the fallback.
		cta: {
			...meta.cta,
			eyebrowHtml: meta.cta.eyebrow && sign(meta.cta.eyebrow, meta.name),
			titleHtml: sign(meta.cta.title, meta.name),
			actions: meta.cta.actions ?? [{ label: "Email the studio", href: `mailto:${meta.contact}` }],
		},
	};
}
