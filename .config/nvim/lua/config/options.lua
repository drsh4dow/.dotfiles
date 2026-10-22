-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here

-- Disable LazyVim auto format
vim.g.autoformat = false

vim.opt.writebackup = true
vim.opt.undofile = true

-- appearance
vim.opt.termguicolors = true
-- opt.signcolumn = "yes"
-- opt.colorcolumn = "80"
vim.opt.scrolloff = 8
vim.opt.updatetime = 50
vim.opt.cursorline = false

-- split screen behavior
vim.opt.splitkeep = "screen"

-- append - as a keyword for word selection
vim.opt.iskeyword:append("-")
vim.o.guifont = "Comic Code Ligatures:h12" -- text below applies for VimScript

-- neovide configs
vim.g.neovide_transparency = 0.8
vim.g.neovide_floating_blur_amount_x = 2.0
vim.g.neovide_floating_blur_amount_y = 2.0
vim.g.neovide_hide_mouse_when_typing = true
vim.g.neovide_confirm_quit = true

vim.g.zig_fmt_autosave = 0

-- views can only be fully collapsed with the global statusline
vim.opt.laststatus = 3

-- LSP Server to use for Rust.
-- Set to "bacon-ls" to use bacon-ls instead of rust-analyzer.
-- only for diagnostics. The rest of LSP support will still be
-- provided by rust-analyzer.
vim.g.lazyvim_rust_diagnostics = "bacon-ls"
