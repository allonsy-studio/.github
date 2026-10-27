// One page per workspace. A function permalink, because Markdown here has no template engine.

export default {
	layout: "norn-workspace.webc",
	pagination: { data: "workspaces", size: 1, alias: "workspace" },
	permalink: (data) => `${data.workspace.slug}/index.html`,
	eleventyComputed: { title: (data) => data.workspace.name },
};
