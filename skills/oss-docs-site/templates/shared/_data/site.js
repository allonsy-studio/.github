// Site facts; logic lives in utilities/site.js.

import path from "node:path";

import { buildSite } from "../utilities/site.js";

export default function () {
	// Two levels up to the project root: <root>/<site>/_data.
	const root = path.resolve(import.meta.dirname, "..", "..");
	return buildSite({
		packagePath:
			process.env.SITE_PACKAGE_JSON ?? path.join(root, "package.json"),
		projectPath: path.join(import.meta.dirname, "project.json"),
	});
}
