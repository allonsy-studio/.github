// The package.json fields the site build reads through buildSite. Checked up front so a
// missing one fails the scaffold, not the first build.

/**
 * @param {Record<string, any>} pkg a parsed package.json, already checked for scope
 * @param {string} [where] the file, for error messages
 * @throws when the name, license, or description is missing
 */
export function assertSiteFields(pkg, where = "package.json") {
	for (const key of ["name", "license", "description"]) {
		if (typeof pkg[key] !== "string" || !pkg[key]) {
			throw new Error(`${where} has no \`${key}\`. The site's facts are read from it: set it there.`);
		}
	}
}
