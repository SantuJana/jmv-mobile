import { Platform } from "react-native";

export const COLORS = {
  background: "#FFF8F2",
  surface: "#FFFFFF",
  surfaceMuted: "#FFF3E5",
  border: "#F1DFC9",
  textPrimary: "#1F2330",
  textSecondary: "#5C6375",
  textMuted: "#8D93A6",
  primary: "#FC8019",
  primaryDeep: "#E86B00",
  danger: "#EF4F5F",
  warning: "#F7D348",
  success: "#1EA672",
  info: "#00A6B6",
  chipBg: "#FFF1E2",
  tabBg: "#FFFFFF"
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
    elevation: 2,
    shadowColor: "#C85D00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },
  floating: {
    elevation: 6,
    shadowColor: "#8A3F00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18
  }
};
