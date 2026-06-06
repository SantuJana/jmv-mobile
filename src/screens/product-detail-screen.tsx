import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  ImageStyle,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  StyleProp,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getErrorMessage } from "../lib/api-client";
import { formatCurrency } from "../lib/format";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { ApiResponse, Cart, Product, ProductVariant } from "../types/api";
import type { CartDropSource } from "./shop-screen";

type ProductDetailScreenProps = {
  bottomInset?: number;
  onBack: () => void;
  onCartDrop?: (source: CartDropSource) => void;
  onRequireAuth: () => void;
  product: Product;
};

type ShimmerImageProps = {
  resizeMode?: "cover" | "contain";
  sourceUri: string;
  style: StyleProp<ImageStyle>;
};

const findCheapestVariant = (variants: ProductVariant[]) => {
  if (variants.length === 0) {
    return null;
  }

  return variants.reduce((cheapest, current) => {
    if (Number(current.price) < Number(cheapest.price)) {
      return current;
    }

    return cheapest;
  }, variants[0]);
};

const getProductDetailImageUri = (product: Product) =>
  product.imageUrls?.detail ?? product.imageUrls?.card ?? product.imageUrls?.thumbnail ?? product.imageUrl;

const getProductGalleryImageUris = (product: Product) => {
  const primaryImageUri = getProductDetailImageUri(product);

  if (!primaryImageUri) {
    return [];
  }

  return [primaryImageUri, primaryImageUri, primaryImageUri, primaryImageUri];
};

function ShimmerImage({ resizeMode = "cover", sourceUri, style }: ShimmerImageProps) {
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

export function ProductDetailScreen({
  bottomInset = 24,
  onBack,
  onCartDrop,
  onRequireAuth,
  product
}: ProductDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { authorizedRequest, isAuthenticated } = useAuth();
  const { width: viewportWidth } = useWindowDimensions();
  const galleryScrollRef = useRef<ScrollView>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const imageUri = getProductDetailImageUri(product);
  const galleryImageUris = useMemo(() => getProductGalleryImageUris(product), [product]);
  const imagePanelWidth = viewportWidth;
  const variants = useMemo(() => product.variants.filter((variant) => variant.isActive), [product.variants]);
  const selectedVariant = useMemo(() => {
    if (variants.length === 0) {
      return null;
    }

    if (selectedVariantId) {
      const variant = variants.find((item) => item.id === selectedVariantId);

      if (variant) {
        return variant;
      }
    }

    return findCheapestVariant(variants);
  }, [selectedVariantId, variants]);
  const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0;

  const handleGalleryMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / imagePanelWidth);

    setActiveImageIndex(Math.max(0, Math.min(nextIndex, galleryImageUris.length - 1)));
  };

  const selectGalleryImage = (index: number) => {
    setActiveImageIndex(index);
    galleryScrollRef.current?.scrollTo({
      animated: true,
      x: index * imagePanelWidth
    });
  };

  const handleAddToCart = async (dropSource?: CartDropSource | null) => {
    if (!selectedVariant) {
      return;
    }

    if (!isAuthenticated) {
      Alert.alert("Sign in required", "Please sign in before adding items to cart.");
      onRequireAuth();
      return;
    }

    setAddingVariantId(selectedVariant.id);

    try {
      await authorizedRequest<ApiResponse<{ cart: Cart }>>("/cart/items", {
        method: "POST",
        body: JSON.stringify({
          quantity: 1,
          variantId: selectedVariant.id
        })
      });
      if (dropSource) {
        onCartDrop?.(dropSource);
      }
    } catch (addError) {
      Alert.alert("Could not add to cart", getErrorMessage(addError, "Please try again"));
    } finally {
      setAddingVariantId(null);
    }
  };

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 92 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.imagePanel, { height: 318 + insets.top }]}>
          {galleryImageUris.length > 0 ? (
            <>
              <ScrollView
                ref={galleryScrollRef}
                decelerationRate="fast"
                horizontal
                onMomentumScrollEnd={handleGalleryMomentumEnd}
                pagingEnabled
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={false}
              >
                {galleryImageUris.map((galleryImageUri, index) => (
                  <ShimmerImage
                    key={`${galleryImageUri}-${index}`}
                    resizeMode="cover"
                    sourceUri={galleryImageUri}
                    style={[styles.productImage, { width: imagePanelWidth }]}
                  />
                ))}
              </ScrollView>

              <View style={styles.galleryCounter}>
                <Text style={styles.galleryCounterText}>
                  {activeImageIndex + 1}/{galleryImageUris.length}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons color={COLORS.textMuted} name="image-outline" size={34} />
            </View>
          )}
        </View>

        {galleryImageUris.length > 0 ? (
          <ScrollView contentContainerStyle={styles.thumbnailRow} horizontal showsHorizontalScrollIndicator={false}>
            {galleryImageUris.map((galleryImageUri, index) => {
              const isActive = index === activeImageIndex;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={`${galleryImageUri}-thumb-${index}`}
                  onPress={() => selectGalleryImage(index)}
                  style={[styles.thumbnailButton, isActive ? styles.thumbnailButtonActive : null]}
                >
                  <ShimmerImage resizeMode="cover" sourceUri={galleryImageUri} style={styles.thumbnailImage} />
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.categoryPill}>
          <Ionicons color={COLORS.primaryDeep} name="leaf-outline" size={13} />
          <Text numberOfLines={1} style={styles.categoryText}>
            {product.category.name}
          </Text>
        </View>

        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.description}>
          {product.description?.trim() || "Fresh grocery essential selected for everyday home needs."}
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoTile}>
            <Ionicons color={COLORS.success} name="shield-checkmark-outline" size={18} />
            <Text style={styles.infoTitle}>Quality checked</Text>
          </View>
          <View style={styles.infoTile}>
            <Ionicons color={COLORS.info} name="time-outline" size={18} />
            <Text style={styles.infoTitle}>Fast delivery</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose Pack</Text>
          <Text style={styles.sectionHint}>{variants.length} options</Text>
        </View>

        <View style={styles.variantList}>
          {variants.map((variant) => {
            const isSelected = selectedVariant?.id === variant.id;
            const variantOutOfStock = variant.stock <= 0;

            return (
              <Pressable
                disabled={variantOutOfStock}
                key={variant.id}
                onPress={() => setSelectedVariantId(variant.id)}
                style={[
                  styles.variantOption,
                  isSelected ? styles.variantOptionSelected : null,
                  variantOutOfStock ? styles.variantOptionDisabled : null
                ]}
              >
                <View style={styles.variantOptionText}>
                  <Text style={styles.variantName}>{variant.name}</Text>
                  <Text style={styles.variantMeta}>
                    {variant.unit} · {variantOutOfStock ? "Out of stock" : `${variant.stock} in stock`}
                  </Text>
                </View>
                <Text style={styles.variantPrice}>{formatCurrency(variant.price)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View pointerEvents="box-none" style={[styles.headerRow, { top: insets.top + 10 }]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.iconButton}>
          <Ionicons color={COLORS.textPrimary} name="chevron-back" size={22} />
        </Pressable>
      </View>

      <View style={[styles.footer, { bottom: Math.max(bottomInset - 2, 14) }]}>
        <View style={styles.footerPriceBlock}>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerPrice}>{selectedVariant ? formatCurrency(selectedVariant.price) : "Unavailable"}</Text>
        </View>
        <Pressable
          disabled={!selectedVariant || isOutOfStock || addingVariantId === selectedVariant?.id}
          onPress={(event) =>
            void handleAddToCart({
              imageUri,
              x: event.nativeEvent.pageX,
              y: event.nativeEvent.pageY
            })
          }
          style={[
            styles.addButton,
            !selectedVariant || isOutOfStock ? styles.addButtonDisabled : null,
            addingVariantId === selectedVariant?.id ? styles.addButtonBusy : null
          ]}
        >
          {selectedVariant && addingVariantId === selectedVariant.id ? (
            <ActivityIndicator color={COLORS.surface} size="small" />
          ) : (
            <>
              <Ionicons color={COLORS.surface} name="bag-add" size={18} />
              <Text style={styles.addButtonText}>{isOutOfStock ? "Out of Stock" : "Add to Cart"}</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background,
    flex: 1
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 0
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    left: 14,
    position: "absolute",
    right: 14,
    zIndex: 20
  },
  iconButton: {
    ...ELEVATION.floating,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  imagePanel: {
    ...ELEVATION.card,
    backgroundColor: "#F3F8F5",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginHorizontal: -14,
    overflow: "hidden"
  },
  productImage: {
    height: "100%"
  },
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
  },
  productImagePlaceholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  galleryCounter: {
    backgroundColor: "rgba(31,35,48,0.72)",
    borderRadius: 999,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: "absolute",
    right: 12
  },
  galleryCounterText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "900"
  },
  thumbnailRow: {
    gap: 9,
    paddingRight: 2,
    paddingTop: 10
  },
  thumbnailButton: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 62,
    overflow: "hidden",
    padding: 3,
    width: 62
  },
  thumbnailButtonActive: {
    borderColor: COLORS.primary,
    borderWidth: 2
  },
  thumbnailImage: {
    borderRadius: 9,
    height: "100%",
    width: "100%"
  },
  categoryPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    flexDirection: "row",
    marginTop: 16,
    maxWidth: "100%",
    paddingHorizontal: 11,
    paddingVertical: 6
  },
  categoryText: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 5
  },
  productName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 31,
    marginTop: 10
  },
  description: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
    marginTop: 8
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  infoTile: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    minHeight: 46,
    paddingHorizontal: 10
  },
  infoTitle: {
    color: COLORS.textSecondary,
    flexShrink: 1,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 7
  },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800"
  },
  sectionHint: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "700"
  },
  variantList: {
    gap: 9,
    marginTop: 10
  },
  variantOption: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  variantOptionSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1.5
  },
  variantOptionDisabled: {
    opacity: 0.52
  },
  variantOptionText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10
  },
  variantName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "800"
  },
  variantMeta: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4
  },
  variantPrice: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "900"
  },
  footer: {
    ...ELEVATION.floating,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    bottom: 14,
    flexDirection: "row",
    left: 14,
    padding: 10,
    position: "absolute",
    right: 14
  },
  footerPriceBlock: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 4,
    paddingRight: 10
  },
  footerLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700"
  },
  footerPrice: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2
  },
  addButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18
  },
  addButtonDisabled: {
    backgroundColor: "#C8C4BD"
  },
  addButtonBusy: {
    opacity: 0.84
  },
  addButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "900"
  }
});
