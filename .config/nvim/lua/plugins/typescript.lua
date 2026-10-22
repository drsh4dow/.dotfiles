return {
  "neovim/nvim-lspconfig",
  opts = {
    servers = {
      vtsls = {
        settings = {
          vtsls = {
            experimental = {
              completion = {
                enableServerSideFuzzyMatch = true,
                entriesLimit = 30,
              },
            },
          },
          typescript = {
            preferences = {
              includePackageJsonAutoImports = "off",
            },
            tsserver = {
              maxTsServerMemory = 8192,
            },
          },
        },
      },
    },
  },
}
