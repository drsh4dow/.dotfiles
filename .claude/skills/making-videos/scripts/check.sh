#!/usr/bin/env bash
# Audio and picture checks on an exported video.
#
#   check.sh VIDEO.mp4 [--profile narrated|captions] [--timeline T.json] [--out DIR] [--dead-air 1.0] [--between 0.5]
#            [--inline 0.6] [--area W:H:X:Y] [--dip 0.25] [--dip-window 1.0] [--sheet-every 2]
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
# - loudness: EBU R128 integrated outside -16 +-1 LUFS, true peak above -1.0 dBTP, or either not measured;
# - dark dips: a frame whose mean brightness over the picture area (--area, ffmpeg crop syntax, default the whole
#   frame) is more than --dip (a fraction) below the brightest frame both in the --dip-window s before it and in
#   the --dip-window s after it. A fade through black dips, and so do an outgoing fade and a late incoming fade
#   that leave the background showing between them. A cross-dissolve does not;
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
  ffmpeg -v error -f lavfi -i testsrc2=s=320x200:r=30:d=4 -f lavfi -i sine=f=330:d=4,volume=5.8dB -shortest "${enc[@]}" "$d/good.mp4"
  ffmpeg -v error -f lavfi -i testsrc2=s=320x200:r=30:d=4 -f lavfi -i sine=f=330:d=4,volume=1.8dB -shortest "${enc[@]}" "$d/quiet.mp4"
  ffmpeg -v error -f lavfi -i testsrc2=s=320x200:r=30:d=4 "${enc[@]}" "$d/mute.mp4"
  ffmpeg -v error -f lavfi -i color=c=gray:s=320x200:r=30:d=3 -f lavfi -i anullsrc=r=48000:cl=mono -t 3 "${enc[@]}" "$d/dead.mp4"
  ffmpeg -v error -f lavfi -i testsrc2=s=320x200:r=30:d=4 -f lavfi \
    -i "sine=f=330:d=4,volume='if(between(t,1.5,2.5),0,1.95)':eval=frame" -shortest "${enc[@]}" "$d/gap.mp4"
  for x in fadeblack fade; do
    ffmpeg -v error -f lavfi -i color=c=0xd0d0d0:s=320x200:r=30:d=3 -f lavfi -i color=c=0xa0a0a0:s=320x200:r=30:d=3 \
      -filter_complex "[0][1]xfade=transition=$x:duration=0.6:offset=2.2" "${enc[@]}" "$d/$x.mp4"
  done
  printf '{"lines":[{"text":"a","start":0.1,"end":1.5},{"text":"b","start":2.5,"end":3.9}]}' > "$d/gap.json"
  expect 0 "moving picture with steady sound failed" "$d/good.mp4" --out "$d/c1"
  ls "$d"/c1/sheet-*.jpg > /dev/null 2>&1 || { echo "  no contact sheet written"; rc=1; }
  expect 1 "3 s of frozen, silent video passed" "$d/dead.mp4" --out "$d/c2"
  expect 1 "a 1.0 s gap between lines passed" "$d/gap.mp4" --timeline "$d/gap.json" --out "$d/c3"
  grep -q "loudness: PASS" "$d/last.txt" || { echo "  the gap clip failed loudness, not only its gap"; rc=1; }
  expect 1 "a narrated video at -20 LUFS passed" "$d/quiet.mp4" --out "$d/c9"
  grep -q "loudness: FAIL" "$d/last.txt" || { echo "  a video at -20 LUFS did not fail loudness"; rc=1; }
  expect 1 "a narrated video with no audio passed" "$d/mute.mp4" --out "$d/c4"
  grep -q "needs an audio stream" "$d/last.txt" || { echo "  no clear verdict on a video with no audio"; rc=1; }
  expect 0 "captions-only: a video with no audio failed" "$d/mute.mp4" --profile captions --out "$d/c5"
  expect 0 "captions-only: a frozen, silent hold failed" "$d/dead.mp4" --profile captions --out "$d/c6"
  expect 1 "a fade through black passed" "$d/fadeblack.mp4" --profile captions --out "$d/c7"
  expect 0 "a cross-dissolve failed" "$d/fade.mp4" --profile captions --out "$d/c8"
  [ "$rc" = 0 ] && echo "check.sh self-test: PASS" || echo "check.sh self-test: FAIL"
  return "$rc"
}

case "${1:-}" in
  ""|-h|--help) sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  --self-test) self_test; exit $? ;;
esac

V="$(realpath "$1")"; shift
T="" OUT="" PROFILE=narrated DEAD=1.0 BETWEEN=0.5 INLINE=0.6 AREA=iw:ih:0:0 DIP=0.25 DIPWIN=1.0 EVERY=2
while [ $# -gt 0 ]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --timeline) T="$(realpath "$2")"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --dead-air) DEAD="$2"; shift 2 ;;
    --between) BETWEEN="$2"; shift 2 ;;
    --inline) INLINE="$2"; shift 2 ;;
    --area) AREA="$2"; shift 2 ;;
    --dip) DIP="$2"; shift 2 ;;
    --dip-window) DIPWIN="$2"; shift 2 ;;
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
  -vf "freezedetect=n=-50dB:d=$DEAD,crop=$AREA,signalstats,metadata=print:key=lavfi.signalstats.YAVG" - 2> "$C/picture.log"
if grep -q '"codec_type": "audio"' "$C/ffprobe.json"; then
  ffmpeg -hide_banner -nostats -i "$V" -af "silencedetect=noise=-35dB:d=$DEAD" -map 0:a -f null - 2> "$C/silencedetect.log"
  ffmpeg -hide_banner -nostats -i "$V" -af "silencedetect=noise=-35dB:d=0.1" -map 0:a -f null - 2> "$C/silencedetect-0.1s.log"
  ffmpeg -hide_banner -nostats -i "$V" -af "ebur128=peak=true" -map 0:a -f null - 2> "$C/ebur128.log" || true
fi

set +e
python3 - "$C" "$PROFILE" "$DEAD" "$BETWEEN" "$INLINE" "$DIP" "$DIPWIN" "${T:-}" <<'EOF'
import json, os, re, sys
c, profile, (dead, between, inline, dip, dipwin), tpath = sys.argv[1], sys.argv[2], map(float, sys.argv[3:8]), sys.argv[8]
probe = json.load(open(f"{c}/ffprobe.json"))
dur = float(probe["format"]["duration"])
num, den = next(s for s in probe["streams"] if s["codec_type"] == "video")["r_frame_rate"].split("/")
fps = int(num) / int(den)
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
    loud_bad = not (lufs and tp) or abs(float(lufs[-1]) + 16) > 1 or float(tp[-1]) > -1.0
    out += [f"silent spans >= {dead} s: {len(si)}", *[f"  {a:.2f}-{b:.2f}" for a, b in si],
            f"dead air (frozen and silent at once, over {dead} s): {'FAIL' if over else 'PASS'}, {len(over)}",
            *[f"  {a:.2f}-{b:.2f} ({b - a:.2f} s)" for a, b in over],
            f"loudness: {'FAIL' if loud_bad else 'PASS'}, {lufs[-1] if lufs else 'not measured'} LUFS integrated (-16 +-1), "
            f"LRA {lra[-1] if lra else 'not measured'} LU, true peak {tp[-1] if tp else 'not measured'} dBTP (at most -1.0)"]
    bad = bool(over) or loud_bad
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
y = [float(v) for v in re.findall(r"YAVG=([\d.]+)", open(f"{c}/picture.log").read())]
w = max(1, round(dipwin * fps))
before = lambda i: max(y[max(0, i - w):i], default=0.0)
after = lambda i: max(y[i + 1:i + 1 + w], default=0.0)
depth = [(1 - v / r if r - v > 3 else 0.0) for v, r in ((v, min(before(i), after(i))) for i, v in enumerate(y))]
runs = []
for i, d in enumerate(depth):
    if d > dip:
        if runs and runs[-1][1] == i - 1:
            runs[-1][1] = i
        else:
            runs.append([i, i])
worst = max(range(len(y)), key=lambda i: depth[i])
out += [f"dark dips (more than {dip:.0%} below the brightest frame within {dipwin} s on both sides): "
        f"{'FAIL' if runs else 'PASS'}, {len(runs)}; worst {depth[worst]:.1%} at {worst / fps:.2f} s",
        *[f"  {a / fps:.2f}-{(b + 1) / fps:.2f} s: low {min(y[a:b + 1]):.1f}, {before(a):.1f} before, {after(b):.1f} after"
          for a, b in runs]]
bad = bad or bool(runs)
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
