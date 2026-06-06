import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  GestureResponderEvent,
  Image,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { apiClient, getErrorMessage } from "../lib/api-client";
import { formatCurrency } from "../lib/format";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { ApiResponse, Banner, Cart, Category, PaginationMeta, Product, ProductVariant } from "../types/api";

type ShopScreenProps = {
  bottomInset?: number;
  onCartDrop?: (source: CartDropSource) => void;
  onProductPress: (product: Product) => void;
  onRequireAuth: () => void;
};

type CategoryOption = {
  slug: string | null;
  name: string;
  imageUrl: string | null;
  imageUrls?: Category["imageUrls"];
};

export type CartDropSource = {
  imageUri?: string | null;
  x: number;
  y: number;
};

const PRODUCTS_PAGE_LIMIT = 100;
const CATEGORIES_PAGE_LIMIT = 100;
const BANNERS_PAGE_LIMIT = 10;
const BANNER_AUTO_SLIDE_MS = 4200;
const BANNER_GAP = 12;
const CATEGORY_CARD_WIDTH = 88;
const CATEGORY_CARD_GAP = 10;
const LOCATION_FALLBACK_LABEL = "Current location unavailable";
const VARIANT_SHEET_DISMISS_DISTANCE = 96;
const VARIANT_SHEET_DISMISS_VELOCITY = 0.85;
const VARIANT_SHEET_MAX_UPWARD_DRAG = -28;
const VARIANT_SHEET_CLOSED_OFFSET = 720;

const productsPath = (categorySlug: string | null) => {
  const basePath = `/products?limit=${PRODUCTS_PAGE_LIMIT}`;

  if (!categorySlug) {
    return basePath;
  }

  return `${basePath}&categorySlug=${encodeURIComponent(categorySlug)}`;
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

const compactUniqueParts = (parts: Array<string | null | undefined>) => {
  const seen = new Set<string>();

  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const normalizedPart = part.toLowerCase();

      if (seen.has(normalizedPart)) {
        return false;
      }

      seen.add(normalizedPart);
      return true;
    });
};

const formatLocationLabel = (address: Location.LocationGeocodedAddress) => {
  const area = address.district ?? address.subregion ?? address.name ?? address.street;
  const city = address.city ?? address.region;
  const labelParts = compactUniqueParts([area, city, address.postalCode]);

  if (labelParts.length === 0) {
    return LOCATION_FALLBACK_LABEL;
  }

  return `Current · ${labelParts.slice(0, 3).join(", ")}`;
};

const getCartDropSourceFromEvent = (event: GestureResponderEvent, imageUri?: string | null): CartDropSource => ({
  imageUri,
  x: event.nativeEvent.pageX,
  y: event.nativeEvent.pageY
});

const getProductCardImageUri = (product: Product | null | undefined) =>
  product?.imageUrls?.card ?? product?.imageUrls?.detail ?? product?.imageUrls?.thumbnail ?? product?.imageUrl;

function SkeletonBlock({
  height,
  width = "100%",
  radius = 10,
  style
}: {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: object;
}) {
  return <View style={[styles.skeletonBlock, { borderRadius: radius, height, width }, style]} />;
}

export function ShopScreen({ onCartDrop, onProductPress, onRequireAuth, bottomInset = 24 }: ShopScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const bannerScrollRef = useRef<ScrollView>(null);
  const categoryScrollRef = useRef<ScrollView>(null);
  const bannerVirtualIndexRef = useRef(0);
  const bannerSlideX = useRef(new Animated.Value(0)).current;
  const variantSheetTranslateY = useRef(new Animated.Value(0)).current;
  const cartToastOpacity = useRef(new Animated.Value(0)).current;
  const cartToastTranslateY = useRef(new Animated.Value(18)).current;
  const cartToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cartToastMessage, setCartToastMessage] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState("Detecting current location...");
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerCardWidth = Math.min(viewportWidth - 28, 380);
  const bannerSnapInterval = bannerCardWidth + BANNER_GAP;
  const circularBanners = useMemo(() => {
    if (banners.length <= 1) {
      return banners;
    }

    return [banners[banners.length - 1], ...banners, banners[0]];
  }, [banners]);

  useEffect(() => {
    if (variantPickerProduct) {
      variantSheetTranslateY.setValue(0);
    }
  }, [variantPickerProduct, variantSheetTranslateY]);

  useEffect(
    () => () => {
      if (cartToastTimerRef.current) {
        clearTimeout(cartToastTimerRef.current);
      }
    },
    []
  );

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
        if (!finished) {
          return;
        }

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

  const categoryOptions = useMemo<CategoryOption[]>(
    () => [
      { slug: null, name: "All", imageUrl: null, imageUrls: undefined },
      ...categories.map((category) => ({
        slug: category.slug,
        name: category.name,
        imageUrl: category.imageUrl,
        imageUrls: category.imageUrls
      }))
    ],
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) => {
      const productText = `${product.name} ${product.category.name} ${product.description ?? ""}`.toLowerCase();
      const variantText = product.variants.map((variant) => variant.name.toLowerCase()).join(" ");

      return productText.includes(normalizedSearch) || variantText.includes(normalizedSearch);
    });
  }, [products, searchValue]);

  const featuredProducts = useMemo(() => filteredProducts.slice(0, 12), [filteredProducts]);
  const variantPickerVariants = useMemo(
    () => (variantPickerProduct ? variantPickerProduct.variants.filter((variant) => variant.isActive) : []),
    [variantPickerProduct]
  );
  const selectedVariantForPicker = useMemo(() => {
    if (variantPickerVariants.length === 0) {
      return null;
    }

    if (variantPickerSelectionId) {
      const selectedVariant = variantPickerVariants.find((variant) => variant.id === variantPickerSelectionId);

      if (selectedVariant) {
        return selectedVariant;
      }
    }

    return findCheapestVariant(variantPickerVariants);
  }, [variantPickerSelectionId, variantPickerVariants]);

  const scrollSelectedCategoryIntoView = useCallback(
    (categorySlug: string | null) => {
      const selectedIndex = categoryOptions.findIndex((category) => category.slug === categorySlug);

      if (selectedIndex < 0) {
        return;
      }

      const categoryStep = CATEGORY_CARD_WIDTH + CATEGORY_CARD_GAP;
      const centeredOffset = selectedIndex * categoryStep - Math.max((viewportWidth - CATEGORY_CARD_WIDTH) / 2, 0);

      requestAnimationFrame(() => {
        categoryScrollRef.current?.scrollTo({
          animated: true,
          x: Math.max(centeredOffset, 0)
        });
      });
    },
    [categoryOptions, viewportWidth]
  );

  const loadCategories = useCallback(async () => {
    const response = await apiClient<ApiResponse<{ categories: Category[] }, PaginationMeta>>(
      `/categories?limit=${CATEGORIES_PAGE_LIMIT}`
    );
    setCategories(response.data.categories);
  }, []);

  const loadProducts = useCallback(async (categorySlug: string | null) => {
    const response = await apiClient<ApiResponse<{ products: Product[] }, PaginationMeta>>(productsPath(categorySlug));
    setProducts(response.data.products);
  }, []);

  const loadBanners = useCallback(async () => {
    const response = await apiClient<ApiResponse<{ banners: Banner[] }, PaginationMeta>>(
      `/banners?limit=${BANNERS_PAGE_LIMIT}`
    );
    setBanners(response.data.banners);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitialCatalog = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [categoriesResponse, productsResponse, bannersResponse] = await Promise.all([
          apiClient<ApiResponse<{ categories: Category[] }, PaginationMeta>>(`/categories?limit=${CATEGORIES_PAGE_LIMIT}`),
          apiClient<ApiResponse<{ products: Product[] }, PaginationMeta>>(productsPath(null)),
          apiClient<ApiResponse<{ banners: Banner[] }, PaginationMeta>>(`/banners?limit=${BANNERS_PAGE_LIMIT}`)
        ]);

        if (!isMounted) {
          return;
        }

        setCategories(categoriesResponse.data.categories);
        setProducts(productsResponse.data.products);
        setBanners(bannersResponse.data.banners);
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError, "Unable to load catalog"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (!isMounted) {
          return;
        }

        if (permission.status !== Location.PermissionStatus.GRANTED) {
          setLocationLabel("Location permission needed");
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        const [address] = await Location.reverseGeocodeAsync(currentLocation.coords);

        if (!isMounted) {
          return;
        }

        setLocationLabel(address ? formatLocationLabel(address) : LOCATION_FALLBACK_LABEL);
      } catch {
        if (isMounted) {
          setLocationLabel(LOCATION_FALLBACK_LABEL);
        }
      }
    };

    void loadCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      await Promise.all([loadCategories(), loadProducts(selectedCategorySlug), loadBanners()]);
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, "Unable to refresh catalog"));
    } finally {
      setIsRefreshing(false);
    }
  }, [loadBanners, loadCategories, loadProducts, selectedCategorySlug]);

  const handleCategoryChange = useCallback(
    async (categorySlug: string | null) => {
      setSelectedCategorySlug(categorySlug);
      scrollSelectedCategoryIntoView(categorySlug);
      setIsCategoryLoading(true);
      setError(null);

      try {
        await loadProducts(categorySlug);
      } catch (changeError) {
        setError(getErrorMessage(changeError, "Unable to load selected category"));
      } finally {
        setIsCategoryLoading(false);
      }
    },
    [loadProducts, scrollSelectedCategoryIntoView]
  );

  const handleBannerPress = useCallback(
    async (banner: Banner) => {
      if (!banner.ctaUrl) {
        return;
      }

      if (/^https?:\/\//i.test(banner.ctaUrl)) {
        await Linking.openURL(banner.ctaUrl);
        return;
      }

      if (!banner.ctaUrl.startsWith("/products")) {
        return;
      }

      const queryText = banner.ctaUrl.split("?")[1];
      const params = new URLSearchParams(queryText ?? "");
      const categorySlug = params.get("categorySlug");

      await handleCategoryChange(categorySlug || null);
    },
    [handleCategoryChange]
  );

  const handleBannerMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
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
    },
    [bannerSnapInterval, banners.length]
  );

  const showCartToast = useCallback(
    (message: string) => {
      if (cartToastTimerRef.current) {
        clearTimeout(cartToastTimerRef.current);
      }

      setCartToastMessage(message);
      cartToastOpacity.stopAnimation();
      cartToastTranslateY.stopAnimation();
      cartToastOpacity.setValue(0);
      cartToastTranslateY.setValue(18);

      Animated.parallel([
        Animated.timing(cartToastOpacity, {
          duration: 180,
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.spring(cartToastTranslateY, {
          damping: 18,
          mass: 0.8,
          stiffness: 220,
          toValue: 0,
          useNativeDriver: true
        })
      ]).start();

      cartToastTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(cartToastOpacity, {
            duration: 180,
            toValue: 0,
            useNativeDriver: true
          }),
          Animated.timing(cartToastTranslateY, {
            duration: 180,
            toValue: 12,
            useNativeDriver: true
          })
        ]).start(({ finished }) => {
          if (finished) {
            setCartToastMessage(null);
          }
        });
      }, 1900);
    },
    [cartToastOpacity, cartToastTranslateY]
  );

  const playCartDropAnimation = useCallback(
    (source?: CartDropSource | null) => {
      if (!source) {
        return;
      }

      onCartDrop?.(source);
    },
    [onCartDrop]
  );

  const addToCart = useCallback(
    async (variant: ProductVariant, dropSource?: CartDropSource | null) => {
      if (!isAuthenticated) {
        Alert.alert("Sign in required", "Please sign in before adding items to cart.");
        onRequireAuth();
        return false;
      }

      setAddingVariantId(variant.id);

      try {
        await authorizedRequest<ApiResponse<{ cart: Cart }>>("/cart/items", {
          method: "POST",
          body: JSON.stringify({
            variantId: variant.id,
            quantity: 1
          })
        });
        playCartDropAnimation(dropSource);
        showCartToast(`${variant.name} added to cart`);
        return true;
      } catch (addError) {
        Alert.alert("Could not add to cart", getErrorMessage(addError, "Please try again"));
        return false;
      } finally {
        setAddingVariantId(null);
      }
    },
    [authorizedRequest, isAuthenticated, onRequireAuth, playCartDropAnimation, showCartToast]
  );

  const closeVariantPicker = useCallback(() => {
    setVariantPickerProduct(null);
    setVariantPickerSelectionId(null);
  }, []);

  const variantSheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dy) > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          variantSheetTranslateY.stopAnimation();
        },
        onPanResponderMove: (_event, gestureState) => {
          variantSheetTranslateY.setValue(Math.max(gestureState.dy, VARIANT_SHEET_MAX_UPWARD_DRAG));
        },
        onPanResponderRelease: (_event, gestureState) => {
          const shouldDismiss =
            gestureState.dy > VARIANT_SHEET_DISMISS_DISTANCE || gestureState.vy > VARIANT_SHEET_DISMISS_VELOCITY;

          if (shouldDismiss) {
            Animated.timing(variantSheetTranslateY, {
              duration: 180,
              toValue: VARIANT_SHEET_CLOSED_OFFSET,
              useNativeDriver: true
            }).start(closeVariantPicker);
            return;
          }

          Animated.spring(variantSheetTranslateY, {
            bounciness: 4,
            speed: 18,
            toValue: 0,
            useNativeDriver: true
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(variantSheetTranslateY, {
            bounciness: 4,
            speed: 18,
            toValue: 0,
            useNativeDriver: true
          }).start();
        }
      }),
    [closeVariantPicker, variantSheetTranslateY]
  );

  const openVariantPicker = useCallback((product: Product, variants: ProductVariant[]) => {
    const defaultVariant = findCheapestVariant(variants);

    setVariantPickerProduct(product);
    setVariantPickerSelectionId(defaultVariant?.id ?? null);
  }, []);

  const onPressAddForProduct = useCallback(
    (product: Product, variants: ProductVariant[], dropSource?: CartDropSource | null) => {
      if (variants.length === 0) {
        return;
      }

      if (variants.length === 1) {
        void addToCart(variants[0], dropSource);
        return;
      }

      openVariantPicker(product, variants);
    },
    [addToCart, openVariantPicker]
  );

  const confirmVariantSelection = useCallback(async (dropSource?: CartDropSource | null) => {
    if (!selectedVariantForPicker) {
      return;
    }

    const didAdd = await addToCart(selectedVariantForPicker, dropSource);

    if (didAdd) {
      closeVariantPicker();
    }
  }, [addToCart, closeVariantPicker, selectedVariantForPicker]);

  if (isLoading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
          <View style={styles.shopSkeletonHero}>
            <SkeletonBlock height={24} width="64%" />
            <SkeletonBlock height={14} width="48%" style={styles.skeletonGapTop} />
            <SkeletonBlock height={42} radius={12} style={styles.skeletonLargeGapTop} />
            <View style={styles.skeletonChipRow}>
              <SkeletonBlock height={28} width="30%" radius={999} />
              <SkeletonBlock height={28} width="30%" radius={999} />
              <SkeletonBlock height={28} width="30%" radius={999} />
            </View>
          </View>

          <SkeletonBlock height={18} width="42%" style={styles.skeletonSectionTitle} />
          <SkeletonBlock height={230} radius={18} />

          <View style={styles.skeletonCategoryRow}>
            {[0, 1, 2, 3].map((item) => (
              <View key={item} style={styles.skeletonCategoryCard}>
                <SkeletonBlock height={50} width={50} radius={999} />
                <SkeletonBlock height={12} width="80%" style={styles.skeletonGapTop} />
                <SkeletonBlock height={12} width="62%" style={styles.skeletonGapTop} />
              </View>
            ))}
          </View>

          <SkeletonBlock height={18} width="48%" style={styles.skeletonSectionTitle} />
          <View style={styles.productGrid}>
            {[0, 1, 2, 3].map((item) => (
              <View key={item} style={styles.productCard}>
                <SkeletonBlock height={126} radius={0} />
                <View style={styles.productBody}>
                  <SkeletonBlock height={14} width="86%" />
                  <SkeletonBlock height={12} width="58%" style={styles.skeletonGapTop} />
                  <SkeletonBlock height={18} width="70%" style={styles.skeletonLargeGapTop} />
                  <SkeletonBlock height={36} radius={9} style={styles.skeletonLargeGapTop} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        <LinearGradient
          colors={[COLORS.warning, "#FFE6B8", "#FFD8A4"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.heroCard}
        >
          <View style={styles.heroHeader}>
            <View style={styles.heroLocationBlock}>
              <Text style={styles.heroTitle}>Delivery in 10-20 mins</Text>
              <View style={styles.locationRow}>
                <Ionicons color={COLORS.primaryDeep} name="location" size={14} />
                <Text numberOfLines={1} style={styles.locationText}>
                  {locationLabel}
                </Text>
              </View>
            </View>
            <View style={styles.liveBadge}>
              <Ionicons color={COLORS.surface} name="flash" size={13} />
              <Text style={styles.liveBadgeText}>Live</Text>
            </View>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons color={COLORS.textMuted} name="search" size={18} />
            <TextInput
              onChangeText={setSearchValue}
              placeholder="Search for atta, milk, snacks..."
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              value={searchValue}
            />
          </View>

          <View style={styles.quickPerksRow}>
            <View style={styles.perkChip}>
              <Ionicons color={COLORS.success} name="timer-outline" size={13} />
              <Text style={styles.perkChipText}>Fast delivery</Text>
            </View>
            <View style={styles.perkChip}>
              <Ionicons color={COLORS.danger} name="pricetag-outline" size={13} />
              <Text style={styles.perkChipText}>Fresh offers</Text>
            </View>
            <View style={styles.perkChip}>
              <Ionicons color={COLORS.info} name="leaf-outline" size={13} />
              <Text style={styles.perkChipText}>Daily essentials</Text>
            </View>
          </View>
        </LinearGradient>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {banners.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{"Today's Offers"}</Text>
              <Text style={styles.sectionHint}>{banners.length} live</Text>
            </View>

            <ScrollView
              ref={bannerScrollRef}
              contentContainerStyle={styles.bannerRow}
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
                    onPress={() => void handleBannerPress(banner)}
                    style={({ pressed }) => [
                      styles.bannerCard,
                      { marginRight: BANNER_GAP, width: bannerCardWidth },
                      pressed ? styles.bannerCardPressed : null
                    ]}
                  >
                    <View style={styles.bannerImageWrap}>
                      {imageUri ? (
                        <Image resizeMode="cover" source={{ uri: imageUri }} style={styles.bannerImage} />
                      ) : (
                        <LinearGradient
                          colors={["#FFE1B8", "#BFEAD8"]}
                          end={{ x: 1, y: 1 }}
                          start={{ x: 0, y: 0 }}
                          style={styles.bannerImage}
                        />
                      )}
                    </View>

                    <View style={styles.bannerFooter}>
                      <View style={styles.bannerFooterText}>
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
                        <View style={styles.bannerCta}>
                          <Text numberOfLines={1} style={styles.bannerCtaText}>
                            {banner.ctaLabel}
                          </Text>
                          <Ionicons color={COLORS.surface} name="arrow-forward" size={12} />
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {banners.length > 1 ? (
              <View style={styles.bannerDots}>
                {banners.map((banner, index) => (
                  <View
                    key={banner.id}
                    style={[styles.bannerDot, index === activeBannerIndex ? styles.bannerDotActive : null]}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <Text style={styles.sectionHint}>{categories.length} categories</Text>
        </View>

        <ScrollView
          ref={categoryScrollRef}
          contentContainerStyle={styles.categoryRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {categoryOptions.map((category) => {
            const isActive = selectedCategorySlug === category.slug;
            const imageUri = category.imageUrls?.thumbnail ?? category.imageUrl;

            return (
              <Pressable
                key={category.slug ?? "all"}
                onPress={() => void handleCategoryChange(category.slug)}
                style={[styles.categoryCard, isActive ? styles.categoryCardActive : null]}
              >
                <View style={[styles.categoryImageWrap, isActive ? styles.categoryImageWrapActive : null]}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.categoryImage} />
                  ) : (
                    <Ionicons
                      color={isActive ? COLORS.primaryDeep : COLORS.primary}
                      name={category.slug ? "nutrition-outline" : "apps-outline"}
                      size={20}
                    />
                  )}
                </View>
                <Text numberOfLines={2} style={[styles.categoryName, isActive ? styles.categoryNameActive : null]}>
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isCategoryLoading ? (
          <View style={styles.inlineLoader}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Best Picks For You</Text>
          <Text style={styles.sectionHint}>{filteredProducts.length} items</Text>
        </View>

        {featuredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No items found</Text>
            <Text style={styles.emptyStateText}>Try another category or search phrase.</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {featuredProducts.map((product) => {
              const imageUri = getProductCardImageUri(product);
              const variants = product.variants.filter((variant) => variant.isActive);
              const cheapestVariant = findCheapestVariant(variants);
              const isOutOfStock = !cheapestVariant || variants.every((variant) => variant.stock <= 0);
              const isAddingAnyVariant = variants.some((variant) => addingVariantId === variant.id);

              return (
                <View key={product.id} style={styles.productCard}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onProductPress(product)}
                    style={({ pressed }) => [styles.productImageContainer, pressed ? styles.productPressablePressed : null]}
                  >
                    {imageUri ? (
                      <Image resizeMode="cover" source={{ uri: imageUri }} style={styles.productImage} />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Ionicons color={COLORS.textMuted} name="image-outline" size={20} />
                      </View>
                    )}

                    <View style={styles.offerBadge}>
                      <Text style={styles.offerBadgeText}>Fresh</Text>
                    </View>
                  </Pressable>

                  <View style={styles.productBody}>
                    <Pressable accessibilityRole="button" onPress={() => onProductPress(product)}>
                      <View style={styles.productMetaPill}>
                        <Text numberOfLines={1} style={styles.productMeta}>
                          {product.category.name}
                        </Text>
                      </View>

                      <Text numberOfLines={2} style={styles.productName}>
                        {product.name}
                      </Text>
                    </Pressable>

                    {cheapestVariant ? (
                      <Text style={styles.productPrice}>
                        From {formatCurrency(cheapestVariant.price)}{" "}
                        <Text style={styles.productPriceUnit}>/{cheapestVariant.unit}</Text>
                      </Text>
                    ) : (
                      <Text style={styles.outOfStockText}>Currently unavailable</Text>
                    )}

                    <View style={styles.productActionRow}>
                      <Text numberOfLines={1} style={styles.productVariantHint}>
                        {variants.length > 1
                          ? `${variants.length} options`
                          : variants.length === 1
                            ? variants[0].name
                            : "No option"}
                      </Text>

                      <Pressable
                        disabled={!cheapestVariant || isOutOfStock || isAddingAnyVariant}
                        onPress={(event) =>
                          void onPressAddForProduct(product, variants, getCartDropSourceFromEvent(event, imageUri))
                        }
                        style={({ pressed }) => [
                          styles.addButton,
                          variants.length > 1 ? styles.addButtonWide : null,
                          pressed && cheapestVariant && !isOutOfStock ? styles.addButtonPressed : null,
                          !cheapestVariant || isOutOfStock ? styles.addButtonDisabled : null,
                          isAddingAnyVariant ? styles.addButtonBusy : null
                        ]}
                      >
                        {isAddingAnyVariant ? (
                          <ActivityIndicator color={COLORS.surface} size="small" />
                        ) : isOutOfStock ? (
                          <Ionicons color={COLORS.surface} name="close" size={16} />
                        ) : variants.length > 1 ? (
                          <Text style={styles.addButtonText}>Choose</Text>
                        ) : (
                          <Ionicons color={COLORS.surface} name="add" size={18} />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {cartToastMessage ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cartToast,
            {
              bottom: Math.max(bottomInset, insets.bottom) + 14,
              opacity: cartToastOpacity,
              transform: [{ translateY: cartToastTranslateY }]
            }
          ]}
        >
          <View style={styles.cartToastIcon}>
            <Ionicons color={COLORS.surface} name="checkmark" size={14} />
          </View>
          <Text numberOfLines={1} style={styles.cartToastText}>
            {cartToastMessage}
          </Text>
        </Animated.View>
      ) : null}

      <Modal
        animationType="slide"
        navigationBarTranslucent
        onRequestClose={closeVariantPicker}
        statusBarTranslucent
        transparent
        visible={Boolean(variantPickerProduct)}
      >
        <View style={styles.variantModalRoot}>
          <Pressable onPress={closeVariantPicker} style={styles.variantModalBackdrop} />
          <Animated.View
            style={[
              styles.variantSheet,
              {
                paddingBottom: Math.max(insets.bottom, 12) + 12,
                transform: [{ translateY: variantSheetTranslateY }]
              }
            ]}
          >
            <View
              {...variantSheetPanResponder.panHandlers}
              accessibilityHint="Drag down to close or release to keep the sheet open"
              accessibilityLabel="Variant sheet handle"
              accessibilityRole="button"
              accessible
              style={styles.variantSheetHandleButton}
            >
              <View style={styles.variantSheetHandle} />
            </View>

            <View style={styles.variantSheetHeader}>
              <Text numberOfLines={1} style={styles.variantSheetTitle}>
                {variantPickerProduct?.name ?? "Choose Variant"}
              </Text>
              <Pressable onPress={closeVariantPicker} style={styles.variantSheetClose}>
                <Ionicons color={COLORS.textSecondary} name="close" size={18} />
              </Pressable>
            </View>

            <Text style={styles.variantSheetHint}>Select a pack size</Text>

            <ScrollView contentContainerStyle={styles.variantSheetList}>
              {variantPickerVariants.map((variant) => {
                const isSelected = selectedVariantForPicker?.id === variant.id;

                return (
                  <Pressable
                    key={variant.id}
                    onPress={() => setVariantPickerSelectionId(variant.id)}
                    style={[styles.variantSheetOption, isSelected ? styles.variantSheetOptionSelected : null]}
                  >
                    <View style={styles.variantSheetOptionTop}>
                      <Text style={styles.variantSheetOptionName}>{variant.name}</Text>
                      <Text style={styles.variantSheetOptionPrice}>{formatCurrency(variant.price)}</Text>
                    </View>
                    <Text style={styles.variantSheetOptionMeta}>
                      {variant.unit} · Stock {variant.stock}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              disabled={!selectedVariantForPicker || addingVariantId === selectedVariantForPicker.id}
              onPress={(event) =>
                void confirmVariantSelection(
                  getCartDropSourceFromEvent(
                    event,
                    getProductCardImageUri(variantPickerProduct)
                  )
                )
              }
              style={[
                styles.variantSheetAddButton,
                !selectedVariantForPicker ? styles.variantSheetAddButtonDisabled : null
              ]}
            >
              {selectedVariantForPicker && addingVariantId === selectedVariantForPicker.id ? (
                <ActivityIndicator color={COLORS.surface} size="small" />
              ) : (
                <Text style={styles.variantSheetAddButtonText}>Add Selected Variant</Text>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background,
    flex: 1
  },
  centeredContainer: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center"
  },
  helperText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    marginTop: 8
  },
  skeletonBlock: {
    backgroundColor: "#F1E4D4"
  },
  skeletonGapTop: {
    marginTop: 8
  },
  skeletonLargeGapTop: {
    marginTop: 12
  },
  skeletonSectionTitle: {
    marginBottom: 10,
    marginTop: 6
  },
  shopSkeletonHero: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14
  },
  skeletonChipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12
  },
  skeletonCategoryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    marginTop: 12
  },
  skeletonCategoryCard: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 112,
    paddingHorizontal: 10,
    paddingVertical: 9,
    width: 88
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 10
  },
  heroCard: {
    ...ELEVATION.card,
    borderRadius: 22,
    marginBottom: 14,
    padding: 14
  },
  heroHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  heroLocationBlock: {
    flex: 1,
    paddingRight: 10
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "700"
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 3
  },
  locationText: {
    color: COLORS.textSecondary,
    flexShrink: 1,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4
  },
  liveBadge: {
    alignItems: "center",
    backgroundColor: COLORS.danger,
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  liveBadgeText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: "#F7D6AB",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  searchInput: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    marginLeft: 8
  },
  quickPerksRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  perkChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  perkChipText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginBottom: 8
  },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 4
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "700"
  },
  sectionHint: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600"
  },
  bannerRow: {
    paddingBottom: 12,
    paddingRight: 2
  },
  bannerCard: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 230,
    overflow: "hidden",
    position: "relative"
  },
  bannerCardPressed: {
    opacity: 0.92
  },
  bannerImageWrap: {
    backgroundColor: COLORS.surfaceMuted,
    height: 166,
    overflow: "hidden"
  },
  bannerImage: {
    height: "100%",
    width: "100%"
  },
  bannerFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  bannerFooterText: {
    flex: 1,
    minWidth: 0
  },
  bannerTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "800"
  },
  bannerSubtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3
  },
  bannerCta: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    maxWidth: 108,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  bannerCtaText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "800"
  },
  bannerDots: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
    marginTop: -2
  },
  bannerDot: {
    backgroundColor: COLORS.border,
    borderRadius: 999,
    height: 6,
    marginHorizontal: 3,
    width: 6
  },
  bannerDotActive: {
    backgroundColor: COLORS.primary,
    width: 18
  },
  categoryRow: {
    paddingBottom: 10,
    paddingRight: 2
  },
  categoryCard: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 10,
    minHeight: 112,
    paddingHorizontal: 10,
    paddingVertical: 9,
    width: 88
  },
  categoryCardActive: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: "#F6B268"
  },
  categoryImageWrap: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 999,
    height: 50,
    justifyContent: "center",
    marginBottom: 6,
    width: 50
  },
  categoryImageWrapActive: {
    backgroundColor: "#FFE0BF"
  },
  categoryImage: {
    borderRadius: 999,
    height: 50,
    width: 50
  },
  categoryName: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center"
  },
  categoryNameActive: {
    color: COLORS.primaryDeep
  },
  inlineLoader: {
    alignItems: "center",
    marginBottom: 6
  },
  emptyState: {
    ...ELEVATION.card,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    padding: 16
  },
  emptyStateTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700"
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginTop: 4
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  productCard: {
    backgroundColor: COLORS.surface,
    borderColor: "rgba(31,35,48,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    minHeight: 248,
    overflow: "hidden",
    width: "49.1%"
  },
  productImageContainer: {
    alignItems: "center",
    backgroundColor: "#F3F8F5",
    height: 138,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative"
  },
  productPressablePressed: {
    opacity: 0.9
  },
  productImage: {
    height: "100%",
    width: "100%"
  },
  productImagePlaceholder: {
    alignItems: "center",
    backgroundColor: "#F3F8F5",
    height: "100%",
    justifyContent: "center"
  },
  offerBadge: {
    alignItems: "center",
    backgroundColor: "#DFF6E8",
    borderBottomLeftRadius: 12,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: 9,
    position: "absolute",
    right: 0,
    top: 0
  },
  offerBadgeText: {
    color: COLORS.success,
    fontFamily: FONTS.body,
    fontSize: 9,
    fontWeight: "900"
  },
  productBody: {
    flex: 1,
    paddingHorizontal: 9,
    paddingBottom: 9,
    paddingTop: 8
  },
  productMetaPill: {
    alignSelf: "flex-start",
    backgroundColor: "#F6F7FA",
    borderRadius: 999,
    marginBottom: 6,
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  productName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17
  },
  productMeta: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 9,
    fontWeight: "800"
  },
  productPrice: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3
  },
  productPriceUnit: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 10,
    fontWeight: "600"
  },
  productVariantHint: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 10,
    flex: 1,
    fontWeight: "700",
    paddingRight: 6
  },
  outOfStockText: {
    color: COLORS.danger,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 7
  },
  productActionRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: "auto",
    paddingTop: 7
  },
  addButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 34,
    width: 34
  },
  addButtonWide: {
    paddingHorizontal: 11,
    width: 70
  },
  addButtonPressed: {
    transform: [{ scale: 0.98 }]
  },
  addButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 10,
    fontWeight: "900"
  },
  addButtonDisabled: {
    backgroundColor: "#C8C4BD"
  },
  addButtonBusy: {
    opacity: 0.85
  },
  cartToast: {
    ...ELEVATION.floating,
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: COLORS.textPrimary,
    borderRadius: 999,
    flexDirection: "row",
    left: 18,
    maxWidth: 420,
    minHeight: 48,
    paddingLeft: 10,
    paddingRight: 16,
    position: "absolute",
    right: 18
  },
  cartToastIcon: {
    alignItems: "center",
    backgroundColor: COLORS.success,
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    marginRight: 9,
    width: 26
  },
  cartToastText: {
    color: COLORS.surface,
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "800"
  },
  variantModalRoot: {
    backgroundColor: "rgba(0,0,0,0.28)",
    flex: 1,
    justifyContent: "flex-end"
  },
  variantModalBackdrop: {
    flex: 1
  },
  variantSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "68%",
    paddingHorizontal: 14,
    paddingTop: 8
  },
  variantSheetHandleButton: {
    alignItems: "center",
    height: 28,
    justifyContent: "center"
  },
  variantSheetHandle: {
    backgroundColor: COLORS.border,
    borderRadius: 999,
    height: 5,
    width: 46
  },
  variantSheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4
  },
  variantSheetTitle: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.heading,
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8
  },
  variantSheetClose: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  variantSheetHint: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginBottom: 10
  },
  variantSheetList: {
    gap: 8,
    paddingBottom: 12
  },
  variantSheetOption: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10
  },
  variantSheetOptionSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1.5
  },
  variantSheetOptionTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  variantSheetOptionName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 8
  },
  variantSheetOptionPrice: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: "700"
  },
  variantSheetOptionMeta: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 11,
    marginTop: 4
  },
  variantSheetAddButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    minHeight: 44,
    justifyContent: "center",
    marginTop: 8
  },
  variantSheetAddButtonDisabled: {
    backgroundColor: "#C8C4BD"
  },
  variantSheetAddButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "800"
  }
});
