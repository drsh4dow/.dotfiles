local function rust_terminal(args)
  if vim.fn.executable(args[1]) == 0 then
    vim.notify(args[1] .. " is not executable", vim.log.levels.ERROR)
    return
  end

  vim.cmd("botright split")
  vim.cmd("resize 15")
  local job = vim.fn.jobstart(args, { cwd = LazyVim.root(), term = true })
  if job <= 0 then
    vim.notify("Failed to start " .. table.concat(args, " "), vim.log.levels.ERROR)
    return
  end

  vim.cmd("startinsert")
end

local function rust_buf_map(bufnr, lhs, rhs, desc)
  vim.keymap.set("n", lhs, rhs, { buffer = bufnr, desc = desc })
end

return {
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        bacon_ls = {
          init_options = {
            cargo = { updateOnInsert = false },
          },
          settings = {
            bacon_ls = {
              backend = "cargo",
              cargo = {
                command = "check",
                checkOnSave = true,
                cancelRunning = true,
                refreshIntervalSeconds = 1,
                extraArgs = { "--all-features", "--all-targets", "--keep-going" },
              },
            },
          },
        },
      },
    },
  },

  {
    "mrcjkb/rustaceanvim",
    opts = function(_, opts)
      opts.server = opts.server or {}
      local on_attach = opts.server.on_attach
      opts.server.on_attach = function(client, bufnr)
        if on_attach then
          on_attach(client, bufnr)
        end

        rust_buf_map(bufnr, "<leader>rR", function()
          vim.cmd.RustLsp("runnables")
        end, "Rust Runnables")
        rust_buf_map(bufnr, "<leader>rr", function()
          vim.cmd.RustLsp("run")
        end, "Rust Run")
        rust_buf_map(bufnr, "<leader>rd", function()
          vim.cmd.RustLsp("debug")
        end, "Rust Debug")
        rust_buf_map(bufnr, "<leader>re", function()
          vim.cmd.RustLsp("expandMacro")
        end, "Rust Expand Macro")
        rust_buf_map(bufnr, "<leader>rD", function()
          vim.cmd.RustLsp("renderDiagnostic")
        end, "Rust Render Diagnostic")
        rust_buf_map(bufnr, "<leader>rE", function()
          vim.cmd.RustLsp("explainError")
        end, "Rust Explain Error")
        rust_buf_map(bufnr, "<leader>rC", function()
          vim.cmd.RustLsp("openCargo")
        end, "Rust Open Cargo.toml")
        rust_buf_map(bufnr, "<leader>rG", function()
          rust_terminal({ "cargo", "run" })
        end, "Rust Run Game")
        rust_buf_map(bufnr, "<leader>rB", function()
          local clients = vim.lsp.get_clients({ bufnr = bufnr, name = "bacon_ls" })
          if #clients == 0 then
            vim.notify("bacon-ls is not attached", vim.log.levels.WARN)
            return
          end

          clients[1]:request("workspace/executeCommand", { command = "bacon_ls.run" }, nil, bufnr)
        end, "Rust Run bacon-ls")
      end

      opts.server.default_settings = opts.server.default_settings or {}
      local ra = opts.server.default_settings["rust-analyzer"] or {}
      ra.check = vim.tbl_deep_extend("force", ra.check or {}, {
        command = "check",
        features = "all",
        allTargets = true,
        extraArgs = { "--keep-going" },
      })
      opts.server.default_settings["rust-analyzer"] = ra
    end,
  },
}
