// Core Eleventy config, shared by every project: project values belong in
// src/_data/project.json.
//
// Build:  PATH_PREFIX=/my-project/ eleventy --config=docs/eleventy.config.js
// PATH_PREFIX is the path the site is served from (default "/").

import path from "node:path";

import { HtmlBasePlugin } from "@11ty/eleventy";
import webc from "@11ty/eleventy-plugin-webc";

import { highlightFences, tokenRanges } from "./lib/highlight.js";

// Anchored to this file so the build runs from the repository root or docs/.
const here = path.relative(process.cwd(), import.meta.dirname) || ".";
const at = (...parts) => path.posix.join(here.split(path.sep).join("/"), ...parts);

const pathPrefix = process.env.PATH_PREFIX || "/";

/** @param {import("@11ty/eleventy").UserConfig} config */
export default function (config) {
	config.addPlugin(webc, { components: at("src/_components/**/*.webc") });
	// Prefix root-relative URLs with PATH_PREFIX.
	config.addPlugin(HtmlBasePlugin);

	config.addJavaScriptFunction("tokenRanges", tokenRanges);
	config.amendLibrary("md", highlightFences);

	// Docs pages in order, & the pages around one.
	config.addCollection("docs", (api) =>
		api
			.getFilteredByGlob(at("src/docs/**/*.md"))
			.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0) || a.inputPath.localeCompare(b.inputPath)),
	);
	config.addJavaScriptFunction("adjacent", (pages, current) => {
		const index = pages.findIndex((page) => page.url === current.url);
		return { prev: pages[index - 1], next: pages[index + 1] };
	});

	// Component comments stay out of the page.
	config.addTransform("strip-comments", function (content) {
		return this.page.outputPath?.endsWith(".html")
			? content.replace(/<!--[\s\S]*?-->/g, "")
			: content;
	});

	config.addPassthroughCopy({ [at("src/assets")]: "assets" });

	return {
		pathPrefix,
		dir: {
			input: at("src"),
			output: at("{{OUTPUT_DIR}}"),
			includes: "_includes",
			data: "_data",
		},
		templateFormats: ["md", "webc"],
	};
}
