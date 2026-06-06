import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Image, Pressable, StatusBar, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountScreen } from "./src/screens/account-screen";
import { CartScreen } from "./src/screens/cart-screen";
import { OrdersScreen } from "./src/screens/orders-screen";
import { ProductDetailScreen } from "./src/screens/product-detail-screen";
import { ShopScreen, type CartDropSource } from "./src/screens/shop-screen";
import { AuthProvider } from "./src/providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "./src/theme/design";
import type { Product } from "./src/types/api";

type AppTab = "shop" | "cart" | "orders" | "account";

type FlyingCartItem = CartDropSource & {
  id: number;
};

const TABS: Array<{
  key: AppTab;
  label: string;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "shop", label: "Shop", inactiveIcon: "storefront-outline", activeIcon: "storefront" },
  { key: "cart", label: "Cart", inactiveIcon: "bag-handle-outline", activeIcon: "bag-handle" },
  { key: "orders", label: "Orders", inactiveIcon: "receipt-outline", activeIcon: "receipt" },
  { key: "account", label: "Account", inactiveIcon: "person-outline", activeIcon: "person" }
];

function AppShell() {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const cartDropTranslateX = useRef(new Animated.Value(0)).current;
  const cartDropTranslateY = useRef(new Animated.Value(0)).current;
  const cartDropScale = useRef(new Animated.Value(1)).current;
  const cartDropOpacity = useRef(new Animated.Value(0)).current;
  const cartDropRotate = useRef(new Animated.Value(0)).current;
  const cartDropPulseScale = useRef(new Animated.Value(0.4)).current;
  const cartDropPulseOpacity = useRef(new Animated.Value(0)).current;
  const cartDropIdRef = useRef(0);
  const [activeTab, setActiveTab] = useState<AppTab>("shop");
  const [flyingCartItem, setFlyingCartItem] = useState<FlyingCartItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const isProductDetailActive = activeTab === "shop" && Boolean(selectedProduct);
  const tabBarBottom = Math.max(insets.bottom, 10);
  const tabBarHeight = 66;
  const scrollBottomInset = tabBarHeight + tabBarBottom + 10;
  const cartTabCenterX = 14 + 10 + (viewportWidth - 14 * 2 - 10 * 2) * 0.375;
  const cartTabCenterY = viewportHeight - tabBarBottom - tabBarHeight / 2;
  const cartDropRotation = cartDropRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-14deg", "10deg"]
  });

  const playCartDropAnimation = useCallback(
    (source: CartDropSource) => {
      cartDropTranslateX.stopAnimation();
      cartDropTranslateY.stopAnimation();
      cartDropScale.stopAnimation();
      cartDropOpacity.stopAnimation();
      cartDropRotate.stopAnimation();
      cartDropPulseScale.stopAnimation();
      cartDropPulseOpacity.stopAnimation();

      const nextFlyingItem = {
        ...source,
        id: cartDropIdRef.current + 1
      };

      cartDropIdRef.current = nextFlyingItem.id;
      setFlyingCartItem(nextFlyingItem);
      cartDropTranslateX.setValue(0);
      cartDropTranslateY.setValue(0);
      cartDropScale.setValue(1);
      cartDropOpacity.setValue(1);
      cartDropRotate.setValue(0);
      cartDropPulseScale.setValue(0.4);
      cartDropPulseOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(cartDropTranslateX, {
          duration: 900,
          toValue: cartTabCenterX - source.x,
          useNativeDriver: true
        }),
        Animated.sequence([
          Animated.timing(cartDropTranslateY, {
            duration: 320,
            toValue: -92,
            useNativeDriver: true
          }),
          Animated.timing(cartDropTranslateY, {
            duration: 580,
            toValue: cartTabCenterY - source.y,
            useNativeDriver: true
          })
        ]),
        Animated.timing(cartDropScale, {
          duration: 900,
          toValue: 0.34,
          useNativeDriver: true
        }),
        Animated.sequence([
          Animated.timing(cartDropRotate, {
            duration: 320,
            toValue: -1,
            useNativeDriver: true
          }),
          Animated.timing(cartDropRotate, {
            duration: 580,
            toValue: 1,
            useNativeDriver: true
          })
        ]),
        Animated.sequence([
          Animated.delay(740),
          Animated.timing(cartDropOpacity, {
            duration: 160,
            toValue: 0,
            useNativeDriver: true
          })
        ]),
        Animated.sequence([
          Animated.delay(620),
          Animated.parallel([
            Animated.timing(cartDropPulseOpacity, {
              duration: 120,
              toValue: 1,
              useNativeDriver: true
            }),
            Animated.spring(cartDropPulseScale, {
              damping: 12,
              stiffness: 180,
              toValue: 1,
              useNativeDriver: true
            })
          ]),
          Animated.timing(cartDropPulseOpacity, {
            duration: 220,
            toValue: 0,
            useNativeDriver: true
          })
        ])
      ]).start(({ finished }) => {
        if (finished) {
          setFlyingCartItem((currentItem) => (currentItem?.id === nextFlyingItem.id ? null : currentItem));
        }
      });
    },
    [
      cartDropOpacity,
      cartDropPulseOpacity,
      cartDropPulseScale,
      cartDropRotate,
      cartDropScale,
      cartDropTranslateX,
      cartDropTranslateY,
      cartTabCenterX,
      cartTabCenterY
    ]
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selectedProduct) {
        setSelectedProduct(null);
        return true;
      }

      if (activeTab !== "shop") {
        setActiveTab("shop");
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [activeTab, selectedProduct]);

  const switchTab = useCallback((tab: AppTab) => {
    setSelectedProduct(null);
    setActiveTab(tab);
  }, []);

  return (
    <View style={[styles.root, { paddingTop: isProductDetailActive ? 0 : insets.top }]}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent={isProductDetailActive} />
      <View style={styles.screen}>
        <View
          pointerEvents={activeTab === "shop" ? "auto" : "none"}
          style={[styles.tabScreen, activeTab === "shop" ? styles.tabScreenActive : styles.tabScreenHidden]}
        >
          <ShopScreen
            bottomInset={scrollBottomInset}
            onCartDrop={playCartDropAnimation}
            onProductPress={setSelectedProduct}
            onRequireAuth={() => switchTab("account")}
          />
          {selectedProduct ? (
            <View style={styles.detailOverlay}>
              <ProductDetailScreen
                bottomInset={scrollBottomInset}
                onBack={() => setSelectedProduct(null)}
                onCartDrop={playCartDropAnimation}
                onRequireAuth={() => switchTab("account")}
                product={selectedProduct}
              />
            </View>
          ) : null}
        </View>

        <View
          pointerEvents={activeTab === "cart" ? "auto" : "none"}
          style={[styles.tabScreen, activeTab === "cart" ? styles.tabScreenActive : styles.tabScreenHidden]}
        >
          <CartScreen
            bottomInset={scrollBottomInset}
            onOrderPlaced={() => switchTab("orders")}
            onRequireAuth={() => switchTab("account")}
          />
        </View>

        <View
          pointerEvents={activeTab === "orders" ? "auto" : "none"}
          style={[styles.tabScreen, activeTab === "orders" ? styles.tabScreenActive : styles.tabScreenHidden]}
        >
          <OrdersScreen bottomInset={scrollBottomInset} onRequireAuth={() => switchTab("account")} />
        </View>

        <View
          pointerEvents={activeTab === "account" ? "auto" : "none"}
          style={[styles.tabScreen, activeTab === "account" ? styles.tabScreenActive : styles.tabScreenHidden]}
        >
          <AccountScreen />
        </View>
      </View>
      <View style={[styles.tabBar, { bottom: tabBarBottom, minHeight: tabBarHeight }]}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <Pressable
              accessibilityRole="button"
              key={tab.key}
              onPress={() => switchTab(tab.key)}
              style={[styles.tabButton, isActive ? styles.activeTabButton : null]}
            >
              <Ionicons
                color={isActive ? COLORS.primaryDeep : COLORS.textMuted}
                name={isActive ? tab.activeIcon : tab.inactiveIcon}
                size={19}
              />
              <Text style={[styles.tabButtonText, isActive ? styles.activeTabButtonText : null]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {flyingCartItem ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cartDropTargetPulse,
              {
                left: cartTabCenterX - 28,
                opacity: cartDropPulseOpacity,
                top: cartTabCenterY - 28,
                transform: [{ scale: cartDropPulseScale }]
              }
            ]}
          >
            <Ionicons color={COLORS.surface} name="bag-handle" size={20} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cartDropItem,
              {
                left: flyingCartItem.x - 32,
                opacity: cartDropOpacity,
                top: flyingCartItem.y - 32,
                transform: [
                  { translateX: cartDropTranslateX },
                  { translateY: cartDropTranslateY },
                  { scale: cartDropScale },
                  { rotate: cartDropRotation }
                ]
              }
            ]}
          >
            {flyingCartItem.imageUri ? (
              <Image resizeMode="cover" source={{ uri: flyingCartItem.imageUri }} style={styles.cartDropImage} />
            ) : (
              <Ionicons color={COLORS.primaryDeep} name="bag-add" size={24} />
            )}
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  screen: {
    flex: 1,
    position: "relative"
  },
  tabScreen: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  tabScreenActive: {
    opacity: 1,
    zIndex: 1
  },
  tabScreenHidden: {
    opacity: 0,
    zIndex: 0
  },
  detailOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 4
  },
  tabBar: {
    ...ELEVATION.floating,
    alignSelf: "center",
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    bottom: 14,
    flexDirection: "row",
    backgroundColor: COLORS.tabBg,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: "absolute",
    right: 14,
    elevation: 24,
    zIndex: 50
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    marginHorizontal: 4,
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  activeTabButton: {
    backgroundColor: COLORS.surfaceMuted
  },
  tabButtonText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3
  },
  activeTabButtonText: {
    color: COLORS.primaryDeep
  },
  cartDropItem: {
    ...ELEVATION.floating,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 3,
    elevation: 20,
    height: 64,
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
    shadowColor: "#1F2330",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    width: 64,
    zIndex: 100
  },
  cartDropImage: {
    height: "100%",
    width: "100%"
  },
  cartDropTargetPulse: {
    ...ELEVATION.floating,
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: 999,
    borderWidth: 3,
    elevation: 18,
    height: 56,
    justifyContent: "center",
    position: "absolute",
    width: 56,
    zIndex: 99
  }
});
