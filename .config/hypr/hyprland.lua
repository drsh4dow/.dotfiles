-- Hyprland 0.55+ Lua config.
-- The old hyprlang files are kept as fallback/reference, but Hyprland loads this
-- file automatically when it exists in ~/.config/hypr.

----------------
-- Monitors
----------------

hl.monitor({ output = "", mode = "preferred", position = "auto", scale = 1 })
hl.monitor({ output = "HDMI-A-1", mode = "highres@highrr", position = "1920x-200", scale = 1 })
hl.monitor({ output = "eDP-1", mode = "highres@highrr", position = "0x0", scale = 1 })
hl.monitor({ output = "DP-3", mode = "highres@highrr", position = "-1080x-800", scale = 1, transform = 1 })

hl.workspace_rule({ workspace = "w[tv1]", gaps_out = 0, gaps_in = 0 })
hl.workspace_rule({ workspace = "f[1]", gaps_out = 0, gaps_in = 0 })
hl.workspace_rule({ workspace = "1", monitor = "eDP-1", default = true })
hl.workspace_rule({ workspace = "name:L1", monitor = "HDMI-A-1", default = true })
hl.workspace_rule({ workspace = "name:R1", monitor = "DP-3", default = true })
hl.workspace_rule({ workspace = "2", monitor = "eDP-1" })
hl.workspace_rule({ workspace = "3", monitor = "eDP-1" })
hl.workspace_rule({ workspace = "4", monitor = "eDP-1" })
hl.workspace_rule({ workspace = "5", monitor = "eDP-1" })
hl.workspace_rule({ workspace = "6", monitor = "eDP-1" })
hl.workspace_rule({ workspace = "7", monitor = "eDP-1" })
hl.workspace_rule({ workspace = "8", monitor = "eDP-1" })
hl.workspace_rule({ workspace = "9", monitor = "eDP-1" })
hl.workspace_rule({ workspace = "10", monitor = "eDP-1" })
hl.workspace_rule({ workspace = "name:L2", monitor = "HDMI-A-1" })
hl.workspace_rule({ workspace = "name:R2", monitor = "DP-3" })

----------------
-- Environment
----------------

local terminal = "ghostty"

hl.env("XCURSOR_SIZE", "24")
hl.env("GDK_BACKEND", "wayland,x11")
hl.env("CLUTTER_BACKEND", "wayland")
hl.env("SDL_VIDEODRIVER", "wayland")
hl.env("MOZ_ENABLE_WAYLAND", "1")
hl.env("_JAVA_AWT_WM_NONREPARENTING", "1")
hl.env("QT_QPA_PLATFORM", "wayland;xcb")
hl.env("QT_WAYLAND_DISABLE_WINDOWDECORATION", "1")
hl.env("QT_AUTO_SCREEN_SCALE_FACTOR", "1")
hl.env("QT_QPA_PLATFORMTHEME", "kde")
hl.env("XDG_CURRENT_DESKTOP", "Hyprland")
hl.env("TERMINAL", terminal)
hl.env("XDG_SESSION_TYPE", "wayland")
hl.env("XDG_SESSION_DESKTOP", "Hyprland")
hl.env("XDG_MENU_PREFIX", "arch-kbuildsycoca6")

----------------
-- Autostart
----------------

hl.on("hyprland.start", function()
	hl.exec_cmd("xrandr --output DP-1 --primary")
	hl.exec_cmd("dbus-update-activation-environment --systemd WAYLAND_DISPLAY XDG_CURRENT_DESKTOP TERMINAL")
	hl.exec_cmd("gsettings set org.gnome.desktop.interface color-scheme prefer-dark")
	hl.exec_cmd("gsettings set org.gnome.desktop.interface gtk-theme 'Arc-Dark'")
	hl.exec_cmd("gsettings set org.gnome.desktop.interface icon-theme 'BeautyLine'")
	hl.exec_cmd("gsettings set org.gnome.desktop.privacy remember-recent-files false")
	hl.exec_cmd("hyprpaper")
	hl.exec_cmd("/usr/lib/polkit-kde-authentication-agent-1")
	hl.exec_cmd("dunst")
	hl.exec_cmd("nm-applet")
	hl.exec_cmd("rog-control-center")
	hl.exec_cmd("dex /etc/xdg/autostart/blueman.desktop")
	hl.exec_cmd("dex -a -s ~/.config/autostart/")
	hl.exec_cmd("sleep 1 && waybar")
	hl.exec_cmd("wl-paste --type text --watch cliphist store")
	hl.exec_cmd("wl-paste --type image --watch cliphist store")
end)

----------------
-- Options
----------------

hl.config({
	input = {
		kb_layout = "us",
		kb_variant = "alt-intl",
		kb_model = "",
		kb_options = "",
		kb_rules = "",
		repeat_delay = 300,
		repeat_rate = 60,
		follow_mouse = 2,
		touchpad = {
			natural_scroll = true,
			disable_while_typing = false,
		},
		accel_profile = "flat",
		sensitivity = 0,
	},

	general = {
		gaps_in = 1,
		gaps_out = 2,
		border_size = 1,
		allow_tearing = true,
		col = {
			active_border = { colors = { "rgba(33ccffee)", "rgba(00ff99ee)" }, angle = 45 },
			inactive_border = "rgba(595959aa)",
		},
		layout = "dwindle",
	},

	decoration = {
		rounding = 1,
		blur = {
			enabled = true,
			size = 3,
			passes = 1,
			new_optimizations = true,
		},
		shadow = {
			enabled = true,
			range = 4,
			render_power = 3,
			color = "rgba(1a1a1aee)",
		},
	},

	animations = {
		enabled = false,
	},

	dwindle = {
		preserve_split = true,
	},

	misc = {
		vrr = 3,
		disable_hyprland_logo = true,
		disable_splash_rendering = true,
	},

	render = {
		direct_scanout = 2,
	},

	cursor = {
		no_break_fs_vrr = 2,
		no_hardware_cursors = 2,
	},
})

hl.curve("myBezier", { type = "bezier", points = { { 0.05, 0.9 }, { 0.1, 1.05 } } })
hl.animation({ leaf = "windows", enabled = false, speed = 3, bezier = "myBezier" })
hl.animation({ leaf = "windowsOut", enabled = false, speed = 2, bezier = "default", style = "popin 80%" })
hl.animation({ leaf = "border", enabled = false, speed = 6, bezier = "default" })
hl.animation({ leaf = "borderangle", enabled = false, speed = 6, bezier = "default" })
hl.animation({ leaf = "fade", enabled = false, speed = 2, bezier = "default" })
hl.animation({ leaf = "workspaces", enabled = false, speed = 0.5, bezier = "default" })

hl.device({ name = "epic-mouse-v1", sensitivity = -0.5 })

----------------
-- Keybindings
----------------

local mainMod = "SUPER"
local browser = "helium-browser"

hl.bind(mainMod .. " + Return", hl.dsp.exec_cmd(terminal))
hl.bind(mainMod .. " + B", hl.dsp.exec_cmd(browser))
hl.bind(mainMod .. " + backslash", hl.dsp.exec_cmd("dex $HOME/.local/share/applications/linear.desktop"))
hl.bind(mainMod .. " + SHIFT + Return", hl.dsp.exec_cmd("dolphin"))
hl.bind(mainMod .. " + SHIFT + D", hl.dsp.exec_cmd("wofi --show drun"))
hl.bind(
	mainMod .. " + SHIFT + F6",
	hl.dsp.exec_cmd(
		[[IMG=~/Pictures/$(date +%Y-%m-%d_%H-%m-%s).png && grim -g "$(slurp)" -t png $IMG && wl-copy < $IMG]]
	)
)
hl.bind(
	mainMod .. " + SHIFT + Print",
	hl.dsp.exec_cmd(terminal .. [[ -e wf-recorder -a -f "/mnt/teradisk/obs-recordings/$(date --iso)-$RANDOM.mp4"]])
)

hl.bind(
	"XF86AudioRaiseVolume",
	hl.dsp.exec_cmd("pamixer -i 5 && pamixer --get-volume > $SWAYSOCK.wob"),
	{ locked = true, repeating = true }
)
hl.bind(
	"XF86AudioLowerVolume",
	hl.dsp.exec_cmd("pamixer -d 5 && pamixer --get-volume > $SWAYSOCK.wob"),
	{ locked = true, repeating = true }
)
hl.bind(
	"XF86AudioMute",
	hl.dsp.exec_cmd([[pamixer -t && notify-send "Muted: $(pamixer --get-mute)"]]),
	{ locked = true }
)
hl.bind("XF86AudioPlay", hl.dsp.exec_cmd("playerctl play-pause"), { locked = true })
hl.bind("XF86AudioNext", hl.dsp.exec_cmd("playerctl next"), { locked = true })
hl.bind("XF86AudioPrev", hl.dsp.exec_cmd("playerctl previous"), { locked = true })
hl.bind("XF86MonBrightnessDown", hl.dsp.exec_cmd("brightnessctl set 5%-"), { locked = true, repeating = true })
hl.bind("XF86MonBrightnessUp", hl.dsp.exec_cmd("brightnessctl set +5%"), { locked = true, repeating = true })

hl.bind(mainMod .. " + SHIFT + Q", hl.dsp.window.close())
hl.bind(mainMod .. " + P", hl.dsp.window.pseudo())
hl.bind(mainMod .. " + F", hl.dsp.window.fullscreen({ action = "toggle" }))
hl.bind(mainMod .. " + Space", hl.dsp.window.float({ action = "toggle" }))
hl.bind(mainMod .. " + h", hl.dsp.focus({ direction = "l" }))
hl.bind(mainMod .. " + l", hl.dsp.focus({ direction = "r" }))
hl.bind(mainMod .. " + k", hl.dsp.focus({ direction = "u" }))
hl.bind(mainMod .. " + j", hl.dsp.focus({ direction = "d" }))
hl.bind(mainMod .. " + SHIFT + h", hl.dsp.window.move({ direction = "l" }))
hl.bind(mainMod .. " + SHIFT + l", hl.dsp.window.move({ direction = "r" }))
hl.bind(mainMod .. " + SHIFT + k", hl.dsp.window.move({ direction = "u" }))
hl.bind(mainMod .. " + SHIFT + j", hl.dsp.window.move({ direction = "d" }))

local workspaces = {
	{ key = "1", workspace = "1" },
	{ key = "2", workspace = "2" },
	{ key = "3", workspace = "3" },
	{ key = "4", workspace = "4" },
	{ key = "5", workspace = "5" },
	{ key = "6", workspace = "6" },
	{ key = "7", workspace = "name:L1" },
	{ key = "8", workspace = "name:L2" },
	{ key = "9", workspace = "name:R1" },
	{ key = "0", workspace = "name:R2" },
}

for _, item in ipairs(workspaces) do
	hl.bind(mainMod .. " + " .. item.key, hl.dsp.focus({ workspace = item.workspace }))
	hl.bind(mainMod .. " + SHIFT + " .. item.key, hl.dsp.window.move({ workspace = item.workspace }))
end

hl.bind(mainMod .. " + mouse_down", hl.dsp.focus({ workspace = "e+1" }))
hl.bind(mainMod .. " + mouse_up", hl.dsp.focus({ workspace = "e-1" }))
hl.bind(mainMod .. " + mouse:272", hl.dsp.window.drag(), { mouse = true })
hl.bind(mainMod .. " + mouse:273", hl.dsp.window.resize(), { mouse = true })

----------------
-- Window rules
----------------

hl.window_rule({
	match = { class = "^(steam_app_|gamescope).*" },
	content = "game",
	idle_inhibit = "always",
	immediate = true,
	no_anim = true,
	no_blur = true,
	opaque = true,
})

hl.window_rule({
	match = { initial_class = "^(steam_app_|gamescope).*" },
	content = "game",
	idle_inhibit = "always",
	immediate = true,
	no_anim = true,
	no_blur = true,
	opaque = true,
})

hl.window_rule({ match = { class = "^(file_progress)$" }, float = true })
hl.window_rule({ match = { class = "^(confirm)$" }, float = true })
hl.window_rule({ match = { class = "^(dialog)$" }, float = true })
hl.window_rule({ match = { class = "^(download)$" }, float = true })
hl.window_rule({ match = { class = "^(notification)$" }, float = true })
hl.window_rule({ match = { class = "^(error)$" }, float = true })
hl.window_rule({ match = { class = "^(splash)$" }, float = true })
hl.window_rule({ match = { class = "^(confirmreset)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(Open File)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(branchdialog)$" }, float = true })
hl.window_rule({ match = { class = "^(Lxappearance)$" }, float = true })
hl.window_rule({ match = { class = "^(Rofi)$" }, float = true })
hl.window_rule({ match = { class = "^(Rofi)$" }, no_anim = true })
hl.window_rule({ match = { class = "^(viewnior)$" }, float = true })
hl.window_rule({ match = { class = "^(Viewnior)$" }, float = true })
hl.window_rule({ match = { class = "^(feh)$" }, float = true })
hl.window_rule({ match = { class = "^(pavucontrol-qt)$" }, float = true })
hl.window_rule({ match = { class = "^(pavucontrol)$" }, float = true })
hl.window_rule({ match = { class = "^(file-roller)$" }, float = true })
hl.window_rule({ match = { initial_title = "DevTools" }, float = true })
hl.window_rule({ match = { class = "^(wlogout)$" }, fullscreen = true })
hl.window_rule({ match = { initial_title = "^(wlogout)$" }, fullscreen = true })
hl.window_rule({ match = { class = "^(mpv)$" }, idle_inhibit = "focus" })
hl.window_rule({ match = { initial_title = "^(Media viewer)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(Volume Control)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(Picture-in-Picture)$" }, float = true })
hl.window_rule({
	match = { initial_title = "^(Volume Control)$" },
	float = true,
	size = { 800, 600 },
	move = { 75, "44%" },
})
hl.window_rule({ match = { initial_title = "^(Firefox — Sharing Indicator)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(Calculator)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(Progress)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(zenity)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(video0)$" }, float = true })
hl.window_rule({ match = { class = "^(yad)$" }, float = true })
hl.window_rule({ match = { class = "^(qt5ct)$" }, float = true })
hl.window_rule({ match = { class = "^(qt6ct)$" }, float = true })
hl.window_rule({ match = { class = "^(floating_shell_portrait)$" }, float = true })
hl.window_rule({ match = { class = "^(blueman-manager)$" }, float = true })
hl.window_rule({ match = { class = "^(xsensors)$" }, float = true })
hl.window_rule({ match = { class = "^(image-roll)$" }, float = true })
hl.window_rule({ match = { class = "^(qalculate-qt)$", title = "^(Qalculate!)$" }, float = true })
hl.window_rule({ match = { float = false, workspace = "w[tv1]" }, border_size = 0, rounding = 0 })
hl.window_rule({ match = { float = false, workspace = "f[1]" }, border_size = 0, rounding = 0 })
hl.window_rule({
	match = { initial_class = "^(firefox)$", initial_title = "^(Picture-in-Picture)$" },
	float = true,
	pin = true,
})
hl.window_rule({
	match = { initial_class = "^(firefox)$", initial_title = "^(Firefox — Sharing Indicator)$" },
	float = true,
})
hl.window_rule({
	match = { initial_class = "^(org.telegram.desktop)$", initial_title = "^(Media viewer)$" },
	float = true,
	center = true,
	monitor = "1",
})
hl.window_rule({ match = { initial_title = "^(Open)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(Choose Files)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(Save As)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(Confirm to replace files)$" }, float = true })
hl.window_rule({ match = { initial_title = "^(File Operation Progress)$" }, float = true })
hl.window_rule({
	match = { initial_class = "^(blender)$", initial_title = "^(File Browser)$" },
	float = true,
	size = { "monitor_w*0.8", "monitor_h*0.85" },
	center = true,
})
hl.window_rule({
	match = { class = "^(task-floating)$" },
	float = true,
	center = true,
	dim_around = true,
	decorate = false,
})
hl.window_rule({ match = { class = "^(pavucontrol)$" }, center = true })
hl.window_rule({ match = { class = "^(file-roller)$" }, float = true })
hl.window_rule({
	match = { class = "^(jetbrains-phpstorm)$", initial_title = "^License" },
	float = true,
	center = true,
	dim_around = true,
})
