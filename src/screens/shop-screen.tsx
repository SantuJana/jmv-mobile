import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiClient, getErrorMessage } from "../lib/api-client";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { ApiResponse, Banner, Cart, Category, PaginationMeta, Product, ProductVariant } from "../types/api";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";

import { ShopHero } from "../components/shop/ShopHero";
import { BannerCarousel } from "../components/shop/BannerCarousel";
import { CategoryList } from "../components/shop/CategoryList";
import { ProductCard } from "../components/shop/ProductCard";
import { VariantPickerSheet } from "../components/shop/VariantPickerSheet";
import { ShopSkeleton } from "../components/shop/ShopSkeleton";
import { findBestOfferVariant } from "../lib/product-utils";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "ShopTab">,
  NativeStackScreenProps<RootStackParamList>
>;

const PRODUCTS_PAGE_LIMIT = 100;
const CATEGORIES_PAGE_LIMIT = 100;
const BANNERS_PAGE_LIMIT = 10;
const LOCATION_FALLBACK_LABEL = "Current location unavailable";

const productsPath = (categorySlug: string | null) => {
  const basePath = `/products?limit=${PRODUCTS_PAGE_LIMIT}`;
  if (!categorySlug) return basePath;
  return `${basePath}&categorySlug=${encodeURIComponent(categorySlug)}`;
};

const compactUniqueParts = (parts: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const normalizedPart = part.toLowerCase();
      if (seen.has(normalizedPart)) return false;
      seen.add(normalizedPart);
      return true;
    });
};

const formatLocationLabel = (address: Location.LocationGeocodedAddress) => {
  const area = address.district ?? address.subregion ?? address.name ?? address.street;
  const city = address.city ?? address.region;
  const labelParts = compactUniqueParts([area, city, address.postalCode]);
  if (labelParts.length === 0) return LOCATION_FALLBACK_LABEL;
  return `Current · ${labelParts.slice(0, 3).join(", ")}`;
};

export function ShopScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom + 80;

  const scrollViewRef = useRef<ScrollView>(null);
  const cartToastOpacity = useRef(new Animated.Value(0)).current;
  const cartToastTranslateY = useRef(new Animated.Value(18)).current;
  const cartToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  const { isAuthenticated, authorizedRequest } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [variantPickerSelectionId, setVariantPickerSelectionId] = useState<string | null>(null);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cartToastMessage, setCartToastMessage] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState("Detecting current location...");

  useEffect(() => {
    return () => {
      if (cartToastTimerRef.current) clearTimeout(cartToastTimerRef.current);
    };
  }, []);

  const loadData = useCallback(async () => {
    setError(null);
    const [categoriesRes, bannersRes, productsRes] = await Promise.all([
      apiClient<ApiResponse<{ categories: Category[] }, PaginationMeta>>(
        `/categories?limit=${CATEGORIES_PAGE_LIMIT}`
      ),
      apiClient<ApiResponse<{ banners: Banner[] }, PaginationMeta>>(`/banners?limit=${BANNERS_PAGE_LIMIT}`),
      apiClient<ApiResponse<{ products: Product[] }, PaginationMeta>>(productsPath(selectedCategorySlug))
    ]);
    setCategories(categoriesRes.data.categories);
    setBanners(bannersRes.data.banners);
    setProducts(productsRes.data.products);
  }, [selectedCategorySlug]);

  useEffect(() => {
    const fetchData = async () => {
      if (isInitialLoad.current) {
        setIsLoading(true);
      }
      try {
        await loadData();
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Unable to load shop data"));
      } finally {
        setIsLoading(false);
        isInitialLoad.current = false;
      }
    };
    void fetchData();
  }, [loadData]);

  useEffect(() => {
    const detectLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationLabel("Location permission denied");
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });

        if (address) setLocationLabel(formatLocationLabel(address));
      } catch {
        setLocationLabel(LOCATION_FALLBACK_LABEL);
      }
    };

    void detectLocation();
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, "Unable to refresh shop data"));
    } finally {
      setIsRefreshing(false);
    }
  }, [loadData]);

  const handleCategorySelect = (slug: string | null) => {
    setSelectedCategorySlug(slug === selectedCategorySlug ? null : slug);
  };

  const showCartToast = useCallback((message: string) => {
    setCartToastMessage(message);
    if (cartToastTimerRef.current) clearTimeout(cartToastTimerRef.current);

    Animated.parallel([
      Animated.timing(cartToastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(cartToastTranslateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();

    cartToastTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(cartToastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(cartToastTranslateY, { toValue: 18, duration: 200, useNativeDriver: true })
      ]).start(() => setCartToastMessage(null));
    }, 2500);
  }, [cartToastOpacity, cartToastTranslateY]);

  const addToCart = useCallback(
    async (productId: string, variantId: string) => {
      if (!isAuthenticated) {
        navigation.navigate("AccountTab");
        return;
      }

      setAddingVariantId(variantId);
      try {
        await authorizedRequest<ApiResponse<{ cart: Cart }>>("/cart/items", {
          method: "POST",
          body: JSON.stringify({ productId, variantId, quantity: 1 })
        });
        showCartToast("Added to cart");
      } catch (addError) {
        Alert.alert("Error", getErrorMessage(addError, "Could not add item to cart."));
      } finally {
        setAddingVariantId(null);
      }
    },
    [authorizedRequest, isAuthenticated, navigation, showCartToast]
  );

  const handleProductAddPress = useCallback(
    (product: Product, variants: ProductVariant[]) => {
      if (variants.length > 1) {
        setVariantPickerProduct(product);
        setVariantPickerSelectionId(findBestOfferVariant(variants)?.id ?? variants[0].id);
      } else if (variants.length === 1) {
        void addToCart(product.id, variants[0].id);
      }
    },
    [addToCart]
  );

  const handleVariantConfirm = useCallback(() => {
    if (!variantPickerProduct || !variantPickerSelectionId) return;
    const { id: productId } = variantPickerProduct;
    const variantId = variantPickerSelectionId;

    setVariantPickerProduct(null);
    setVariantPickerSelectionId(null);

    void addToCart(productId, variantId);
  }, [variantPickerProduct, variantPickerSelectionId, addToCart]);

  const filteredProducts = useMemo(() => {
    if (!searchValue.trim()) return products;
    const lowerSearch = searchValue.toLowerCase();
    return products.filter((product) => product.name.toLowerCase().includes(lowerSearch));
  }, [products, searchValue]);

  if (isLoading) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <ShopSkeleton bottomInset={bottomInset} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={isRefreshing} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <ShopHero
          locationLabel={locationLabel}
          onSearchChange={setSearchValue}
          searchValue={searchValue}
        />

        {!searchValue && banners.length > 0 && (
          <BannerCarousel 
            banners={banners} 
            onBannerPress={(banner) => {
              if (banner.ctaUrl) {
                if (banner.ctaUrl.startsWith('http://') || banner.ctaUrl.startsWith('https://')) {
                  Linking.openURL(banner.ctaUrl).catch(() => {
                    Alert.alert("Error", "Could not open link");
                  });
                } else if (banner.ctaUrl.includes('categorySlug=')) {
                  const match = banner.ctaUrl.match(/categorySlug=([^&]+)/);
                  if (match && match[1]) {
                    handleCategorySelect(match[1]);
                    scrollViewRef.current?.scrollTo({ y: 320, animated: true });
                  }
                } else if (banner.ctaUrl.includes('products')) {
                  handleCategorySelect(null);
                  scrollViewRef.current?.scrollTo({ y: 320, animated: true });
                } else {
                  Linking.openURL(banner.ctaUrl).catch(() => {});
                }
              }
            }} 
          />
        )}

        {!searchValue && categories.length > 0 && (
            <CategoryList
              categories={categories}
              onCategoryChange={handleCategorySelect}
              selectedCategorySlug={selectedCategorySlug}
            />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.productListSection}>
          <Text style={styles.sectionTitle}>
            {searchValue ? "Search Results" : selectedCategorySlug ? "Category Products" : "Trending Now"}
          </Text>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons color={COLORS.textMuted} name="search-outline" size={48} />
              <Text style={styles.emptyStateTitle}>No products found</Text>
              <Text style={styles.emptyStateSubtitle}>Try adjusting your search or category filter.</Text>
            </View>
          ) : (
            <View style={styles.productGrid}>
              {filteredProducts.map((product) => (
                <ProductCard
                  addingVariantId={addingVariantId}
                  key={product.id}
                  onPressAddForProduct={handleProductAddPress}
                  onProductPress={(p) => navigation.navigate("ProductDetail", { product: p })}
                  product={product}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {variantPickerProduct && (
        <VariantPickerSheet
          onClose={() => setVariantPickerProduct(null)}
          onConfirm={handleVariantConfirm}
          onSelectVariant={setVariantPickerSelectionId}
          product={variantPickerProduct}
          selectedVariantId={variantPickerSelectionId}
          variants={variantPickerProduct.variants.filter((v) => v.isActive)}
          isAdding={addingVariantId !== null}
        />
      )}

      {/* Floating Add to Cart Toast */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cartToast,
          {
            opacity: cartToastOpacity,
            transform: [{ translateY: cartToastTranslateY }],
            bottom: bottomInset + 16
          }
        ]}
      >
        <Ionicons color={COLORS.surface} name="checkmark-circle" size={20} />
        <Text style={styles.cartToastText}>{cartToastMessage}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background,
    flex: 1
  },
  scrollContent: {
    paddingBottom: 24
  },
  productListSection: {
    paddingHorizontal: 16,
    paddingTop: 8
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONTS.body,
    fontSize: 14,
    marginHorizontal: 16,
    marginVertical: 12,
    textAlign: "center"
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48
  },
  emptyStateTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16
  },
  emptyStateSubtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    marginTop: 8
  },
  cartToast: {
    ...ELEVATION.floating,
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: COLORS.textPrimary,
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: "absolute",
    zIndex: 100
  },
  cartToastText: {
    color: COLORS.surface,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8
  }
});
