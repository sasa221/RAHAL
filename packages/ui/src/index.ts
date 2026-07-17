export const brandTokens = {
  charcoal: "#1A1A1A",
  warmGold: "#C5A059",
  offWhite: "#F9F9F9",
  borderGray: "#E5E5E5",
} as const;

export type ButtonTone = "dark" | "gold" | "outline";

export function buttonClassName(tone: ButtonTone = "dark") {
  return `button button-${tone}`;
}
