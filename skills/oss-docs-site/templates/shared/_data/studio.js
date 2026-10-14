// Studio layer data. Locked: do not edit in a project.
// Text & links come from the studio website, cached for a day; images are the local copies the scaffold writes.

import Fetch from "@11ty/eleventy-fetch";

const IMG = "/assets/img/studio";
const DISCOVERY_URL = "https://scheduler.zoom.us/allonsy-studio/discovery";

export default async function () {
	const meta = await Fetch("https://allons-y.studio/api/meta.json", { duration: "1d", type: "json" });
	return {
		...meta,
		banner: { ...meta.banner, src: `${IMG}/oss-banner.svg` },
		footer: { ...meta.footer, light: `${IMG}/oss-footer-light.svg`, dark: `${IMG}/oss-footer-dark.svg` },
		mark: { src: `${IMG}/mark.svg`, width: 72, height: 72 },
		cta: {
			eyebrow: meta.name,
			title: "Let's build something great together",
			body: "A front-end & design systems studio helping teams ship consistent, accessible UI faster.",
			actions: [
				{ label: "Book a discovery call", href: DISCOVERY_URL },
				{ label: "Email the studio", href: `mailto:${meta.contact}` },
			],
		},
	};
}
