return {
  "nvim-neo-tree/neo-tree.nvim",
  opts = {
    filesystem = {
      filtered_items = {
        hide_dotfiles = false,
        hide_gitignored = true,
        hide_ignored = false,
        hide_hidden = false, -- only works on Windows for hidden files/directories
      },
    },
  },
}
