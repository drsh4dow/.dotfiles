return {
  "folke/snacks.nvim",
  ---@type snacks.Config
  opts = {
    picker = {
      sources = {
        explorer = {
          hidden = true,
          ignored = false,
        },
        files = {
          hidden = true,
          ignored = false,
        },
      },
    },
  },
}
