import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
// @effect-diagnostics-next-line nodeBuiltinImport:off
import path from "node:path";

const RESET = "\u001B[0m";

const BOLD = "\u001B[1m";

const BAR_FILL = "─";

const BAR_SIDES = 2;

type Rgb = Readonly<{ red: number; green: number; blue: number }>;

const PALETTE: readonly Rgb[] = [
  { blue: 189, green: 83, red: 22 },
  { blue: 247, green: 129, red: 48 },
  { blue: 255, green: 171, red: 93 },
  { blue: 255, green: 205, red: 151 },
  { blue: 255, green: 171, red: 93 },
  { blue: 247, green: 129, red: 48 },
];

function mix(from: number, to: number, amount: number): number {
  return Math.round(from + (to - from) * amount);
}

function colorAt(position: number): Rgb {
  const scaled = (((position % 1) + 1) % 1) * PALETTE.length;
  const index = Math.floor(scaled);
  const amount = scaled - index;
  const from = PALETTE[index];
  const to = PALETTE[(index + 1) % PALETTE.length];

  if (!from || !to) {
    throw new Error("palette index out of bounds");
  }

  return {
    blue: mix(from.blue, to.blue, amount),
    green: mix(from.green, to.green, amount),
    red: mix(from.red, to.red, amount),
  };
}

function paint({ red, green, blue }: Rgb, text: string): string {
  return `\u001B[38;2;${red};${green};${blue}m${text}${RESET}`;
}

function gradient(text: string): string {
  const chars = Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
    ({ segment }) => segment,
  );

  const span = Math.max(chars.length - 1, 1);

  return chars
    .map((char, index) => (char === " " ? char : paint(colorAt(index / span), char)))
    .join("");
}

const projectName = path.basename(process.cwd()) || "session";

function headerLine(width: number, modelId: string): string {
  if (width <= 0) {
    return "";
  }

  const label = ` PI / ${modelId} / ${projectName} `;
  const labelWidth = visibleWidth(label);

  if (labelWidth >= width) {
    return label;
  }

  const fillWidth = width - labelWidth;
  const leftWidth = Math.floor(fillWidth / BAR_SIDES);
  const rightWidth = fillWidth - leftWidth;

  return `${BAR_FILL.repeat(leftWidth)}${label}${BAR_FILL.repeat(rightWidth)}`;
}

function renderHeader(width: number, modelId: string): string[] {
  return [
    "",
    truncateToWidth(`${BOLD}${gradient(headerLine(width, modelId))}${RESET}`, width, ""),
    "",
  ];
}

export default function uiMoto(pi: ExtensionAPI): void {
  let requestRender: (() => void) | undefined;
  let currentModelId = "no model selected";

  function installHeader(ctx: ExtensionContext): void {
    ctx.ui.setHeader((tui) => {
      requestRender = (): void => {
        tui.requestRender();
      };

      return {
        invalidate: (): void => {
          tui.requestRender();
        },
        render: (width: number): string[] => renderHeader(width, currentModelId),
      };
    });
  }

  pi.on("session_start", (_event, ctx) => {
    currentModelId = ctx.model?.id ?? "no model selected";

    if (ctx.hasUI) {
      installHeader(ctx);
    }
  });

  pi.on("model_select", (event) => {
    currentModelId = event.model.id;
    requestRender?.();
  });

  pi.on("session_shutdown", (_event, ctx) => {
    requestRender = undefined;

    if (ctx.hasUI) {
      ctx.ui.setHeader(undefined);
    }
  });
}
