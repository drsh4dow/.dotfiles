#!/usr/bin/env bash
# Audio and picture checks on an exported video.
#
#   check.sh VIDEO.mp4 [--profile narrated|captions] [--timeline T.json] [--out DIR] [--dead-air 1.0] [--between 0.5]
#            [--inline 0.6] [--sheet-every 2]
#   check.sh --self-test
#
# Profiles: narrated (the default) runs every check, and fails a video with no audio stream. captions, for a
# captions-only clip with no voice, reports dead air, quiet gaps and loudness as not applicable, because its
# holds are frozen and silent by design. Caption holds and sync are sync.py's.
# Writes to DIR (default checks/ beside VIDEO) ffprobe.json and checks.txt:
# - dead air: a span over --dead-air s where the picture is frozen (freezedetect -50 dB) and the sound silent
#   (silencedetect -35 dB) at once;
# - quiet gaps, when a timeline names the narration lines: a quiet span (-35 dB, >= 0.1 s) between lines over
#   --between s, or inside one line over --inline s;
# - loudness (EBU R128 integrated, LRA, true peak), reported, never failed;
# - contact sheets of frames picked by index every --sheet-every s (frames.py).
# Exit 1 when an applicable check fails, 0 otherwise.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

self_test() {
  local d rc=0
  d="$(mktemp -d)"
  trap 'rm -rf "$d"' RETURN
  expect() {
    local want="$1" msg="$2" got=0
    shift 2
    "$0" "$@" > "$d/last.txt" 2>&1 || got=$?
    [ "$got" = "$want" ] || { echo "  $msg: exit $got, want $want"; rc=1; }
  }
  local enc=(-c:v libx264 -pix_fmt yuv420p)
  ffmpeg -v error -f lavfi -i testsrc2=s=320x200:r=30:d=4 -f lavfi -i sine=f=330:d=4 -shortest "${enc[@]}" "$d/good.mp4"
  ffmpeg -v error -f lavfi -i testsrc2=s=320x200:r=30:d=4 "${enc[@]}" "$d/mute.mp4"
  ffmpeg -v error -f lavfi -i color=c=gray:s=320x200:r=30:d=3 -f lavfi -i anullsrc=r=48000:cl=mono -t 3 "${enc[@]}" "$d/dead.mp4"
  ffmpeg -v error -f lavfi -i testsrc2=s=320x200:r=30:d=4 -f lavfi \
    -i "sine=f=330:d=4,volume='if(between(t,1.5,2.5),0,1)':eval=frame" -shortest "${enc[@]}" "$d/gap.mp4"
  printf '{"lines":[{"text":"a","start":0.1,"end":1.5},{"text":"b","start":2.5,"end":3.9}]}' > "$d/gap.json"
  expect 0 "moving picture with steady sound failed" "$d/good.mp4" --out "$d/c1"
  ls "$d"/c1/sheet-*.jpg > /dev/null 2>&1 || { echo "  no contact sheet written"; rc=1; }
  expect 1 "3 s of frozen, silent video passed" "$d/dead.mp4" --out "$d/c2"
  expect 1 "a 1.0 s gap between lines passed" "$d/gap.mp4" --timeline "$d/gap.json" --out "$d/c3"
  expect 1 "a narrated video with no audio passed" "$d/mute.mp4" --out "$d/c4"
  grep -q "needs an audio stream" "$d/last.txt" || { echo "  no clear verdict on a video with no audio"; rc=1; }
  expect 0 "captions-only: a video with no audio failed" "$d/mute.mp4" --profile captions --out "$d/c5"
  expect 0 "captions-only: a frozen, silent hold failed" "$d/dead.mp4" --profile captions --out "$d/c6"
  [ "$rc" = 0 ] && echo "check.sh self-test: PASS" || echo "check.sh self-test: FAIL"
  return "$rc"
}

case "${1:-}" in
  ""|-h|--help) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  --self-test) self_test; exit $? ;;
esac

V="$(realpath "$1")"; shift
T="" OUT="" PROFILE=narrated DEAD=1.0 BETWEEN=0.5 INLINE=0.6 EVERY=2
while [ $# -gt 0 ]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --timeline) T="$(realpath "$2")"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --dead-air) DEAD="$2"; shift 2 ;;
    --between) BETWEEN="$2"; shift 2 ;;
    --inline) INLINE="$2"; shift 2 ;;
    --sheet-every) EVERY="$2"; shift 2 ;;
    *) echo "check.sh: unknown argument $1" >&2; exit 2 ;;
  esac
done
case "$PROFILE" in narrated|captions) ;; *) echo "check.sh: --profile is narrated or captions, not $PROFILE" >&2; exit 2 ;; esac
C="${OUT:-$(dirname "$V")/checks}"
mkdir -p "$C"
rm -f "$C"/silencedetect*.log "$C"/ebur128.log
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels -of json "$V" > "$C/ffprobe.json"
ffmpeg -hide_banner -nostats -i "$V" -map 0:v -fps_mode passthrough -f null \
  -vf "freezedetect=n=-50dB:d=$DEAD" - 2> "$C/picture.log"
if grep -q '"codec_type": "audio"' "$C/ffprobe.json"; then
  ffmpeg -hide_banner -nostats -i "$V" -af "silencedetect=noise=-35dB:d=$DEAD" -map 0:a -f null - 2> "$C/silencedetect.log"
  ffmpeg -hide_banner -nostats -i "$V" -af "silencedetect=noise=-35dB:d=0.1" -map 0:a -f null - 2> "$C/silencedetect-0.1s.log"
  ffmpeg -hide_banner -nostats -i "$V" -af "ebur128=peak=true" -map 0:a -f null - 2> "$C/ebur128.log" || true
fi

set +e
python3 - "$C" "$PROFILE" "$DEAD" "$BETWEEN" "$INLINE" "${T:-}" <<'EOF'
import json, os, re, sys
c, profile, (dead, between, inline), tpath = sys.argv[1], sys.argv[2], map(float, sys.argv[3:6]), sys.argv[6]
probe = json.load(open(f"{c}/ffprobe.json"))
dur = float(probe["format"]["duration"])
def spans(path, a, b):
    txt = open(path).read()
    s = [float(x) for x in re.findall(a + r":\s*([\d.]+)", txt)]
    e = [float(x) for x in re.findall(b + r":\s*([\d.]+)", txt)]
    return list(zip(s, e + [dur] * (len(s) - len(e))))
out, bad = [f"duration {dur:.2f} s, profile {profile}"], False
fr = spans(f"{c}/picture.log", "lavfi.freezedetect.freeze_start", "lavfi.freezedetect.freeze_end")
out += [f"frozen spans >= {dead} s: {len(fr)}", *[f"  {a:.2f}-{b:.2f}" for a, b in fr]]
if profile == "captions":
    out += [f"{k}: not applicable (captions-only profile)" for k in ("dead air", "quiet gaps", "loudness")]
elif not os.path.exists(f"{c}/silencedetect.log"):
    out.append("audio: FAIL, a narrated video needs an audio stream and this one has none; "
               "dead air, quiet gaps and loudness not measured")
    bad = True
else:
    si = spans(f"{c}/silencedetect.log", "silence_start", "silence_end")
    over = [(round(max(a0, b0), 2), round(min(a1, b1), 2)) for a0, a1 in fr for b0, b1 in si if min(a1, b1) - max(a0, b0) > dead]
    log = open(f"{c}/ebur128.log").read()
    lufs, lra, tp = (re.findall(p, log) for p in (r"I:\s*(-?[\d.]+) LUFS", r"LRA:\s*(-?[\d.]+) LU", r"Peak:\s*(-?[\d.]+) dBFS"))
    out += [f"silent spans >= {dead} s: {len(si)}", *[f"  {a:.2f}-{b:.2f}" for a, b in si],
            f"dead air (frozen and silent at once, over {dead} s): {'FAIL' if over else 'PASS'}, {len(over)}",
            *[f"  {a:.2f}-{b:.2f} ({b - a:.2f} s)" for a, b in over],
            f"loudness: {lufs[-1] if lufs else 'not measured'} LUFS integrated, LRA {lra[-1] if lra else 'not measured'} LU, "
            f"true peak {tp[-1] if tp else 'not measured'} dBFS"]
    bad = bool(over)
    if not tpath:
        out.append("quiet gaps: not measured, no --timeline names the narration lines")
    else:
        lines = json.load(open(tpath)).get("lines", [])
        q = spans(f"{c}/silencedetect-0.1s.log", "silence_start", "silence_end")
        btw, inl, edge = [], [], []
        for a, b in q:
            if not lines or b <= lines[0]["start"] + 0.05 or b >= dur - 0.05 or a >= lines[-1]["end"] - 0.05:
                edge.append((a, b))
                continue
            host = next((ln for ln in lines if ln["start"] + 0.05 <= a and b <= ln["end"] - 0.05), None)
            (inl if host else btw).append((a, b))
        wb = max((b - a for a, b in btw), default=0.0)
        wi = max((b - a for a, b in inl), default=0.0)
        out += [f"quiet gaps (-35 dB, >= 0.1 s) against {len(lines)} narration lines: {'FAIL' if wb > between or wi > inline else 'PASS'}",
                f"  between lines: {len(btw)}; max {wb:.3f} s; over {between} s: {sum(1 for a, b in btw if b - a > between)}",
                *[f"    {a:.3f}-{b:.3f} ({b - a:.3f} s)" for a, b in btw if b - a > between],
                f"  inside a line: {len(inl)}; max {wi:.3f} s; over {inline} s: {sum(1 for a, b in inl if b - a > inline)}",
                *[f"    {a:.3f}-{b:.3f} ({b - a:.3f} s)" for a, b in inl if b - a > inline],
                f"  lead-in and tail: {len(edge)}", *[f"    {a:.3f}-{b:.3f}" for a, b in edge]]
        bad = bad or wb > between or wi > inline
open(f"{c}/checks.txt", "w").write("\n".join(out) + "\n")
print("\n".join(out))
sys.exit(1 if bad else 0)
EOF
rc=$?
set -e
rm -f "$C"/sheet-*.jpg
"$HERE/frames.py" "$V" --out "$C" --every "$EVERY" > /dev/null
echo "contact sheets: $(ls "$C"/sheet-*.jpg | wc -l) in $C"
exit "$rc"
