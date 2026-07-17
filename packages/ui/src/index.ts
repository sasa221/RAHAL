export const designTokens = {
  color: {
    charcoal: "#1A1A1A",
    charcoalSoft: "#282826",
    warmGold: "#C5A059",
    warmGoldDark: "#8A682C",
    warmGoldSoft: "#F3E8D1",
    offWhite: "#F9F9F9",
    white: "#FFFFFF",
    ink: "#171815",
    muted: "#686962",
    border: "#E5E5E5",
    success: "#247647",
  },
  typography: {
    body: "Tahoma, Arial, sans-serif",
    english: "Arial, sans-serif",
    display: "Georgia, 'Times New Roman', serif",
    sizes: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.35rem",
    },
    lineHeight: { tight: 1.08, body: 1.75 },
  },
  spacing: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.5rem",
    6: "2rem",
    7: "3rem",
    8: "4.5rem",
  },
  radius: { sm: "0.5rem", md: "0.85rem", lg: "1.25rem" },
  shadow: {
    sm: "0 8px 24px rgb(26 26 26 / 8%)",
    lg: "0 24px 60px rgb(26 26 26 / 16%)",
  },
  container: { default: "1240px", wide: "1420px" },
  breakpoint: { mobile: "390px", tablet: "768px", desktop: "1440px", wide: "1920px" },
  focusRing: "0 0 0 3px rgb(197 160 89 / 35%)",
} as const;

export const brandTokens = {
  charcoal: designTokens.color.charcoal,
  warmGold: designTokens.color.warmGold,
  offWhite: designTokens.color.offWhite,
  borderGray: designTokens.color.border,
} as const;

export type ButtonTone = "dark" | "gold" | "outline" | "glass" | "whatsapp";

export function buttonClassName(tone: ButtonTone = "dark") {
  return `button button--${tone}`;
}
