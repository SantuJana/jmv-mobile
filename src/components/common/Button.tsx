import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle
} from "react-native";
import { COLORS, FONTS } from "../../theme/design";

type ButtonVariant = "primary" | "secondary" | "outline" | "text";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  isLoading = false,
  disabled = false,
  style,
  textStyle
}: ButtonProps) {
  const getContainerStyle = (pressed: boolean) => {
    const baseStyle = [styles.container, style];
    
    if (disabled) {
      baseStyle.push(styles.disabled);
    } else if (pressed) {
      baseStyle.push(styles.pressed);
    }

    switch (variant) {
      case "primary":
        baseStyle.push(styles.primaryContainer);
        break;
      case "secondary":
        baseStyle.push(styles.secondaryContainer);
        break;
      case "outline":
        baseStyle.push(styles.outlineContainer);
        break;
      case "text":
        baseStyle.push(styles.textContainer);
        break;
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, textStyle];

    if (disabled) {
      baseStyle.push(styles.textDisabled);
      return baseStyle;
    }

    switch (variant) {
      case "primary":
        baseStyle.push(styles.primaryText);
        break;
      case "secondary":
        baseStyle.push(styles.secondaryText);
        break;
      case "outline":
      case "text":
        baseStyle.push(styles.outlineText);
        break;
    }

    return baseStyle;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => getContainerStyle(pressed)}
    >
      {isLoading ? (
        <ActivityIndicator 
          color={variant === "primary" ? COLORS.surface : COLORS.primary} 
          size="small" 
        />
      ) : (
        <Text style={getTextStyle()}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }]
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "600",
  },
  textDisabled: {
    color: COLORS.textMuted
  },
  
  // Primary
  primaryContainer: {
    backgroundColor: COLORS.primary,
  },
  primaryText: {
    color: COLORS.surface,
  },

  // Secondary
  secondaryContainer: {
    backgroundColor: COLORS.surfaceMuted,
  },
  secondaryText: {
    color: COLORS.textPrimary,
  },

  // Outline
  outlineContainer: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  outlineText: {
    color: COLORS.primary,
  },

  // Text
  textContainer: {
    backgroundColor: "transparent",
    height: "auto",
    paddingHorizontal: 8,
  }
});
