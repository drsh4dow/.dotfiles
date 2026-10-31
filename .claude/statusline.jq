# Context window usage in the format of Pi's footer: 23.4%/1.0M.
# Computed from raw token counts because used_percentage arrives rounded to an
# integer, and it counts output tokens because Pi does.
def fixed1: (. * 10 | round) as $t | "\($t / 10 | floor).\($t % 10)";
def tokens:
  if . < 1000 then tostring
  elif . < 10000 then "\(. / 1000 | fixed1)k"
  elif . < 1000000 then "\(. / 1000 | round)k"
  elif . < 10000000 then "\(. / 1000000 | fixed1)M"
  else "\(. / 1000000 | round)M"
  end;
def paint($rgb): "\u001b[38;2;\($rgb)m\(.)\u001b[0m";

.context_window as $c
| ($c.context_window_size // 0) as $window
| (if $c.current_usage == null or $window == 0 then null
   else ($c.current_usage | [.input_tokens, .cache_creation_input_tokens, .cache_read_input_tokens, .output_tokens] | add // 0) / $window * 100
   end) as $p
| ($window | tokens) as $size
| if $p == null then "?/\($size)" | paint("127;132;156")
  elif $p > 90 then "\($p | fixed1)%/\($size)" | paint("243;139;168")
  elif $p > 70 then "\($p | fixed1)%/\($size)" | paint("249;226;175")
  else "\($p | fixed1)%/\($size)" | paint("127;132;156")
  end
