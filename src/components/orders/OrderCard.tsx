import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { formatCurrency, formatDateTime } from "../../lib/format";
import { COLORS, ELEVATION, FONTS } from "../../theme/design";
import type { Order } from "../../types/api";
import type { RootStackParamList } from "../../navigation/types";

export const ORDER_STATUS_STYLES: Record<
  Order["status"],
  { textColor: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PENDING: { textColor: "#8A5B00", bgColor: "#FFF4D6", icon: "time-outline" },
  CONFIRMED: { textColor: "#0A5AA0", bgColor: "#E6F0FF", icon: "checkmark-circle-outline" },
  PACKED: { textColor: "#8A4A00", bgColor: "#FFE9D6", icon: "cube-outline" },
  OUT_FOR_DELIVERY: { textColor: "#0A6B77", bgColor: "#E4F8FA", icon: "bicycle-outline" },
  DELIVERED: { textColor: "#186D47", bgColor: "#E6F8EE", icon: "checkmark-done-outline" },
  CANCELLED: { textColor: "#A23030", bgColor: "#FFEAEA", icon: "close-circle-outline" }
};

export function OrderCard({ order }: { order: Order }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const statusStyle = ORDER_STATUS_STYLES[order.status];
  const topItems = order.items.slice(0, 2);

  return (
    <Pressable 
      style={styles.card} 
      onPress={() => navigation.navigate("OrderDetail", { orderId: order.id })}
    >
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusStyle.bgColor }]}>
          <Ionicons color={statusStyle.textColor} name={statusStyle.icon} size={12} />
          <Text style={[styles.statusText, { color: statusStyle.textColor }]}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons color={COLORS.textMuted} name="calendar-outline" size={13} />
        <Text style={styles.metaText}>Placed {formatDateTime(order.createdAt)}</Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons color={COLORS.textMuted} name="bag-outline" size={13} />
        <Text style={styles.metaText}>{order.items.length} items</Text>
      </View>

      {topItems.map((item) => (
        <Text key={item.id} numberOfLines={1} style={styles.itemPreview}>
          {item.quantity}x {item.productName} · {item.variantName}
        </Text>
      ))}

      {order.items.length > 2 && (
        <Text style={styles.itemPreview}>+ {order.items.length - 2} more item(s)</Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.total}>{formatCurrency(order.total)}</Text>
        <Text style={styles.payment}>Payment: {order.paymentMethod}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    ...ELEVATION.card,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  orderNumber: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 8,
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
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 6,
  },
  metaText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginLeft: 6,
  },
  itemPreview: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    alignItems: "center",
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
  },
  total: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "800",
  },
  payment: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "500",
  },
});
