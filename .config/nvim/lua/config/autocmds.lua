-- Autocmds are automatically loaded on the VeryLazy event
-- Default autocmds that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/autocmds.lua
--
-- Add any additional autocmds here
-- with `vim.api.nvim_create_autocmd`
--
-- Or remove existing autocmds by their group name (which is prefixed with `lazyvim_` for the defaults)
-- e.g. vim.api.nvim_del_augroup_by_name("lazyvim_wrap_spell")

local function augroup(name)
  return vim.api.nvim_create_augroup("user_" .. name, { clear = true })
end

vim.api.nvim_create_autocmd("FileType", {
  group = augroup("spell"),
  pattern = { "markdown", "gitcommit", "tex" },
  callback = function()
    vim.opt_local.spell = true
    vim.opt_local.spelllang = { "en", "es" }
  end,
})

local godot_pipe = "/tmp/godot.pipe"

local function start_godot_pipe()
  if vim.tbl_contains(vim.fn.serverlist(), godot_pipe) then
    return
  end

  local ok, err = pcall(vim.fn.serverstart, godot_pipe)
  if ok or tostring(err):lower():find("address already in use", 1, true) then
    return
  end

  vim.notify("Failed to start Godot pipe: " .. err, vim.log.levels.WARN)
end

local function is_godot_project(path)
  return vim.fs.find("project.godot", { path = path, upward = true })[1] ~= nil
end

if is_godot_project(vim.fn.getcwd()) then
  start_godot_pipe()
end

vim.api.nvim_create_autocmd({ "BufReadPost", "BufNewFile" }, {
  group = augroup("godot_pipe"),
  pattern = "*.gd",
  callback = function(event)
    local filename = vim.api.nvim_buf_get_name(event.buf)
    local directory = filename ~= "" and vim.fs.dirname(filename) or vim.fn.getcwd()

    if directory and is_godot_project(directory) then
      start_godot_pipe()
    end
  end,
})
