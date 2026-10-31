#!/bin/sh
# Quoted text on one line is dropped, so a flag named in a title or body does not count.
jq -r '.tool_input.command // empty' |
  sed -zE "s/\"[^\"\n]*\"|'[^'\n]*'//g; s/\\\\\n/ /g; s/\n/;/g" |
  grep -zqE '(^|[;&|(/[:space:]])gh[[:space:]]+pr[[:space:]]+(create|edit|comment)[^;&|]*[[:space:]](-F|--body-file([[:space:]=;&|)]|$))' ||
  exit 0
echo 'Refused: gh pr create, edit, and comment with --body-file or -F publish the file unchecked.' >&2
echo 'Use ~/.claude/skills/writing-good-prs/scripts/publish-pr.ts create, edit, or comment, which checks the text and reads it back. Run it bare for its usage.' >&2
exit 2
