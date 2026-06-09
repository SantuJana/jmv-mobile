import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { getErrorMessage } from "../lib/api-client";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { ApiResponse, Order, PaginationMeta } from "../types/api";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";

import { OrderCard } from "../components/orders/OrderCard";
import { OrdersSkeleton } from "../components/orders/OrdersSkeleton";
import { Button } from "../components/common/Button";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "OrdersTab">,
  NativeStackScreenProps<RootStackParamList>
>;

const ORDERS_PAGE_LIMIT = 30;

export function OrdersScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom + 80;

  const { isReady, isAuthenticated, authorizedRequest } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliveredCount = useMemo(() => orders.filter((order) => order.status === "DELIVERED").length, [orders]);

  const loadOrders = useCallback(async () => {
    setError(null);
    const response = await authorizedRequest<ApiResponse<{ orders: Order[] }, PaginationMeta>>(
      `/orders/mine?limit=${ORDERS_PAGE_LIMIT}`
    );
    setOrders(response.data.orders);
  }, [authorizedRequest]);

  useFocusEffect(
    useCallback(() => {
      if (!isReady) return;
      if (!isAuthenticated) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      const fetchOrders = async () => {
        setIsLoading(true);
        try {
          await loadOrders();
        } catch (loadError) {
          setError(getErrorMessage(loadError, "Unable to load orders"));
        } finally {
          setIsLoading(false);
        }
      };

      void fetchOrders();
    }, [isAuthenticated, isReady, loadOrders])
  );

  const handleRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsRefreshing(true);
    setError(null);
    try {
      await loadOrders();
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, "Unable to refresh orders"));
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, loadOrders]);

  if (!isReady) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons color={COLORS.primaryDeep} name="receipt-outline" size={64} />
        <Text style={styles.emptyTitle}>Sign in to view your orders</Text>
        <Text style={styles.emptySubtitle}>Track all your placed orders and delivery updates here.</Text>
        <Button
          label="Go to Account"
          onPress={() => navigation.navigate("AccountTab")}
          style={{ marginTop: 24, width: "60%" }}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <OrdersSkeleton bottomInset={bottomInset} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#D1FAE5", "#6EE7B7"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroTitle}>My Orders</Text>
              <Text style={styles.heroSubTitle}>{orders.length} total orders</Text>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons color={COLORS.primaryDeep} name="checkmark-done" size={16} />
              <Text style={styles.heroBadgeText}>{deliveredCount} delivered</Text>
            </View>
          </View>
        </LinearGradient>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons color={COLORS.textMuted} name="cube-outline" size={64} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>Place your first order from Shop to start tracking here.</Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order) => <OrderCard key={order.id} order={order} />)}
          </View>
        )}
      </ScrollView>
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
    justifyContent: "center",
    paddingHorizontal: 20
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  hero: {
    ...ELEVATION.card,
    borderRadius: 24,
    marginBottom: 24,
    padding: 24
  },
  heroRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 24,
    fontWeight: "800"
  },
  heroSubTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
    opacity: 0.8
  },
  heroBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  heroBadgeText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 6
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginBottom: 16
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingVertical: 64,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 16
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 15,
    marginTop: 8,
    textAlign: "center"
  },
  ordersList: {
    gap: 16
  }
});
