import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { getErrorMessage } from "../lib/api-client";
import { formatCurrency, formatDateTime } from "../lib/format";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { ApiResponse, Order } from "../types/api";
import type { RootStackParamList } from "../navigation/types";
import { ORDER_STATUS_STYLES } from "../components/orders/OrderCard";

type OrderDetailScreenRouteProp = RouteProp<RootStackParamList, "OrderDetail">;
type OrderDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_STEPS = ["PENDING", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];
const STEP_LABELS = ["Placed", "Confirmed", "Packed", "On The Way", "Delivered"];

export function OrderDetailScreen() {
  const route = useRoute<OrderDetailScreenRouteProp>();
  const navigation = useNavigation<OrderDetailNavigationProp>();
  const insets = useSafeAreaInsets();
  
  const { orderId } = route.params;
  const { authorizedRequest } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authorizedRequest<ApiResponse<{ order: Order }>>(`/orders/mine/${orderId}`);
      setOrder(response.data.order);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load order details"));
    } finally {
      setIsLoading(false);
    }
  }, [orderId, authorizedRequest]);

  useEffect(() => {
    void fetchOrderDetail();
  }, [fetchOrderDetail]);

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Order Detail</Text>
        </View>
        <View style={styles.centeredContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
          <Text style={styles.emptyTitle}>Oops!</Text>
          <Text style={styles.emptySubtitle}>{error || "Order not found"}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void fetchOrderDetail()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = ORDER_STATUS_STYLES[order.status];
  const activeStepIndex = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED";

  const totalMrp = order.items.reduce((sum, item) => sum + parseFloat(item.mrp || item.unitPrice) * item.quantity, 0);
  const totalSavings = (totalMrp - parseFloat(order.subtotal)) + parseFloat(order.discountAmount);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSubtitle}>{order.orderNumber}</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Tracker */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Status</Text>
            <View style={[styles.statusPill, { backgroundColor: statusStyle.bgColor }]}>
              <Ionicons color={statusStyle.textColor} name={statusStyle.icon} size={12} />
              <Text style={[styles.statusText, { color: statusStyle.textColor }]}>{order.status}</Text>
            </View>
          </View>

          {isCancelled ? (
            <View style={styles.cancelAlert}>
              <Ionicons name="close-circle" size={20} color={COLORS.danger} />
              <Text style={styles.cancelAlertText}>This order has been cancelled.</Text>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx <= activeStepIndex;
                const isCurrent = idx === activeStepIndex;
                return (
                  <View key={step} style={styles.timelineStep}>
                    <View style={styles.timelineLineContainer}>
                      {/* Connecting Line */}
                      {idx > 0 && (
                        <View 
                          style={[
                            styles.timelineLine, 
                            idx <= activeStepIndex && styles.timelineLineCompleted
                          ]} 
                        />
                      )}
                      
                      {/* Step Dot */}
                      <View 
                        style={[
                          styles.timelineDot,
                          isCompleted && styles.timelineDotCompleted,
                          isCurrent && styles.timelineDotCurrent
                        ]}
                      >
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={10} color={COLORS.surface} />
                        ) : (
                          <View style={styles.timelineDotInner} />
                        )}
                      </View>
                    </View>
                    <Text 
                      style={[
                        styles.timelineLabel, 
                        isCompleted && styles.timelineLabelCompleted,
                        isCurrent && styles.timelineLabelCurrent
                      ]}
                    >
                      {STEP_LABELS[idx]}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={styles.placedDate}>Placed on {formatDateTime(order.createdAt)}</Text>
        </View>

        {/* Delivery Address */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Address</Text>
          <View style={styles.addressBox}>
            <Text style={styles.addressName}>
              {order.address.fullName} <Text style={styles.addressType}>({order.address.type})</Text>
            </Text>
            <Text style={styles.addressPhone}>
              <Ionicons name="call-outline" size={12} color={COLORS.textSecondary} /> {order.address.phone}
            </Text>
            <Text style={styles.addressLine}>{order.address.line1}</Text>
            {order.address.line2 ? <Text style={styles.addressLine}>{order.address.line2}</Text> : null}
            <Text style={styles.addressLine}>
              {order.address.city}, {order.address.state} {order.address.postalCode}
            </Text>
          </View>
        </View>

        {/* Ordered Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items Ordered</Text>
          <View style={styles.itemsContainer}>
            {order.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemVariant}>
                    {item.variantName} {item.unit ? `· ${item.unit}` : ""}
                  </Text>
                </View>
                <View style={styles.itemPriceQty}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <View style={styles.itemPriceWrap}>
                    <Text style={styles.itemPrice}>{formatCurrency(parseFloat(item.unitPrice))}</Text>
                    {item.mrp && item.mrp !== item.unitPrice ? (
                      <Text style={styles.itemMrp}>{formatCurrency(parseFloat(item.mrp))}</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(parseFloat(item.total))}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bill Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bill Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Subtotal</Text>
            <Text style={styles.billValue}>{formatCurrency(parseFloat(order.subtotal))}</Text>
          </View>
          {parseFloat(order.discountAmount) > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabelDiscount}>
                Coupon Discount {order.couponCode ? `(${order.couponCode})` : ""}
              </Text>
              <Text style={styles.billValueDiscount}>-{formatCurrency(parseFloat(order.discountAmount))}</Text>
            </View>
          )}
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValue}>
              {parseFloat(order.deliveryFee) === 0 ? (
                <Text style={styles.freeText}>FREE</Text>
              ) : (
                formatCurrency(parseFloat(order.deliveryFee))
              )}
            </Text>
          </View>
          <View style={[styles.billRow, styles.billRowTotal]}>
            <Text style={styles.billLabelTotal}>Total Paid</Text>
            <Text style={styles.billValueTotal}>{formatCurrency(parseFloat(order.total))}</Text>
          </View>
          {totalSavings > 0 && (
            <View style={styles.savingsBox}>
              <Text style={styles.savingsText}>You saved {formatCurrency(totalSavings)} on this order!</Text>
            </View>
          )}
        </View>

        {/* Additional Info */}
        <View style={[styles.card, styles.lastCard]}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          <View style={styles.metaInfoRow}>
            <Text style={styles.metaInfoLabel}>Method</Text>
            <Text style={styles.metaInfoValue}>Cash On Delivery (COD)</Text>
          </View>
          <View style={styles.metaInfoRow}>
            <Text style={styles.metaInfoLabel}>Payment Status</Text>
            <Text 
              style={[
                styles.metaInfoValue, 
                order.paymentStatus === "PAID" ? styles.paymentPaid : styles.paymentPending
              ]}
            >
              {order.paymentStatus}
            </Text>
          </View>
          <View style={styles.metaInfoRow}>
            <Text style={styles.metaInfoLabel}>Order Ref</Text>
            <Text style={[styles.metaInfoValue, styles.metaInfoRef]}>{order.id}</Text>
          </View>
          {order.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  centeredContainer: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
    ...ELEVATION.card,
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lastCard: {
    marginBottom: 0,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusPill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: FONTS.body,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  cancelAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEAEA",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  cancelAlertText: {
    color: "#A23030",
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
  timelineContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    marginVertical: 12,
  },
  timelineStep: {
    alignItems: "center",
    flex: 1,
  },
  timelineLineContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  timelineLine: {
    position: "absolute",
    right: "50%",
    height: 2,
    backgroundColor: COLORS.border,
    width: "100%",
    zIndex: -1,
  },
  timelineLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineDotCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineDotCurrent: {
    borderColor: COLORS.primaryDeep,
    borderWidth: 3,
    backgroundColor: COLORS.surface,
  },
  timelineDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  timelineLabel: {
    fontSize: 9,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: "center",
    fontWeight: "600",
  },
  timelineLabelCompleted: {
    color: COLORS.textSecondary,
  },
  timelineLabelCurrent: {
    color: COLORS.textPrimary,
    fontWeight: "800",
  },
  placedDate: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
  addressBox: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 14,
  },
  addressName: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  addressType: {
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  addressPhone: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  addressLine: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  itemsContainer: {
    gap: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
    paddingBottom: 12,
  },
  itemInfo: {
    flex: 2,
    marginRight: 8,
  },
  itemName: {
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  itemVariant: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  itemPriceQty: {
    flex: 1,
    alignItems: "flex-end",
    marginRight: 12,
  },
  itemQty: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  itemPriceWrap: {
    alignItems: "flex-end",
    marginTop: 2,
  },
  itemPrice: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.primaryDeep,
    fontWeight: "600",
  },
  itemMrp: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },
  itemTotal: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    minWidth: 70,
    textAlign: "right",
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  billLabel: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  billValue: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  billLabelDiscount: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  billValueDiscount: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.success,
  },
  freeText: {
    color: COLORS.success,
    fontWeight: "800",
  },
  billRowTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
    marginTop: 4,
    marginBottom: 0,
  },
  billLabelTotal: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  billValueTotal: {
    fontFamily: FONTS.heading,
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.primaryDeep,
  },
  savingsBox: {
    backgroundColor: COLORS.chipBg,
    borderRadius: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  savingsText: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.success,
  },
  metaInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  metaInfoLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  metaInfoValue: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  metaInfoRef: {
    fontFamily: FONTS.mono,
    fontSize: 10,
  },
  paymentPaid: {
    color: COLORS.success,
    fontWeight: "800",
  },
  paymentPending: {
    color: COLORS.warning,
    fontWeight: "800",
  },
  notesBox: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  notesLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  notesText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 16,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: COLORS.primaryDeep,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  retryText: {
    color: COLORS.surface,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
  },
});
