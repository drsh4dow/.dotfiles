import { ProcessTerminal, TuiMainScreen } from "@earendil-works/pi-tui";

export class CountingTui extends TuiMainScreen {
  public renders = 0;

  public constructor() {
    super(new ProcessTerminal());
  }

  public override requestRender(): void {
    this.renders += 1;
  }
}
