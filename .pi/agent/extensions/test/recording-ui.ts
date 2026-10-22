import type { ExtensionUIContext, Theme } from "@earendil-works/pi-coding-agent";

type HeaderFactory = Parameters<ExtensionUIContext["setHeader"]>[0];

type NoticeLevel = Parameters<ExtensionUIContext["notify"]>[1];

export type Notice = readonly [string, NoticeLevel];

type StatusUpdate = readonly [string, string | undefined];

export class RecordingUI implements ExtensionUIContext {
  public readonly theme: Theme;

  readonly #notices: Notice[] = [];

  readonly #statusUpdates: StatusUpdate[] = [];

  #header: HeaderFactory;

  public constructor(theme: Theme) {
    this.theme = theme;
  }

  public get notices(): readonly Notice[] {
    return this.#notices;
  }

  public get header(): HeaderFactory {
    return this.#header;
  }

  public statuses(key: string): (string | undefined)[] {
    return this.#statusUpdates.flatMap(([statusKey, text]) => (statusKey === key ? [text] : []));
  }

  public readonly notify = (message: string, level?: NoticeLevel): void => {
    this.#notices.push([message, level]);
  };

  public readonly setStatus = (key: string, text: string | undefined): void => {
    this.#statusUpdates.push([key, text]);
  };

  public readonly setHeader = (factory: HeaderFactory): void => {
    this.#header = factory;
  };

  public readonly select = async (): Promise<string | undefined> => undefined;

  public readonly confirm = async (): Promise<boolean> => false;

  public readonly input = async (): Promise<string | undefined> => undefined;

  public readonly editor = async (): Promise<string | undefined> => undefined;

  public readonly custom = async <Result>(): Promise<Result> => {
    throw new Error("RecordingUI cannot host custom components");
  };

  public readonly onTerminalInput = (): (() => void) => () => undefined;

  public readonly setWorkingMessage = (): void => undefined;

  public readonly setWorkingVisible = (): void => undefined;

  public readonly setWorkingIndicator = (): void => undefined;

  public readonly setHiddenThinkingLabel = (): void => undefined;

  public readonly setWidget = (): void => undefined;

  public readonly setFooter = (): void => undefined;

  public readonly setTitle = (): void => undefined;

  public readonly pasteToEditor = (): void => undefined;

  public readonly setEditorText = (): void => undefined;

  public readonly getEditorText = (): string => "";

  public readonly addAutocompleteProvider = (): void => undefined;

  public readonly setEditorComponent = (): void => undefined;

  public readonly getEditorComponent = (): ReturnType<ExtensionUIContext["getEditorComponent"]> =>
    undefined;

  public readonly getAllThemes = (): ReturnType<ExtensionUIContext["getAllThemes"]> => [];

  public readonly getTheme = (): Theme | undefined => undefined;

  public readonly setTheme = (): ReturnType<ExtensionUIContext["setTheme"]> => ({
    error: "RecordingUI cannot switch themes",
    success: false,
  });

  public readonly getToolsExpanded = (): boolean => false;

  public readonly setToolsExpanded = (): void => undefined;
}
