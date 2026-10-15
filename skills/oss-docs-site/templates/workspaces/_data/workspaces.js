// One entry per workspace of the repository: its package.json & its page,
// the workspace's SKILL.md or else its README.md, plus its icon & wordmark
// when content/assets/img/packages/ holds <slug>.svg or <slug>-wordmark.svg.

import { existsSync, globSync, readFileSync } from "node:fs";
import path from "node:path";

import markdownIt from "markdown-it";

import { highlightFences } from "../utilities/highlight.js";

// Two levels up from <site>/_data.
const root = path.resolve(import.meta.dirname, "..", "..");
const packageImages = path.resolve(import.meta.dirname, "..", "content", "assets", "img", "packages");
const image = (name) => (existsSync(path.join(packageImages, name)) ? `/assets/img/packages/${name}` : "");
const md = markdownIt();
highlightFences(md);

const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const manifests = (patterns) =>
	globSync(patterns.map((pattern) => `${pattern}/package.json`), {
		cwd: root,
		exclude: (name) => name === "node_modules",
	});

/** Front matter & the first heading come off: the page has its own title. */
const body = (text) => text.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^\s*# .*\n/, "");

export default function () {
	const { workspaces = [] } = read(path.join(root, "package.json"));
	const patterns = Array.isArray(workspaces) ? workspaces : (workspaces.packages ?? []);
	const excluded = new Set(manifests(patterns.filter((p) => p.startsWith("!")).map((p) => p.slice(1))));
	return manifests(patterns.filter((p) => !p.startsWith("!")))
		.filter((file) => !excluded.has(file))
		.sort()
		.map((file) => {
			const pkg = read(path.join(root, file));
			const dir = path.join(root, path.dirname(file));
			const source = ["SKILL.md", "README.md"].map((name) => path.join(dir, name)).find(existsSync);
			const slug = pkg.name.split("/").pop();
			return {
				name: pkg.name,
				title: pkg.name,
				description: pkg.description,
				slug,
				url: `/${slug}/`,
				icon: image(`${slug}.svg`),
				wordmark: image(`${slug}-wordmark.svg`),
				html: source ? md.render(body(readFileSync(source, "utf8"))) : "",
			};
		});
}
