import { Platform } from "react-native";

export const COLORS = {
  background: "#F8FAF9",     // very light mint/gray
  surface: "#FFFFFF",
  surfaceMuted: "#F0FDF4",   // light green tint
  border: "#E2E8F0",
  textPrimary: "#064E3B",    // deep forest green
  textSecondary: "#047857",  // darker emerald
  textMuted: "#94A3B8",
  primary: "#10B981",        // vivid emerald
  primaryLight: "#D1FAE5",   // soft emerald tint
  primaryDeep: "#059669",    // rich emerald
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",        // vivid emerald
  info: "#3B82F6",
  chipBg: "#ECFDF5",         // very light emerald
  tabBg: "rgba(255, 255, 255, 0.75)" // translucent for blur
} as const;

export const FONTS = {
  heading: Platform.select({
    ios: "AvenirNext-Bold",
    android: "sans-serif-medium",
    default: "sans-serif"
  }),
  body: Platform.select({
    ios: "Avenir Next",
    android: "sans-serif",
    default: "sans-serif"
  }),
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace"
  })
} as const;

export const ELEVATION = {
  card: {
    elevation: 4,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16
  },
  floating: {
    elevation: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32
  },
  sheet: {
    elevation: 24,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 24
  }
};
