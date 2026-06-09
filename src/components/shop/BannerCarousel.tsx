import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, ELEVATION, FONTS } from "../../theme/design";
import type { Banner } from "../../types/api";

type BannerCarouselProps = {
  banners: Banner[];
  onBannerPress: (banner: Banner) => void;
};

const BANNER_AUTO_SLIDE_MS = 4200;
const BANNER_GAP = 16;

export function BannerCarousel({ banners, onBannerPress }: BannerCarouselProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerVirtualIndexRef = useRef(0);
  const bannerSlideX = useRef(new Animated.Value(0)).current;
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const bannerCardWidth = Math.min(viewportWidth - 32, 400);
  const bannerSnapInterval = bannerCardWidth + BANNER_GAP;
  // Maintain a ~16:7 aspect ratio for the banner image
  const bannerImageHeight = Math.round(bannerCardWidth * (7 / 16));

  const circularBanners = useMemo(() => {
    if (banners.length <= 1) {
      return banners;
    }
    return [banners[banners.length - 1], ...banners, banners[0]];
  }, [banners]);

  useEffect(() => {
    const listenerId = bannerSlideX.addListener(({ value }) => {
      bannerScrollRef.current?.scrollTo({
        animated: false,
        x: value
      });
    });

    return () => {
      bannerSlideX.removeListener(listenerId);
    };
  }, [bannerSlideX]);

  useEffect(() => {
    const initialVirtualIndex = banners.length > 1 ? 1 : 0;

    bannerVirtualIndexRef.current = initialVirtualIndex;
    setActiveBannerIndex(0);

    requestAnimationFrame(() => {
      bannerScrollRef.current?.scrollTo({
        animated: false,
        x: initialVirtualIndex * bannerSnapInterval
      });
    });
  }, [bannerSnapInterval, banners.length]);

  useEffect(() => {
    if (banners.length <= 1) {
      return undefined;
    }

    const timer = setInterval(() => {
      const nextVirtualIndex = bannerVirtualIndexRef.current + 1;
      const nextRealIndex = nextVirtualIndex > banners.length ? 0 : nextVirtualIndex - 1;

      setActiveBannerIndex(nextRealIndex);
      bannerSlideX.stopAnimation();
      bannerSlideX.setValue(bannerVirtualIndexRef.current * bannerSnapInterval);
      Animated.timing(bannerSlideX, {
        duration: 620,
        easing: Easing.inOut(Easing.cubic),
        toValue: nextVirtualIndex * bannerSnapInterval,
        useNativeDriver: false
      }).start(({ finished }) => {
        if (!finished) return;

        if (nextVirtualIndex > banners.length) {
          bannerVirtualIndexRef.current = 1;
          bannerSlideX.setValue(bannerSnapInterval);
          bannerScrollRef.current?.scrollTo({
            animated: false,
            x: bannerSnapInterval
          });
          return;
        }

        bannerVirtualIndexRef.current = nextVirtualIndex;
      });
    }, BANNER_AUTO_SLIDE_MS);

    return () => clearInterval(timer);
  }, [bannerSlideX, bannerSnapInterval, banners.length]);

  const handleBannerMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (banners.length <= 1) {
      bannerVirtualIndexRef.current = 0;
      setActiveBannerIndex(0);
      return;
    }

    const nextVirtualIndex = Math.round(event.nativeEvent.contentOffset.x / bannerSnapInterval);

    if (nextVirtualIndex <= 0) {
      bannerVirtualIndexRef.current = banners.length;
      setActiveBannerIndex(banners.length - 1);
      bannerScrollRef.current?.scrollTo({
        animated: false,
        x: banners.length * bannerSnapInterval
      });
      return;
    }

    if (nextVirtualIndex >= banners.length + 1) {
      bannerVirtualIndexRef.current = 1;
      setActiveBannerIndex(0);
      bannerScrollRef.current?.scrollTo({
        animated: false,
        x: bannerSnapInterval
      });
      return;
    }

    bannerVirtualIndexRef.current = nextVirtualIndex;
    setActiveBannerIndex(nextVirtualIndex - 1);
  };

  if (banners.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{"Today's Offers"}</Text>
        <Text style={styles.hint}>{banners.length} live</Text>
      </View>

      <ScrollView
        ref={bannerScrollRef}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={handleBannerMomentumEnd}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToInterval={bannerSnapInterval}
        snapToEnd
        snapToStart
      >
        {circularBanners.map((banner, virtualIndex) => {
          const imageUri = banner.imageUrls?.detail ?? banner.imageUrls?.card ?? banner.imageUrl;

          return (
            <Pressable
              accessibilityRole="button"
              key={`${banner.id}-${virtualIndex}`}
              onPress={() => onBannerPress(banner)}
              style={({ pressed }) => [
                styles.card,
                { marginRight: BANNER_GAP, width: bannerCardWidth },
                pressed && styles.cardPressed
              ]}
            >
              <View style={styles.cardInner}>
                <View style={[styles.imageWrap, { height: bannerImageHeight }]}>
                  {imageUri ? (
                    <Image resizeMode="cover" source={{ uri: imageUri }} style={styles.image} />
                  ) : (
                    <LinearGradient
                      colors={["#FFD3A3", "#A5E1C9"]}
                      end={{ x: 1, y: 1 }}
                      start={{ x: 0, y: 0 }}
                      style={styles.image}
                    />
                  )}
                </View>

                <View style={styles.footer}>
                  <View style={styles.footerTextContainer}>
                    <Text numberOfLines={1} style={styles.bannerTitle}>
                      {banner.title}
                    </Text>
                    {banner.subtitle ? (
                      <Text numberOfLines={1} style={styles.bannerSubtitle}>
                        {banner.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {banner.ctaLabel ? (
                    <View style={styles.cta}>
                      <Text numberOfLines={1} style={styles.ctaText}>
                        {banner.ctaLabel}
                      </Text>
                      <Ionicons color={COLORS.surface} name="arrow-forward" size={14} />
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((banner, index) => (
            <View
              key={banner.id}
              style={[styles.dot, index === activeBannerIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "800",
  },
  hint: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 16 - BANNER_GAP,
    paddingBottom: 8, // allow shadow to breathe on bottom
    paddingTop: 4,    // allow shadow to breathe on top
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    ...ELEVATION.card,
    // No overflow:hidden here — that clips the shadow on Android
  },
  cardInner: {
    borderRadius: 20,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageWrap: {
    backgroundColor: COLORS.surfaceMuted,
    overflow: "hidden",
    // height is set dynamically via inline style
  },
  image: {
    height: "100%",
    width: "100%",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  footerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700",
  },
  bannerSubtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginTop: 2,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 4,
  },
  ctaText: {
    color: COLORS.surface,
    fontFamily: FONTS.heading,
    fontSize: 12,
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    gap: 6,
  },
  dot: {
    backgroundColor: COLORS.border,
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 20,
  },
});
