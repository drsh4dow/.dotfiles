return {
  {
    "alexghergh/nvim-tmux-navigation",
    keys = {
      {
        "<C-A-j>",
        function()
          require("nvim-tmux-navigation").NvimTmuxNavigateDown()
        end,
        desc = "Navigate down",
      },
      {
        "<C-A-h>",
        function()
          require("nvim-tmux-navigation").NvimTmuxNavigateLeft()
        end,
        desc = "Navigate left",
      },
      {
        "<C-A-k>",
        function()
          require("nvim-tmux-navigation").NvimTmuxNavigateUp()
        end,
        desc = "Navigate up",
      },
      {
        "<C-A-l>",
        function()
          require("nvim-tmux-navigation").NvimTmuxNavigateRight()
        end,
        desc = "Navigate right",
      },
    },
    opts = {
      disable_when_zoomed = true,
    },
  },
}
