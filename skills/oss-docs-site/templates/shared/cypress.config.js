// Named .js in "type": "module" projects; .mjs loads as ESM elsewhere.

import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import Eleventy from "@11ty/eleventy";
import { defineConfig } from "cypress";

const PORT = 8080;
const BUILD_DIR = join(import.meta.dirname, "_a11y");

const toUrl = (file) => "/" + file.split(sep).join("/").replace(/(^|\/)index\.html$/, "$1");

export default defineConfig({
	defaultBrowser: "chrome",
	e2e: {
		// Chromium family: media emulation needs it.
		baseUrl: `http://127.0.0.1:${PORT}`,
		viewportWidth: 1280,
		viewportHeight: 800,
		video: false,
		screenshotOnRunFailure: true,
		defaultCommandTimeout: 8000,
		async setupNodeEvents(on, config) {
			// Unprefixed build, served by Eleventy: a local server serves from `/`.
			// `source: "cli"` makes the output directory win over the site config's.
			process.env.PATH_PREFIX = "/";
			const eleventy = new Eleventy(undefined, relative(process.cwd(), BUILD_DIR), {
				source: "cli",
				configPath: join(import.meta.dirname, "eleventy.config.js"),
				runMode: "serve",
				quietMode: true,
			});
			await eleventy.init();
			await eleventy.write();
			// Without core.css every page is unstyled & axe fails opaquely.
			if (!existsSync(join(BUILD_DIR, "assets/styles/core.css"))) {
				throw new Error("core.css was not written to the audit build; check the eleventy.after hook.");
			}
			await eleventy.serve(PORT);
			on("after:run", () => eleventy.stopWatch());

			// Every built page.
			config.env.pages = readdirSync(BUILD_DIR, { recursive: true })
				.filter((f) => f.endsWith(".html"))
				.map(toUrl)
				.sort();

			on("task", {
				log(message) {
					console.log(message);
					return null;
				},
				table(rows) {
					if (Array.isArray(rows) && rows.length) console.table(rows);
					return null;
				},
			});

			return config;
		},
	},
});
