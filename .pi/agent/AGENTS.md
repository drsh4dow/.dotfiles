# Pi verification

To drive a TUI or any prompting program, run it inside a detached tmux session on a private socket, and drive that session with finite commands:

```bash
tmux -L <socket> new-session -d -s <name> -x 120 -y 40 '<command>'
tmux -L <socket> send-keys -t <name> 'text' Enter
tmux -L <socket> capture-pane -p -t <name>
tmux -L <socket> kill-server
```
