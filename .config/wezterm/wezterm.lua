-- Pull in the wezterm API
local ok, wezterm = pcall(require, "wezterm")
if not ok then
	print("[ ERROR ] Wezterm module not found")
	return {}
end

-- This will hold the configuration.
local config = wezterm.config_builder()
local act = wezterm.action

-- default shell
config.default_prog = { "/usr/bin/bash" }

config.unix_domains = {
	{
		name = "unix",
	},
}
config.default_gui_startup_args = { "connect", "unix" }

-- This is where you actually apply your config choices

config.font = wezterm.font("Comic Code Ligatures", {
	weight = "Medium",
})
config.font_size = 11.0

local custom_dracula = wezterm.color.get_builtin_schemes()["Dracula"]

custom_dracula.background = "#111111"
-- custom_dracula.foreground = "#dcdccc"

config.color_schemes = {
	["Custom Dracula"] = custom_dracula,
}

-- For example, changing the color scheme:
config.color_scheme = "Custom Dracula"

config.window_padding = {
	top = 0,
	right = 0,
	bottom = 0,
	left = 0,
}

config.window_background_opacity = 0.8

config.enable_kitty_keyboard = true

-- config.hide_tab_bar_if_only_one_tab = true
config.enable_tab_bar = false

config.foreground_text_hsb = {
	hue = 1.0,
	saturation = 1.0,
	brightness = 1.0,
}

config.keys = {
	{
		key = "Enter",
		mods = "SHIFT",
		action = act.SendString("\x1b[13;2u"),
	},
	{
		key = "Enter",
		mods = "ALT",
		action = act.DisableDefaultAssignment,
	},
	{
		key = "h",
		mods = "CTRL",
		action = act.ActivatePaneDirection("Left"),
	},
	{
		key = "j",
		mods = "CTRL",
		action = act.ActivatePaneDirection("Down"),
	},
	{
		key = "k",
		mods = "CTRL",
		action = act.ActivatePaneDirection("Up"),
	},
	{
		key = "l",
		mods = "CTRL",
		action = act.ActivatePaneDirection("Right"),
	},
	{
		key = "h",
		mods = "CTRL|SHIFT",
		action = act.AdjustPaneSize({ "Left", 5 }),
	},
	{
		key = "j",
		mods = "CTRL|SHIFT",
		action = act.AdjustPaneSize({ "Down", 5 }),
	},
	{
		key = "k",
		mods = "CTRL|SHIFT",
		action = act.AdjustPaneSize({ "Up", 5 }),
	},
	{
		key = "l",
		mods = "CTRL|SHIFT",
		action = act.AdjustPaneSize({ "Right", 5 }),
	},
	{
		key = "|",
		mods = "CTRL|SHIFT",
		action = act.SplitPane({
			direction = "Right",
			size = { Percent = 50 },
		}),
	},
	{
		key = "_",
		mods = "CTRL|SHIFT",
		action = act.SplitPane({
			direction = "Down",
			size = { Percent = 50 },
		}),
	},
	{
		key = "m",
		mods = "CTRL|SHIFT",
		action = act.TogglePaneZoomState,
	},
	{
		key = "m",
		mods = "CTRL|ALT",
		action = act.PaneSelect({
			mode = "SwapWithActiveKeepFocus",
		}),
	},
}

-- and finally, return the configuration to wezterm
return config
