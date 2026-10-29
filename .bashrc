#
# ~/.bashrc
#

# Source global definitions
if [ -f /etc/bashrc ]; then
  . /etc/bashrc
fi

# Source env definitions
if [ -f ~/.bashenv ]; then
  . ~/.bashenv
fi

### Some enviromental variables
export MOZ_ENABLE_WAYLAND=1

## Wayland Variables
export SDL_VIDEODRIVER=wayland,x11,windows
# export CLUTTER_BACKEND=wayland
export QT_AUTO_SCREEN_SCALE_FACTOR=1
export QT_WAYLAND_DISABLE_WINDOWDECORATION=1
export ATAC_THEME=/home/drsh4dow/.config/atac/pastel_dark_theme.toml

### Exports
export EDITOR=nvim
export VISUAL=nvim
export VIDEO=mpv
export IMAGE=imv
export OPENER="xdg-open"
export READER=zathura
export GOROOT="/usr/lib/go"
export GOPATH="$HOME/go"
export GOBIN="$GOPATH/bin"
export FLYCTL_INSTALL="/home/drsh4dow/.fly"
export PATH="$GOBIN:$HOME/.local/bin:$HOME/.cargo/bin:$HOME/bin:$FLYCTL_INSTALL/bin:$PATH"
export CLICOLOR=1
export TERMINAL=ghostty
export BROWSER=helium-browser
export PAGER="less"
export NODE_OPTIONS=--max-old-space-size=8192

# export WM="hyprland"
export COLORTERM="truecolor"
# export RUSTFLAGS="-C target-cpu=native -C opt-level=2"

### Neovide config
export NEOVIDE_FRAMELESS=true
export NEOVIDE_FRAME=none neovide

### NNN Configuration
export NNN_TRASH=1
export NNN_COLORS='4444'
export NNN_FCOLORS='c1e2272e006033f7c6d6abc4'
export NNN_FIFO='/tmp/nnn.fifo'
export NNN_PLUG='m:nmount;d:dragdrop'

################################################
### Start Hyprland
# if uwsm check may-start; then
#   systemctl --user import-environment
#   exec uwsm start hyprland.desktop
# fi

### Start Sway
# if [ "$(tty)" = "/dev/tty1" ]; then
#   systemctl --user import-environment
#   if [ -z "$WAYLAND_DISPLAY" ]; then
#     exec sway
#   fi
# fi

### Start Xorg
#if [[ ! $DISPLAY && $XDG_VTNR -eq 1 ]]; then
#  exec startx
#fi

### Start Gnome Wayland
#if [[ -z $DISPLAY && $(tty) == /dev/tty1 ]]; then
#  exec dbus-run-session gnome-session
#fi
################################################

# Uncomment the following line if you don't like systemctl's auto-paging feature:
# export SYSTEMD_PAGER=

# User specific aliases and functions
if [ -d ~/.bashrc.d ]; then
  for rc in ~/.bashrc.d/*; do
    if [ -f "$rc" ]; then
      . "$rc"
    fi
  done
fi

unset rc

### Aliases
alias ls='eza'
alias l='eza -lahg --icons'
alias grep='rg --color=auto'
alias mv='mv -i'
alias cmatrix='cmatrix -bC blue'
alias tiktak='tty-clock -scC 4'
#alias tr='transmission-remote'
# alias mpv='SDL_VIDEODRIVER=wayland mpv'
alias vim='nvim'
alias cat='bat -pp'
###

PS1="[\[\e[31m\]\u\[\e[m\]@\[\e[36m\]\h\[\e[m\] \W]\\$ "

### Macros
bind "set completion-ignore-case on"

fastfetch

# Bun
export PATH="/home/drsh4dow/.cache/.bun/bin:$PATH"
export PATH="/home/drsh4dow/.bun/bin:$PATH"

# Turso
export PATH="/home/drsh4dow/.turso:$PATH"

# moon
export PATH="/home/drsh4dow/.moon/bin:$PATH"

# proto
export PROTO_HOME="$XDG_DATA_HOME/proto"
export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"

# Claudex
alias claudex='claude --settings "$HOME/.claude/cliproxy.json" --allow-dangerously-skip-permissions'
# Auto-trust the current folder so Claude Code never shows the trust dialog
claude() {
  local cfg="$HOME/.claude.json" dir="$PWD" tmp
  if [ -f "$cfg" ] && [ "$(jq -r --arg d "$dir" '.projects[$d].hasTrustDialogAccepted // false' "$cfg" 2>/dev/null)" != "true" ]; then
    tmp="$(mktemp "$cfg.XXXXXX")" &&
      jq --arg d "$dir" '.projects[$d] = ((.projects[$d] // {}) + {hasTrustDialogAccepted: true})' "$cfg" > "$tmp" &&
      chmod 600 "$tmp" && mv "$tmp" "$cfg" || rm -f "$tmp"
  fi
  command claude --allow-dangerously-skip-permissions "$@"
}

# Vite+ bin (https://viteplus.dev)
. "$HOME/.vite-plus/env"

# Kache
export PATH="/usr/lib/kache:$PATH"
