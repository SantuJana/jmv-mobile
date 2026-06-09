import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, ImageStyle, LayoutChangeEvent, StyleProp, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type ShimmerImageProps = {
  resizeMode?: "cover" | "contain";
  sourceUri: string;
  style: StyleProp<ImageStyle>;
};

export function ShimmerImage({ resizeMode = "cover", sourceUri, style }: ShimmerImageProps) {
  const shimmerProgress = useRef(new Animated.Value(0)).current;
  const shimmerOpacity = useRef(new Animated.Value(1)).current;
  const [isLoaded, setIsLoaded] = useState(false);
  const [canHideShimmer, setCanHideShimmer] = useState(false);
  const [frameWidth, setFrameWidth] = useState(320);
  const shimmerBandWidth = Math.max(120, frameWidth * 0.42);
  const shimmerTranslateX = shimmerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-shimmerBandWidth, frameWidth + shimmerBandWidth]
  });

  useEffect(() => {
    shimmerProgress.setValue(0);
    shimmerOpacity.setValue(1);
    setIsLoaded(false);
    setCanHideShimmer(false);

    const minimumVisibilityTimer = setTimeout(() => {
      setCanHideShimmer(true);
    }, 950);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerProgress, {
          duration: 0,
          toValue: 0,
          useNativeDriver: true
        }),
        Animated.timing(shimmerProgress, {
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.delay(120)
      ])
    );

    animation.start();

    return () => {
      clearTimeout(minimumVisibilityTimer);
      animation.stop();
    };
  }, [shimmerOpacity, shimmerProgress, sourceUri]);

  useEffect(() => {
    if (!isLoaded || !canHideShimmer) {
      return;
    }

    Animated.timing(shimmerOpacity, {
      duration: 180,
      toValue: 0,
      useNativeDriver: true
    }).start();
  }, [canHideShimmer, isLoaded, shimmerOpacity]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setFrameWidth(Math.max(1, event.nativeEvent.layout.width));
  };

  return (
    <View onLayout={handleLayout} style={[styles.shimmerImageFrame, style]}>
      <Image
        onLoadEnd={() => setIsLoaded(true)}
        onLoadStart={() => setIsLoaded(false)}
        resizeMode={resizeMode}
        source={{ uri: sourceUri }}
        style={styles.shimmerImage}
      />
      {!isLoaded || !canHideShimmer ? (
        <Animated.View pointerEvents="none" style={[styles.shimmerOverlay, { opacity: shimmerOpacity }]}>
          <LinearGradient
            colors={["#E7F0EA", "#F4FAF6", "#E5EEE8"]}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.shimmerBase}
          />
          <Animated.View
            style={[
              styles.shimmerBandTrack,
              {
                width: shimmerBandWidth,
                transform: [{ translateX: shimmerTranslateX }, { rotate: "11deg" }]
              }
            ]}
          >
            <LinearGradient
              colors={[
                "rgba(255,255,255,0)",
                "rgba(255,255,255,0.34)",
                "rgba(255,255,255,0.92)",
                "rgba(255,255,255,0.34)",
                "rgba(255,255,255,0)"
              ]}
              end={{ x: 1, y: 0.5 }}
              locations={[0, 0.28, 0.5, 0.72, 1]}
              start={{ x: 0, y: 0.5 }}
              style={styles.shimmerBand}
            />
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shimmerImageFrame: {
    backgroundColor: "#EAF2ED",
    overflow: "hidden"
  },
  shimmerImage: {
    height: "100%",
    width: "100%"
  },
  shimmerOverlay: {
    backgroundColor: "#EAF2ED",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  shimmerBase: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  shimmerBandTrack: {
    height: "150%",
    left: 0,
    position: "absolute",
    top: "-25%"
  },
  shimmerBand: {
    flex: 1
  }
});
