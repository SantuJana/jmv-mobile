import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { SkeletonBlock } from "../components/common/SkeletonBlock";

import { apiClient, getErrorMessage } from "../lib/api-client";
import { formatCurrency } from "../lib/format";
import {
  findBestOfferVariant,
  getVariantDetailImageUris,
  getVariantDiscountLabel,
  getVariantThumbnailImageUri
} from "../lib/product-utils";
import { useAuth } from "../providers/auth-provider";
import { useWishlist } from "../providers/wishlist-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { ApiResponse, Cart, Product, ProductVariant } from "../types/api";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ProductDetail">;

export function ProductDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { product } = route.params;

  const { isAuthenticated, authorizedRequest } = useAuth();
  const [productDetails, setProductDetails] = useState<Product>(product);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isLoadingVariants, setIsLoadingVariants] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId]
  );
  const imageUris = useMemo(() => getVariantDetailImageUris(selectedVariant, productDetails), [productDetails, selectedVariant]);

  useEffect(() => {
    let isMounted = true;

    const fetchVariants = async () => {
      setIsLoadingVariants(true);
      setError(null);
      try {
        const response = await apiClient<ApiResponse<{ product: Product }>>(
          `/products/${product.id}`
        );
        if (isMounted) {
          const fetchedProduct = response.data.product;
          const activeVariants = fetchedProduct.variants.filter((v) => v.isActive);
          setProductDetails(fetchedProduct);
          setVariants(activeVariants);
          if (activeVariants.length > 0) {
            setSelectedVariantId(findBestOfferVariant(activeVariants)?.id ?? activeVariants[0].id);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(getErrorMessage(err, "Could not load variants"));
        }
      } finally {
        if (isMounted) {
          setIsLoadingVariants(false);
        }
      }
    };

    void fetchVariants();

    return () => {
      isMounted = false;
    };
  }, [product.id]);

  const handleAddToCart = useCallback(async () => {
    if (!selectedVariantId) return;

    if (!isAuthenticated) {
      navigation.navigate("Main", { screen: "AccountTab" });
      return;
    }

    setIsAddingToCart(true);
    try {
      await authorizedRequest<ApiResponse<{ cart: Cart }>>("/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, variantId: selectedVariantId, quantity: 1 })
      });
      navigation.goBack();
    } catch (addError) {
      Alert.alert("Error", getErrorMessage(addError, "Could not add item to cart."));
    } finally {
      setIsAddingToCart(false);
    }
  }, [selectedVariantId, isAuthenticated, authorizedRequest, product.id, navigation]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.imageHeader}>
          {imageUris.length > 0 ? (
            <ProductImageCarousel imageUris={imageUris} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons color={COLORS.textMuted} name="image-outline" size={64} />
            </View>
          )}

          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              { top: Math.max(insets.top, 20) },
              pressed && styles.pressed
            ]}
          >
            <Ionicons color={COLORS.textPrimary} name="close" size={24} />
          </Pressable>

          <Pressable
            onPress={() => void toggleWishlist(product.id)}
            style={({ pressed }) => [
              styles.wishlistButton,
              { top: Math.max(insets.top, 20) },
              pressed && styles.pressed
            ]}
          >
            <Ionicons 
              color={wishlisted ? COLORS.danger : COLORS.textPrimary} 
              name={wishlisted ? "heart" : "heart-outline"} 
              size={24} 
            />
          </Pressable>
        </View>

        <View style={[styles.detailsContainer, { paddingBottom: insets.bottom + 120 }]}>
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>{productDetails.category.name}</Text>
          </View>
          
          <Text style={styles.title}>{productDetails.name}</Text>
          {productDetails.description ? <Text style={styles.description}>{productDetails.description}</Text> : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.sectionTitle}>Select Option</Text>
          
          {isLoadingVariants ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : variants.length === 0 ? (
            <Text style={styles.outOfStockText}>Currently out of stock.</Text>
          ) : (
            <View style={styles.variantsList}>
              {variants.map((variant) => {
                const isSelected = variant.id === selectedVariantId;
                const isOutOfStock = variant.stock <= 0;
                const discountLabel = getVariantDiscountLabel(variant);
                const variantImageUri = getVariantThumbnailImageUri(variant, productDetails);

                return (
                  <Pressable
                    disabled={isOutOfStock}
                    key={variant.id}
                    onPress={() => setSelectedVariantId(variant.id)}
                    style={[
                      styles.variantItem,
                      isSelected && styles.variantItemSelected,
                      isOutOfStock && styles.variantItemDisabled
                    ]}
                  >
                    {variantImageUri ? (
                      <Image source={{ uri: variantImageUri }} style={styles.variantImage} />
                    ) : (
                      <View style={styles.variantImagePlaceholder}>
                        <Ionicons color={COLORS.textMuted} name="image-outline" size={18} />
                      </View>
                    )}
                    <View style={styles.variantInfo}>
                      <Text style={[styles.variantName, isSelected && styles.variantNameSelected]}>
                        {variant.name}
                      </Text>
                      <Text style={[styles.variantUnit, isSelected && styles.variantUnitSelected]}>
                        {variant.unit}
                      </Text>
                    </View>
                    <View style={styles.variantPriceWrap}>
                      <Text style={[styles.variantPrice, isSelected && styles.variantPriceSelected]}>
                        {formatCurrency(variant.price)}
                      </Text>
                      {variant.mrp && variant.mrp !== variant.price ? (
                        <Text style={styles.variantMrp}>{formatCurrency(variant.mrp)}</Text>
                      ) : null}
                      {discountLabel ? <Text style={styles.variantDiscount}>{discountLabel}</Text> : null}
                      {isOutOfStock && <Text style={styles.outOfStockBadge}>Out of Stock</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Bar */}
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.actionBarContent}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.priceValue}>
              {selectedVariant ? formatCurrency(selectedVariant.price) : "--"}
            </Text>
            {selectedVariant && selectedVariant.mrp && selectedVariant.mrp !== selectedVariant.price ? (
              <Text style={styles.priceMrp}>{formatCurrency(selectedVariant.mrp)}</Text>
            ) : null}
            {getVariantDiscountLabel(selectedVariant) ? (
              <Text style={styles.priceDiscount}>{getVariantDiscountLabel(selectedVariant)}</Text>
            ) : null}
          </View>
          
          <Pressable
            disabled={!selectedVariant || selectedVariant.stock <= 0 || isAddingToCart}
            onPress={handleAddToCart}
            style={({ pressed }) => [
              styles.addButton,
              (!selectedVariant || selectedVariant.stock <= 0) && styles.addButtonDisabled,
              pressed && styles.addButtonPressed
            ]}
          >
            {isAddingToCart ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <>
                <Ionicons color={COLORS.surface} name="cart" size={20} />
                <Text style={styles.addButtonText}>Add to Cart</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS.surface
  },
  imageHeader: {
    width: "100%",
    height: 380,
    backgroundColor: COLORS.surfaceMuted,
    position: "relative"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  carouselContainer: {
    width: "100%",
    height: 380,
  },
  paginationDots: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    width: 20,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.5
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    ...ELEVATION.card
  },
  wishlistButton: {
    position: "absolute",
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    ...ELEVATION.card
  },
  pressed: {
    opacity: 0.8
  },
  detailsContainer: {
    padding: 24,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    flex: 1,
    ...ELEVATION.sheet
  },
  metaPill: {
    backgroundColor: COLORS.chipBg,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16
  },
  metaText: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryDeep
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textPrimary,
    lineHeight: 34,
    marginBottom: 12
  },
  description: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 24
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONTS.body,
    fontSize: 14,
    marginBottom: 16
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 16
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: "center"
  },
  outOfStockText: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.danger,
    paddingVertical: 16
  },
  variantsList: {
    gap: 12
  },
  variantItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface
  },
  variantItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.chipBg
  },
  variantItemDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.surfaceMuted
  },
  variantImage: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    height: 52,
    marginRight: 12,
    width: 52
  },
  variantImagePlaceholder: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    marginRight: 12,
    width: 52
  },
  variantInfo: {
    flex: 1
  },
  variantName: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  variantNameSelected: {
    color: COLORS.primaryDeep
  },
  variantUnit: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted
  },
  variantUnitSelected: {
    color: COLORS.primaryDeep
  },
  variantPriceWrap: {
    alignItems: "flex-end"
  },
  variantPrice: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primaryDeep
  },
  variantPriceSelected: {
    color: COLORS.primaryDeep
  },
  variantMrp: {
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
    marginTop: 2
  },
  variantDiscount: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.heading,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  outOfStockBadge: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.danger,
    marginTop: 4,
    fontWeight: "600"
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 24,
    paddingTop: 16,
    ...ELEVATION.floating
  },
  actionBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  priceContainer: {
    flex: 1
  },
  priceLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4
  },
  priceValue: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.primaryDeep
  },
  priceMrp: {
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },
  priceDiscount: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.chipBg,
    borderRadius: 999,
    color: COLORS.primaryDeep,
    fontFamily: FONTS.heading,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    ...ELEVATION.card
  },
  addButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    elevation: 0
  },
  addButtonPressed: {
    backgroundColor: COLORS.primaryDeep
  },
  addButtonText: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.surface
  }
});

function ProductImageCarousel({ imageUris }: { imageUris: string[] }) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<Record<number, boolean>>({});

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    setActiveIndex(Math.round(x / width));
  };

  return (
    <View style={styles.carouselContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {imageUris.map((uri, index) => (
          <View key={uri} style={{ width, height: 380 }}>
            {!imagesLoaded[index] && (
              <View style={StyleSheet.absoluteFill}>
                <SkeletonBlock height={380} radius={0} />
              </View>
            )}
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="cover"
              onLoad={() => setImagesLoaded(prev => ({ ...prev, [index]: true }))}
            />
          </View>
        ))}
      </ScrollView>
      {imageUris.length > 1 ? (
        <View style={styles.paginationDots}>
          {imageUris.map((uri, index) => (
            <View
              key={uri}
              style={[
                styles.dot,
                index === activeIndex && styles.activeDot
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
