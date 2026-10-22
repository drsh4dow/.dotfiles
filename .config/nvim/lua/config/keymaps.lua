-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
local keymap = vim.keymap -- for conciseness

-- remove highlight
keymap.set("n", "<leader>nh", ":nohl<CR>", { desc = "(n)o (h)ighlight" })

-- trigger formating
keymap.set({ "n", "x" }, "<leader>pp", function()
  LazyVim.format({ force = true })
end, { desc = "(p)retty (p)rint" })
