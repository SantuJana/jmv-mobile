import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getErrorMessage } from "../lib/api-client";
import { formatCurrency, formatDateTime } from "../lib/format";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { ApiResponse, Order, PaginationMeta } from "../types/api";

type OrdersScreenProps = {
  bottomInset?: number;
  onRequireAuth: () => void;
};

const ORDERS_PAGE_LIMIT = 30;

const statusStyles: Record<Order["status"], { textColor: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING: { textColor: "#8A5B00", bgColor: "#FFF4D6", icon: "time-outline" },
  CONFIRMED: { textColor: "#0A5AA0", bgColor: "#E6F0FF", icon: "checkmark-circle-outline" },
  PACKED: { textColor: "#8A4A00", bgColor: "#FFE9D6", icon: "cube-outline" },
  OUT_FOR_DELIVERY: { textColor: "#0A6B77", bgColor: "#E4F8FA", icon: "bicycle-outline" },
  DELIVERED: { textColor: "#186D47", bgColor: "#E6F8EE", icon: "checkmark-done-outline" },
  CANCELLED: { textColor: "#A23030", bgColor: "#FFEAEA", icon: "close-circle-outline" }
};

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

export function OrdersScreen({ onRequireAuth, bottomInset = 24 }: OrdersScreenProps) {
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

  useEffect(() => {
    if (!isReady) {
      return;
    }

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
  }, [isAuthenticated, isReady, loadOrders]);

  const handleRefresh = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

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
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons color={COLORS.primary} name="receipt-outline" size={32} />
        <Text style={styles.emptyTitle}>Sign in to view your orders</Text>
        <Text style={styles.emptySubtitle}>Track all your placed orders and delivery updates here.</Text>
        <Pressable onPress={onRequireAuth} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>Go to Account</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
          <View style={styles.orderSkeletonHero}>
            <SkeletonBlock height={24} width="42%" />
            <SkeletonBlock height={12} width="34%" style={styles.skeletonGapTop} />
          </View>

          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={styles.orderCard}>
              <View style={styles.skeletonRow}>
                <SkeletonBlock height={14} width="46%" />
                <SkeletonBlock height={24} width={92} radius={999} />
              </View>
              <SkeletonBlock height={12} width="62%" style={styles.skeletonLargeGapTop} />
              <SkeletonBlock height={12} width="38%" style={styles.skeletonGapTop} />
              <SkeletonBlock height={12} width="74%" style={styles.skeletonLargeGapTop} />
              <SkeletonBlock height={16} width="34%" style={styles.skeletonLargeGapTop} />
            </View>
          ))}
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
          colors={["#FFC8CC", "#FFDEE1", "#FFF0F1"]}
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
              <Ionicons color={COLORS.surface} name="checkmark-done" size={14} />
              <Text style={styles.heroBadgeText}>{deliveredCount} delivered</Text>
            </View>
          </View>
        </LinearGradient>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>Place your first order from Shop to start tracking here.</Text>
          </View>
        ) : (
          orders.map((order) => {
            const statusStyle = statusStyles[order.status];
            const topItems = order.items.slice(0, 2);

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bgColor }]}>
                    <Ionicons color={statusStyle.textColor} name={statusStyle.icon} size={12} />
                    <Text style={[styles.statusPillText, { color: statusStyle.textColor }]}>{order.status}</Text>
                  </View>
                </View>

                <View style={styles.orderMetaRow}>
                  <Ionicons color={COLORS.textMuted} name="calendar-outline" size={13} />
                  <Text style={styles.orderMetaText}>Placed {formatDateTime(order.createdAt)}</Text>
                </View>

                <View style={styles.orderMetaRow}>
                  <Ionicons color={COLORS.textMuted} name="bag-outline" size={13} />
                  <Text style={styles.orderMetaText}>{order.items.length} items</Text>
                </View>

                {topItems.map((item) => (
                  <Text key={item.id} numberOfLines={1} style={styles.orderItemPreview}>
                    {item.quantity}x {item.productName} · {item.variantName}
                  </Text>
                ))}

                <View style={styles.orderFooter}>
                  <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
                  <Text style={styles.orderPayment}>Payment: {order.paymentMethod}</Text>
                </View>
              </View>
            );
          })
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
  skeletonRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  orderSkeletonHero: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 10
  },
  hero: {
    ...ELEVATION.card,
    borderRadius: 20,
    marginBottom: 12,
    padding: 14
  },
  heroRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: "700"
  },
  heroSubTitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 2
  },
  heroBadge: {
    alignItems: "center",
    backgroundColor: COLORS.danger,
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  heroBadgeText: {
    color: COLORS.surface,
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
  emptyState: {
    ...ELEVATION.card,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 6
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginTop: 4,
    textAlign: "center"
  },
  orderCard: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12
  },
  orderHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  orderNumber: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 8
  },
  statusPill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  statusPillText: {
    fontFamily: FONTS.body,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 3
  },
  orderMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 5
  },
  orderMetaText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginLeft: 6
  },
  orderItemPreview: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 2
  },
  orderFooter: {
    alignItems: "center",
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8
  },
  orderTotal: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700"
  },
  orderPayment: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 11
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 11
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.84
  }
});
