// One entry per workspace of the repository: its package.json & its SKILL.md or README.md.

import path from "node:path";

import { buildWorkspaces } from "@allons-y/webc-patterns/project";

export default () => buildWorkspaces({ root: path.resolve(import.meta.dirname, "{{ROOT_FROM_DATA}}") });
