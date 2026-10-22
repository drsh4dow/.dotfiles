return {
  "neovim/nvim-lspconfig",
  opts = {
    servers = {
      kotlin_language_server = {
        cmd_env = {
          JAVA_HOME = vim.fn.expand("~/.local/share/jdks/temurin-17"),
        },
      },
    },
  },
}
