import type { KeyId } from "@earendil-works/pi-tui";

type KeyParts = Readonly<{ key: string; modifiers: readonly string[] }>;

const FUNCTION_KEY_COUNT = 12;

const MODIFIERS: readonly string[] = ["ctrl", "shift", "alt", "super"];

const CHARACTER_KEYS =
  "a b c d e f g h i j k l m n o p q r s t u v w x y z 0 1 2 3 4 5 6 7 8 9 " +
  "` - = [ ] \\ ; ' , . / ! @ # $ % ^ & * ( ) _ + | ~ { } : < > ?";

const NAMED_KEYS =
  "escape esc enter return tab space backspace delete insert clear home end " +
  "pageUp pageDown up down left right";

const BASE_KEYS: ReadonlySet<string> = new Set([
  ...`${CHARACTER_KEYS} ${NAMED_KEYS}`.split(" "),
  ...Array.from({ length: FUNCTION_KEY_COUNT }, (_slot, index) => `f${index + 1}`),
]);

const BASE_KEYS_BY_LOWERCASE = new Map([...BASE_KEYS].map((key) => [key.toLowerCase(), key]));

function splitModifiers(text: string): KeyParts {
  const modifier = MODIFIERS.find((name) => text.startsWith(`${name}+`));

  if (modifier === undefined) {
    return { key: text, modifiers: [] };
  }

  const rest = splitModifiers(text.slice(modifier.length + 1));

  return { key: rest.key, modifiers: [modifier, ...rest.modifiers] };
}

export function isKeyId(text: string): text is KeyId {
  const { key, modifiers } = splitModifiers(text);

  return BASE_KEYS.has(key) && new Set(modifiers).size === modifiers.length;
}

export function canonicalKeyText(text: string): string {
  const { key, modifiers } = splitModifiers(text.toLowerCase());

  return [...modifiers, BASE_KEYS_BY_LOWERCASE.get(key) ?? key].join("+");
}
