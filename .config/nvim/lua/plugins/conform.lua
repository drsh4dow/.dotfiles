return {
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = {
        gdscript = { "gdformat" },
      },
    },
  },
  {
    "mason-org/mason.nvim",
    opts = {
      ensure_installed = {
        "gdtoolkit",
      },
    },
  },
}
