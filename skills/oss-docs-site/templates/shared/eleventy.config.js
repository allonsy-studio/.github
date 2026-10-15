// Core Eleventy config, shared by every project: project values belong in: _data/project.json
//
// Build:  PATH_PREFIX=/my-project/ eleventy --config=docs/eleventy.config.js
// PATH_PREFIX is the path the site is served from (default "/").

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { HtmlBasePlugin } from "@11ty/eleventy";
import webc from "@11ty/eleventy-plugin-webc";

import { highlightFences, scrollTables, tokenRanges } from "./utilities/highlight.js";
import { faIcon, iconType } from "./utilities/icons.js";

// Anchored to this file so the build runs from the repository root or docs/.
const here = path.relative(process.cwd(), import.meta.dirname) || ".";
const at = (...parts) => path.posix.join(here.split(path.sep).join("/"), ...parts);

const pathPrefix = process.env.PATH_PREFIX || "/";

// Core sheets, bundled into assets/styles/core.css in this order (tokens first: it declares the cascade layers); project.css stays separate.
const CORE_SHEETS = ["tokens", "reset", "layout", "components", "studio"];

/** @param {import("@11ty/eleventy").UserConfig} config */
export default function (config) {
	config.setDataFileBaseName("index");
	config.ignores.add("README.md");
	config.ignores.add("**/AGENTS.md");

	config.addPlugin(webc, { components: at("_includes/*.webc") });

	// Prefix root-relative URLs with PATH_PREFIX.
	config.addPlugin(HtmlBasePlugin);

	config.addJavaScriptFunction("tokenRanges", tokenRanges);
	config.addJavaScriptFunction("faIcon", faIcon);
	config.addJavaScriptFunction("iconType", iconType);
	config.amendLibrary("md", (md) => md.use(highlightFences).use(scrollTables));

	// Pages on the docs layout, in order, & the pages around one.
	config.addCollection("docs", (api) =>
		api
			.getAll()
			.filter((page) => page.data.layout === "docs.webc")
			.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0) || a.inputPath.localeCompare(b.inputPath)),
	);
	config.addJavaScriptFunction("adjacent", (pages, current) => {
		const index = pages.findIndex((page) => page.url === current.url);
		return { prev: pages[index - 1], next: pages[index + 1] };
	});

	config.addPassthroughCopy(
		{ [at("content/assets")]: "assets" },
		{ filter: ["**/*", `!styles/{${CORE_SHEETS.join(",")}}.css`] },
	);
	config.addWatchTarget(at("content/assets/styles"));
	// `directories.output` is where this build writes (the audit overrides it); `dir.output` is only the config's.
	config.on("eleventy.after", ({ directories }) => {
		const out = path.join(directories.output, "assets/styles");
		mkdirSync(out, { recursive: true });
		const core = CORE_SHEETS.map((name) => readFileSync(at("content/assets/styles", `${name}.css`), "utf8"));
		writeFileSync(path.join(out, "core.css"), core.join("\n"));
	});

	return {
		pathPrefix,
		dir: {
			input: at("content"),
			output: at("{{OUTPUT_DIR}}"),
			// Relative to the input directory.
			includes: "../_includes",
			layouts: "../_layouts",
			data: "../_data",
		},
		templateFormats: ["md", "webc"],
	};
}
