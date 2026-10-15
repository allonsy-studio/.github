// Studio layer data. Locked: do not edit in a project.
// Text & links come from the studio website, cached for a day; images are the local copies the scaffold writes.

import Fetch from "@11ty/eleventy-fetch";

const IMG = "/assets/img/studio";

export default async function () {
	const meta = await Fetch("https://allons-y.studio/api/meta.json", { duration: "1d", type: "json" });
	return {
		...meta,
		banner: { ...meta.banner, src: `${IMG}/oss-banner.svg` },
		footer: { ...meta.footer, light: `${IMG}/oss-footer-light.svg`, dark: `${IMG}/oss-footer-dark.svg` },
		mark: { src: `${IMG}/mark.svg`, width: 72, height: 72 },
		// A response from before the call to action took actions has none: email is the fallback.
		cta: { ...meta.cta, actions: meta.cta.actions ?? [{ label: "Email the studio", href: `mailto:${meta.contact}` }] },
	};
}
