if true then
  return {}
end

return {
  {
    "yetone/avante.nvim",
    opts = {
      provider = "codex",
      acp_providers = {
        codex = {
          command = "bunx",
          args = { "-y", "@zed-industries/codex-acp" },
          auth_method = "chatgpt",
          env = {
            NODE_NO_WARNINGS = "1",
            HOME = os.getenv("HOME"),
            PATH = os.getenv("PATH"),
          },
        },
      },
    },
    keys = {
      { "<leader>aa", "<cmd>AvanteAsk<cr>", desc = "Avante ask", mode = { "n", "v" } },
      { "<leader>ae", "<cmd>AvanteEdit<cr>", desc = "Avante edit", mode = { "n", "v" } },
      { "<leader>at", "<cmd>AvanteToggle<cr>", desc = "Avante toggle" },
    },
  },
}
