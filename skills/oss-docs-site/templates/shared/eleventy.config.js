// Core Eleventy config, shared by every project: project values belong in: _data/project.json
//
// Build:  PATH_PREFIX=/my-project/ eleventy --config=docs/eleventy.config.js
// PATH_PREFIX is the path the site is served from (default "/").

import path from "node:path";

import { HtmlBasePlugin } from "@11ty/eleventy";
import webc from "@11ty/eleventy-plugin-webc";

import { highlightFences, tokenRanges } from "./utilities/highlight.js";

// Anchored to this file so the build runs from the repository root or docs/.
const here = path.relative(process.cwd(), import.meta.dirname) || ".";
const at = (...parts) => path.posix.join(here.split(path.sep).join("/"), ...parts);

const pathPrefix = process.env.PATH_PREFIX || "/";

/** @param {import("@11ty/eleventy").UserConfig} config */
export default function (config) {
	config.setDataFileBaseName("index");
	config.ignores.add("README.md");
	config.ignores.add("**/AGENTS.md");

	config.addPlugin(webc, { components: at("_includes/*.webc") });

	// Prefix root-relative URLs with PATH_PREFIX.
	config.addPlugin(HtmlBasePlugin);

	config.addJavaScriptFunction("tokenRanges", tokenRanges);
	config.amendLibrary("md", highlightFences);

	config.addJavaScriptFunction("adjacent", (pages, current) => {
		const index = pages.findIndex((page) => page.url === current.url);
		return { prev: pages[index - 1], next: pages[index + 1] };
	});

	return {
		pathPrefix,
		dir: {
			input: at("content"),
			output: at("{{OUTPUT_DIR}}"),
			includes: at("_includes"),
			layouts: at("_layouts"),
			data: at("_data"),
		},
		templateFormats: ["md", "webc"],
	};
}
