#!/usr/bin/env python3
"""Send back a final message that names a PR or issue by bare number, to rewrite with its URL.

A nudge, not a parser. In the week to 2026-11-05 the user asked 11 times to "use the link, not the
PR number". A number passes when the message also links it with a full
https://github.com/<owner>/<repo>/pull/<n> or /issues/<n> URL, and text in code spans and fenced
blocks passes. Read last_assistant_message, since the transcript may lag at Stop time.
"""

import json
import re
import sys

event = json.load(sys.stdin)
if event.get("stop_hook_active"):
    sys.exit(0)
message = event.get("last_assistant_message") or ""
prose = re.sub(r"(```|~~~).*?(\1|\Z)|`[^`\n]*`|https?://\S+", "", message, flags=re.S)
linked = set(re.findall(r"https://github\.com/[^/\s]+/[^/\s]+/(?:pull|issues)/(\d+)", message))
bare = [
    name
    for name in re.findall(r"(?<![\w&])#\d{2,5}\b|\b(?:PRs?|pull requests?|issues?)\s+#?\d{2,}\b", prose, re.I)
    if re.sub(r"\D", "", name) not in linked
]
if not bare:
    sys.exit(0)
print(
    f"Rewrite your last message: it names {', '.join(sorted(set(bare)))} without a link. Write "
    "each PR or issue as its full URL, such as https://github.com/<owner>/<repo>/pull/<number>.",
    file=sys.stderr,
)
sys.exit(2)
