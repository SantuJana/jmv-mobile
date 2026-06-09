import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, Pressable, Animated, Dimensions, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef } from "react";

import { ShopScreen } from "../screens/shop-screen";
import { CartScreen } from "../screens/cart-screen";
import { OrdersScreen } from "../screens/orders-screen";
import { AccountScreen } from "../screens/account-screen";
import { COLORS, FONTS, ELEVATION } from "../theme/design";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

const { width: screenWidth } = Dimensions.get("window");
const TAB_BAR_MARGIN = 16;
const CONTAINER_WIDTH = screenWidth - TAB_BAR_MARGIN * 2;
const BORDER_WIDTH = 1.5;
const INNER_WIDTH = CONTAINER_WIDTH - BORDER_WIDTH * 2;
const TAB_WIDTH = INNER_WIDTH / 4;
const PILL_HORIZONTAL_PADDING = 6;
const PILL_WIDTH = TAB_WIDTH - PILL_HORIZONTAL_PADDING * 2;
const PILL_HEIGHT = 48;

const TAB_LABELS: Record<string, string> = {
  ShopTab: "Shop",
  CartTab: "Cart",
  OrdersTab: "Orders",
  AccountTab: "Profile",
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;
  const slideAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIndex,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  }, [activeIndex]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [
      PILL_HORIZONTAL_PADDING,
      TAB_WIDTH + PILL_HORIZONTAL_PADDING,
      TAB_WIDTH * 2 + PILL_HORIZONTAL_PADDING,
      TAB_WIDTH * 3 + PILL_HORIZONTAL_PADDING,
    ],
  });

  return (
    <View style={[styles.shadowWrapper, { bottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.container}>
        <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
        
        {/* Animated Sliding Pill Highlight */}
        <Animated.View
          style={[
            styles.slidingPill,
            {
              width: PILL_WIDTH,
              transform: [{ translateX }],
            },
          ]}
        />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          let iconName: keyof typeof Ionicons.glyphMap = "storefront-outline";
          if (route.name === "ShopTab") {
            iconName = isFocused ? "storefront" : "storefront-outline";
          } else if (route.name === "CartTab") {
            iconName = isFocused ? "cart" : "cart-outline";
          } else if (route.name === "OrdersTab") {
            iconName = isFocused ? "receipt" : "receipt-outline";
          } else if (route.name === "AccountTab") {
            iconName = isFocused ? "person" : "person-outline";
          }

          // Interpolated scale for active icon/label bounce
          const scale = slideAnim.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [1, 1.08, 1],
            extrapolate: "clamp",
          });

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
            >
              <Animated.View style={[
                styles.itemWrapper,
                { transform: [{ scale }] }
              ]}>
                <Ionicons
                  name={iconName}
                  size={21}
                  color={isFocused ? COLORS.textPrimary : COLORS.textMuted}
                  style={styles.icon}
                />
                <Text style={[
                  styles.tabLabel,
                  isFocused ? styles.tabLabelActive : styles.tabLabelInactive
                ]}>
                  {TAB_LABELS[route.name] ?? route.name}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="ShopTab" component={ShopScreen} />
      <Tab.Screen name="CartTab" component={CartScreen} />
      <Tab.Screen name="OrdersTab" component={OrdersScreen} />
      <Tab.Screen name="AccountTab" component={AccountScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    position: "absolute",
    left: TAB_BAR_MARGIN,
    right: TAB_BAR_MARGIN,
    height: 72,
    borderRadius: 36,
    ...ELEVATION.floating,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(16, 185, 129, 0.16)",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    alignItems: "center",
    justifyContent: "space-around",
  },
  slidingPill: {
    position: "absolute",
    left: 0,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: "rgba(16, 185, 129, 0.11)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    top: (72 - BORDER_WIDTH * 2 - PILL_HEIGHT) / 2,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  itemWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginBottom: 2,
  },
  tabLabel: {
    fontFamily: FONTS.heading,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: COLORS.textPrimary,
  },
  tabLabelInactive: {
    color: COLORS.textMuted,
  },
});
