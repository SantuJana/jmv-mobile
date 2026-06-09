import { useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle } from "react-native";
import { COLORS } from "../../theme/design";

type SkeletonBlockProps = {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: ViewStyle;
};

export function SkeletonBlock({
  height,
  width = "100%",
  radius = 10,
  style
}: SkeletonBlockProps) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true
        })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          height,
          width,
          borderRadius: radius,
          opacity: pulseAnim
        },
        style
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.border,
    overflow: "hidden"
  }
});
