return {
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        gdscript = {
          mason = false, -- Godot itself is the LSP server
          cmd = vim.lsp.rpc.connect("127.0.0.1", tonumber(os.getenv("GDScript_Port") or "6005")),
        },
      },
    },
  },

  {
    "nvim-treesitter/nvim-treesitter",
    opts = {
      ensure_installed = {
        "gdscript",
        "gdshader",
        "godot_resource",
      },
    },
  },
}
