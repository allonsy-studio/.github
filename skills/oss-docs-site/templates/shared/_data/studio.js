// Studio layer data. Locked: do not edit in a project.
// Fetched from the studio website & cached for a day.

import Fetch from "@11ty/eleventy-fetch";

export default function () {
	return Fetch("https://allons-y.studio/api/meta.json", { duration: "1d", type: "json" });
}
