#!/bin/bash
# PreToolUse gate: no blind edits to what a visitor sees.
#
# Before an edit lands on a .astro or .css file under src/, this checks that
# /ui-design was run this session, so the change went through the option slate
# (house fit, divergent, opposite, reject) instead of straight to the first
# idea. It gives rule 4 — "propose options, then ask" — a machine, where before
# it had only a habit.
#
# It does NOT read the design; it cannot. It asks only that the step happened.
# Running /ui-design satisfies it even when the verdict is "no visual change,
# proceed" — the point is that the visual dimension was consciously considered.
#
# How we know: weakly, and honestly so. It greps the session transcript for the
# skill invocation. If the transcript is unreadable it fails OPEN and says so on
# stderr — a gate that bricks every edit when a log format shifts costs more
# than the rule it guards. A speed bump, not a lock.
set -uo pipefail

input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
transcript="$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null)"

# Only gate what a visitor sees: a .astro or .css file under src/.
case "$file" in
  src/*|*/src/*) ;;
  *) exit 0 ;;
esac
case "$file" in
  *.astro|*.css) ;;
  *) exit 0 ;;
esac

# Can't check → fail open, but not silently.
if [ -z "$transcript" ] || [ ! -r "$transcript" ]; then
  echo "ui-design gate: transcript unreadable; allowing $file without the design check" >&2
  exit 0
fi

# The design step happened this session if /ui-design was invoked.
if grep -Eq '"skill"[[:space:]]*:[[:space:]]*"ui-design"' "$transcript"; then
  exit 0
fi

reason="$(cat <<EOF
This edit touches ${file}, which a visitor sees, and /ui-design has not run this
session. Rule 4: propose options, then ask — do not go straight to the first
idea. Run /ui-design to draw the option slate (house fit, a divergent take, a
deliberate opposite, and the reject), take a recommendation to the maintainers,
then make the edit. If this change has no visual dimension — a data-test hook, a
copy fix, an import — /ui-design will tell you so in a line and you may proceed;
the point is that the check happened. The brand is the fixed point
(docs/brand-and-code.md); the layout is yours.
EOF
)"

jq -n --arg r "$reason" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r}}'
exit 0
