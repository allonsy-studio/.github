---
layout: layouts/workspace.webc
pagination:
  data: workspaces
  size: 1
  alias: workspace
permalink: "{{ workspace.slug }}/index.html"
eleventyComputed:
  title: "{{ workspace.name }}"
---
