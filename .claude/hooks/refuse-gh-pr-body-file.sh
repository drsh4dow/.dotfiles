#!/bin/sh
# A nudge, not a parser. It drops quoted text within a line, joins continued lines, and splits at ; & | and line breaks.
jq -r '.tool_input.command // empty' |
  sed -zE "s/\"[^\"\n]*\"|'[^'\n]*'//g; s/\\\\\n/ /g; s/\n/;/g" |
  grep -zqE '(^|[;&|(/[:space:]])gh[[:space:]]([^;&|]*[[:space:]])?pr[[:space:]]([^;&|]*[[:space:]])?(create|new|edit|comment)[^;&|]*[[:space:]](-[[:alnum:]]*F|--body-file([[:space:]=;&|)]|$))' ||
  exit 0
echo 'Refused: gh pr create, edit, and comment with --body-file or -F publish the file unchecked.' >&2
echo 'Use ~/.claude/skills/writing-good-prs/scripts/publish-pr.ts create, edit, or comment, which checks the text and reads it back. Run it bare for its usage.' >&2
exit 2
