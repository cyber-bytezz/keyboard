export type LayoutKey = {
  code: string;
  label: string;
  /** width in units, 1u = base keycap */
  w?: number;
};

export const KEYBOARD_ROWS: LayoutKey[][] = [
  [
    { code: "Escape", label: "esc" },
    { code: "F1", label: "F1" },
    { code: "F2", label: "F2" },
    { code: "F3", label: "F3" },
    { code: "F4", label: "F4" },
    { code: "F5", label: "F5" },
    { code: "F6", label: "F6" },
    { code: "F7", label: "F7" },
    { code: "F8", label: "F8" },
    { code: "F9", label: "F9" },
    { code: "F10", label: "F10" },
    { code: "F11", label: "F11" },
    { code: "F12", label: "F12" },
    { code: "Delete", label: "del", w: 2 },
  ],
  [
    { code: "Backquote", label: "`" },
    { code: "Digit1", label: "1" },
    { code: "Digit2", label: "2" },
    { code: "Digit3", label: "3" },
    { code: "Digit4", label: "4" },
    { code: "Digit5", label: "5" },
    { code: "Digit6", label: "6" },
    { code: "Digit7", label: "7" },
    { code: "Digit8", label: "8" },
    { code: "Digit9", label: "9" },
    { code: "Digit0", label: "0" },
    { code: "Minus", label: "-" },
    { code: "Equal", label: "=" },
    { code: "Backspace", label: "backspace", w: 2 },
  ],
  [
    { code: "Tab", label: "tab", w: 1.5 },
    { code: "KeyQ", label: "Q" },
    { code: "KeyW", label: "W" },
    { code: "KeyE", label: "E" },
    { code: "KeyR", label: "R" },
    { code: "KeyT", label: "T" },
    { code: "KeyY", label: "Y" },
    { code: "KeyU", label: "U" },
    { code: "KeyI", label: "I" },
    { code: "KeyO", label: "O" },
    { code: "KeyP", label: "P" },
    { code: "BracketLeft", label: "[" },
    { code: "BracketRight", label: "]" },
    { code: "Backslash", label: "\\", w: 1.5 },
  ],
  [
    { code: "CapsLock", label: "caps", w: 1.75 },
    { code: "KeyA", label: "A" },
    { code: "KeyS", label: "S" },
    { code: "KeyD", label: "D" },
    { code: "KeyF", label: "F" },
    { code: "KeyG", label: "G" },
    { code: "KeyH", label: "H" },
    { code: "KeyJ", label: "J" },
    { code: "KeyK", label: "K" },
    { code: "KeyL", label: "L" },
    { code: "Semicolon", label: ";" },
    { code: "Quote", label: "'" },
    { code: "Enter", label: "enter", w: 2.25 },
  ],
  [
    { code: "ShiftLeft", label: "shift", w: 2.25 },
    { code: "KeyZ", label: "Z" },
    { code: "KeyX", label: "X" },
    { code: "KeyC", label: "C" },
    { code: "KeyV", label: "V" },
    { code: "KeyB", label: "B" },
    { code: "KeyN", label: "N" },
    { code: "KeyM", label: "M" },
    { code: "Comma", label: "," },
    { code: "Period", label: "." },
    { code: "Slash", label: "/" },
    { code: "ShiftRight", label: "shift", w: 2.75 },
  ],
  [
    { code: "ControlLeft", label: "ctrl", w: 1.25 },
    { code: "MetaLeft", label: "cmd", w: 1.25 },
    { code: "AltLeft", label: "alt", w: 1.25 },
    { code: "Space", label: "space", w: 7.5 },
    { code: "AltRight", label: "alt", w: 1.25 },
    { code: "Fn", label: "fn", w: 1.25 },
    { code: "ControlRight", label: "ctrl", w: 1.25 },
  ],
];

export const ROW_UNITS = 15;

export type Tier = "accent" | "home_row" | "enter_shift" | "spacebar";

export const TIERS: {
  id: Tier;
  name: string;
  file: string;
  from: number;
  description: string;
}[] = [
  {
    id: "accent",
    name: "Accent key",
    file: "accent_key",
    from: 2,
    description:
      "Esc, function row, numbers and the top/bottom letter clusters. Small footprint, still in frame on every overhead shot.",
  },
  {
    id: "home_row",
    name: "Home row",
    file: "home_row",
    from: 3,
    description:
      "A through L. The keys my fingers rest on — they show up in every typing clip and close-up macro shot.",
  },
  {
    id: "enter_shift",
    name: "Enter / Shift",
    file: "enter_shift",
    from: 4,
    description:
      "Tab, Backspace, both Shifts and Enter. Wide caps with real logo real estate, readable at thumbnail size.",
  },
  {
    id: "spacebar",
    name: "Spacebar",
    file: "spacebar",
    from: 6,
    description:
      "6.25u of prime real estate. One sponsor, dead center, in the hero shot of every build video.",
  },
];

export const FUNDING_GOAL = 200;
export const MIN_INCREMENT = 1;
/** every bid is between $2 and $6 — never more */
export const MIN_BID = 2;
export const MAX_BID = 6;
/** bidders pay the full bid up front; outbid bids are refunded */
export const DEPOSIT_RATE = 1;

export function formatUsd(value: number) {
  return `$${new Intl.NumberFormat("en-US").format(Math.round(value))}`;
}
