const ESCAPE = "\u001B";

export function stripSgr(text: string): string {
  return text
    .split(ESCAPE)
    .map((part, index) => (index === 0 ? part : part.slice(part.indexOf("m") + 1)))
    .join("");
}
