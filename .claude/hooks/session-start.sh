#!/bin/bash
# SessionStart hook: surface the working brief before any code is touched.
#
# Why this exists: reading AGENTS.md was a habit, and "habits drift silently"
# (AGENTS.md, rule preamble). This turns it into a machine — the mandatory
# minimum from the brief is injected into every session's context, so no work
# starts without it.
#
# Design note, in keeping with CLAUDE.md's "a second copy is a copy that will
# drift": this script stores NO copy of the rules. It reads the
# "Read this much, at minimum" section out of AGENTS.md at runtime. Edit the
# brief and this hook follows automatically.
set -euo pipefail

brief="${CLAUDE_PROJECT_DIR:-.}/AGENTS.md"

# If the brief is missing (unexpected), stay silent rather than break startup.
[ -f "$brief" ] || exit 0

# Pull the mandatory-minimum section live: from its heading to the next one.
section="$(awk '/^## Read this much/{f=1} /^## Three tiers/{f=0} f' "$brief")"
[ -n "$section" ] || exit 0

context="$(cat <<EOF
Before changing any code in this repository, read the working brief in
AGENTS.md in full, and the relevant docs/ page it points to for the area you
are touching. The mandatory minimum is below, injected from AGENTS.md so it is
always current. Rules 4 (propose options, then ask) and 6 (small steps) have no
machine behind them — they rest on you.

When picking up a feature request, run the /intake skill before editing.

---

${section}
EOF
)"

jq -n --arg ctx "$context" \
  '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
