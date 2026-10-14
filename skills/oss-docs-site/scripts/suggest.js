#!/usr/bin/env node
// Suggest a site flavor & documentation tooling from the repository, as JSON.
// Nothing is applied on a guess: pass --choose with the answer, or
// --unattended to apply the suggestion.
//
// Usage:
//   node scripts/suggest.js [--repo .] [--unattended] [--choose landing|docs|workspaces]
//                           [--reconsider] [--nested-docs yes|no] [--single-action yes|no]

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { readRepoFacts } from "./lib/facts.js";
import { assertInScope } from "./lib/scope.js";
import { CONFIG_KEY, readSiteConfig } from "./lib/settings.js";
import { chooseSite, useRecorded } from "./lib/flavor.js";

const EXISTING_SITE_QUESTION =
	"Does a website already exist for this project that isn't built with 11ty? If so, this is a rework: build beside it (references/scenarios.md).";

/** @param {string | undefined} value `yes`, `no`, or unset */
function yesNo(value) {
	if (value === undefined) return undefined;
	if (value === "yes") return true;
	if (value === "no") return false;
	throw new Error(`Expected yes or no, found "${value}".`);
}

/**
 * A recorded flavor is used without asking or scanning; `reconsider` scans anyway & `choose` overrides it.
 *
 * @param {{
 *   repo?: string,
 *   unattended?: boolean,
 *   choose?: string,
 *   reconsider?: boolean,
 *   nestedDocs?: string,
 *   singleAction?: string,
 * }} options
 */
export function suggest({
	repo = ".",
	unattended = false,
	choose,
	reconsider = false,
	nestedDocs,
	singleAction,
}) {
	const packagePath = path.resolve(repo, "package.json");
	const pkg = existsSync(packagePath) ? JSON.parse(readFileSync(packagePath, "utf8")) : undefined;
	if (pkg) assertInScope(pkg, packagePath);
	const config = pkg && readSiteConfig(pkg);
	const recorded = config?.flavor;

	// A recorded flavor settles it: no scan, unless asked to reconsider or choose.
	if (recorded !== undefined && choose === undefined && !reconsider) {
		return {
			project: pkg.name ?? path.basename(path.resolve(repo)),
			scenario: "migrate",
			recordedFlavor: recorded,
			...useRecorded(recorded),
			note: "Recorded flavor used. Rerun with --reconsider to compare it with a fresh suggestion.",
		};
	}

	const facts = readRepoFacts(repo, {
		nestedDocsPages: yesNo(nestedDocs) ?? config?.signals.nestedDocs,
		singleAction: yesNo(singleAction) ?? config?.signals.singleAction,
	});
	const result = chooseSite(facts, { userPresent: !unattended, choice: choose });

	// migrate: built with this skill; otherwise new, unless the answer to the question is a rework.
	const scenario = pkg?.[CONFIG_KEY] !== undefined ? "migrate" : "new";

	const out = { project: facts.name, scenario, signals: facts.signals, ...result };
	if (scenario === "new" && !unattended) out.existingSiteQuestion = EXISTING_SITE_QUESTION;
	if (recorded !== undefined) out.recordedFlavor = recorded;
	if (recorded !== undefined && result.flavor !== recorded && result.applied) out.switchFrom = recorded;
	return out;
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	try {
		const { values } = parseArgs({
			options: {
				repo: { type: "string" },
				unattended: { type: "boolean", default: false },
				choose: { type: "string" },
				reconsider: { type: "boolean", default: false },
				"nested-docs": { type: "string" },
				"single-action": { type: "string" },
			},
		});
		console.log(
			JSON.stringify(
				suggest({
					repo: values.repo,
					unattended: values.unattended,
					choose: values.choose,
					reconsider: values.reconsider,
					nestedDocs: values["nested-docs"],
					singleAction: values["single-action"],
				}),
				null,
				2,
			),
		);
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}
