return {
  "neovim/nvim-lspconfig",
  opts = {
    servers = {
      tailwindcss = {
        settings = {
          tailwindCSS = {
            classFunctions = {
              "clsx",
              "cva",
              "cn",
            },
          },
        },
      },
    },
  },
}
