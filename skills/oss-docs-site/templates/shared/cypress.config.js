// Named .js in "type": "module" projects; .mjs loads as ESM elsewhere.

import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import Eleventy from "@11ty/eleventy";
import { defineConfig } from "cypress";

const PORT = 8080;
const BUILD_DIR = join(import.meta.dirname, "_a11y");

/** @param {string} dir */
const hasBundleCss = (dir) => existsSync(dir) && readdirSync(dir).some((f) => f.endsWith(".css"));

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
			// The output is set through the site config: the bundle plugin ignores an API override.
			process.env.PATH_PREFIX = "/";
			process.env.ELEVENTY_OUTPUT_DIR = relative(process.cwd(), BUILD_DIR).split(sep).join("/");
			const eleventy = new Eleventy(undefined, undefined, {
				configPath: join(import.meta.dirname, "eleventy.config.js"),
				runMode: "serve",
				quietMode: true,
			});
			await eleventy.init();
			await eleventy.write();
			// Without these the audit sees unstyled pages & axe fails opaquely.
			if (!existsSync(join(BUILD_DIR, "assets/styles/project.css"))) {
				throw new Error("The project styles were not copied to the audit build; check the passthrough copy.");
			}
			if (!hasBundleCss(join(BUILD_DIR, "bundle"))) {
				throw new Error(
					"The component bundle (bundle/*.css) is missing from the audit build: the bundle plugin writes to the config's output directory, so set it through ELEVENTY_OUTPUT_DIR, not the Eleventy API.",
				);
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
