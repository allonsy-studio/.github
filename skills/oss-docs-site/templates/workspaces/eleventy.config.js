// Site config. The OSS site plugin adds the Norn plugin, its layouts, & the studio layer.
// Build:  PATH_PREFIX=/my-project/ eleventy --config={{SITE_DIR}}/eleventy.config.js
// PATH_PREFIX is the path the site is served from (default "/").

import fs from "node:fs";
import path from "node:path";

import { HtmlBasePlugin } from "@11ty/eleventy";
import norn, { fillHooks, reset } from "@allons-y/webc-patterns/plugin";
import oss, { ossEnabled, ossProps } from "@allons-y/webc-oss-site";

// Anchored to this file so the build runs from the repository root or the site directory.
const here = path.relative(process.cwd(), import.meta.dirname) || ".";
const at = (...parts) => path.posix.join(here.split(path.sep).join("/"), ...parts);

// The studio layer stays on unless package.json sets "oss-docs": { "oss": false }.
const withOss = ossEnabled({ packagePath: path.resolve(import.meta.dirname, "{{PACKAGE_PATH}}") });

/** @param {import("@11ty/eleventy").UserConfig} config */
export default function (config) {
	config.addPlugin(withOss ? oss : norn, {
		props: (data) => ({
			...ossProps(data.site, data.project, { oss: withOss }),
			title: data.title,
			workspaces: data.workspaces,
			workspace: data.workspace,
			ogImage: data.project?.ogImage && { src: `assets/img/${data.project.ogImage}`, alt: data.site?.name },
		}),
		// Components of the project's own go in _includes/. Give them a prefix other than norn- & oss-.
		components: [at("_includes/*.webc")],
	});
	fillHooks(config, {
		head: [`<style>${fs.readFileSync(reset, "utf8")}</style>`, '<link rel="stylesheet" href="/assets/styles/project.css" webc:keep />'].join("\n"),
	});
	config.addPlugin(HtmlBasePlugin);

	config.addPassthroughCopy({ [at("content/assets")]: "assets" });

	return {
		pathPrefix: process.env.PATH_PREFIX || "/",
		dir: { input: at("content"), output: at("{{OUTPUT_DIR}}"), includes: "../_includes", layouts: "../_layouts", data: "../_data" },
		templateFormats: ["md", "webc"],
		markdownTemplateEngine: false,
	};
}
