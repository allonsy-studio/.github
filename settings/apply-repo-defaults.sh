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
		gh api -X "$1" "$2" --input - <<<"$3" >/dev/null || return 1
	else
		gh api -X "$1" "$2" >/dev/null || return 1
	fi
	echo "✓ $1 $2"
}

# Discussions: on for the licenses in repo-defaults.json and for a package.json marker, off otherwise.
LICENSE="$(gh api "$R" --jq '.license.spdx_id // ""')"
MARKER="$(gh api "$R/contents/package.json" --jq .content 2>/dev/null | base64 -d 2>/dev/null | jq -r '.["allons-y"].discussions // false' 2>/dev/null || true)"
DISCUSSIONS=false
if jq -e --arg l "$LICENSE" '.discussions.licenses | index($l)' "$DEFAULTS" >/dev/null || [ "$MARKER" = true ]; then
	DISCUSSIONS=true
fi
run PATCH "$R" "$(jq --argjson d "$DISCUSSIONS" '.repo + {has_discussions: $d}' "$DEFAULTS")"
# Secret scanning & push protection are free only on public repositories.
if [ "$(gh api "$R" --jq .visibility)" = "public" ]; then
	# An org security configuration can lock these; warn and carry on.
	run PATCH "$R" "$(jq '.public_repo' "$DEFAULTS")" || echo "! secret scanning is locked by an org security configuration: change it under the organization's Code security settings"
fi
[ "$(jq '.private_vulnerability_reporting' "$DEFAULTS")" = true ] && run PUT "$R/private-vulnerability-reporting"
run PUT "$R/actions/permissions/workflow" "$(jq '.actions.workflow' "$DEFAULTS")"
run PUT "$R/actions/permissions/fork-pr-contributor-approval" "$(jq '.actions.fork_pr_contributor_approval' "$DEFAULTS")"
run PUT "$R/actions/permissions/artifact-and-log-retention" "$(jq '.actions.artifact_and_log_retention' "$DEFAULTS")"

# A social preview has no API: report whether a public repository has one.
if [ "$(gh api "$R" --jq .visibility)" = "public" ]; then
	CUSTOM="$(gh api graphql -f query="query { repository(owner: \"$ORG\", name: \"$REPO\") { usesCustomOpenGraphImage } }" --jq .data.repository.usesCustomOpenGraphImage)"
	[ "$CUSTOM" = true ] || echo "! no social preview: upload assets/$REPO-social-preview.png under Settings → Social preview"
fi
