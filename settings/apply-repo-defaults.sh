#!/usr/bin/env bash
# Applies repo-defaults.json to one allonsy-studio repository. Dry run unless --apply.
# Usage: settings/apply-repo-defaults.sh <repo> [--apply]
set -euo pipefail

ORG=allonsy-studio
DEFAULTS="$(dirname "$0")/repo-defaults.json"
REPO="${1:?repository name required}"
APPLY=false
[ "${2:-}" = "--apply" ] && APPLY=true
R="repos/$ORG/$REPO"

run() { # method path [json]
	if ! $APPLY; then
		echo "would $1 $2 ${3:+$(jq -c . <<<"$3")}"
		return
	fi
	if [ -n "${3:-}" ]; then
		gh api -X "$1" "$2" --input - <<<"$3" >/dev/null
	else
		gh api -X "$1" "$2" >/dev/null
	fi
	echo "✓ $1 $2"
}

run PATCH "$R" "$(jq '.repo' "$DEFAULTS")"
# Secret scanning & push protection are free only on public repositories.
if [ "$(gh api "$R" --jq .visibility)" = "public" ]; then
	run PATCH "$R" "$(jq '.public_repo' "$DEFAULTS")"
fi
[ "$(jq '.private_vulnerability_reporting' "$DEFAULTS")" = true ] && run PUT "$R/private-vulnerability-reporting"
run PUT "$R/actions/permissions/workflow" "$(jq '.actions.workflow' "$DEFAULTS")"
run PUT "$R/actions/permissions/fork-pr-contributor-approval" "$(jq '.actions.fork_pr_contributor_approval' "$DEFAULTS")"
run PUT "$R/actions/permissions/artifact-and-log-retention" "$(jq '.actions.artifact_and_log_retention' "$DEFAULTS")"
