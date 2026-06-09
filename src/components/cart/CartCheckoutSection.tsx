import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatCurrency } from "../../lib/format";
import { COLORS, ELEVATION, FONTS } from "../../theme/design";
import type { Cart, Coupon } from "../../types/api";

type CartCheckoutSectionProps = {
  cart: Cart | null;
  deliveryValue: number;
  discountValue: number;
  payableValue: number;
  couponCode: string;
  appliedCoupon: { coupon: Coupon; discountAmount: string } | null;
  isApplyingCoupon: boolean;
  isPlacingOrder: boolean;
  isClearing: boolean;
  canPlaceOrder: boolean;
  onCouponCodeChange: (code: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  onPlaceOrder: () => void;
  onClearCart: () => void;
};

export function CartCheckoutSection({
  cart,
  deliveryValue,
  discountValue,
  payableValue,
  couponCode,
  appliedCoupon,
  isApplyingCoupon,
  isPlacingOrder,
  isClearing,
  canPlaceOrder,
  onCouponCodeChange,
  onApplyCoupon,
  onRemoveCoupon,
  onPlaceOrder,
  onClearCart
}: CartCheckoutSectionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.couponBox}>
        <Text style={styles.couponTitle}>Coupon</Text>
        <View style={styles.couponRow}>
          <TextInput
            autoCapitalize="characters"
            onChangeText={onCouponCodeChange}
            placeholder="Enter code"
            placeholderTextColor={COLORS.textMuted}
            style={styles.couponInput}
            value={couponCode}
          />
          <Pressable
            disabled={isApplyingCoupon}
            onPress={() => {
              Keyboard.dismiss();
              onApplyCoupon();
            }}
            style={({ pressed }) => [styles.applyBtn, pressed && styles.pressedBtn]}
          >
            {isApplyingCoupon ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Text style={styles.applyBtnText}>Apply</Text>
            )}
          </Pressable>
        </View>
        
        {appliedCoupon && (
          <View style={styles.appliedCouponRow}>
            <Text style={styles.appliedCouponText}>
              {appliedCoupon.coupon.code} applied · saved {formatCurrency(appliedCoupon.discountAmount)}
            </Text>
            <Pressable onPress={onRemoveCoupon}>
              <Text style={styles.removeCouponText}>Remove</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Items</Text>
        <Text style={styles.summaryValue}>{cart?.totalItems ?? 0}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}>{formatCurrency(cart?.subtotal ?? "0")}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Delivery</Text>
        <Text style={styles.summaryValue}>{deliveryValue > 0 ? formatCurrency(deliveryValue) : "FREE"}</Text>
      </View>
      {discountValue > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.discountLabel}>Coupon</Text>
          <Text style={styles.discountValue}>-{formatCurrency(discountValue)}</Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Pay Mode</Text>
        <Text style={styles.summaryValue}>Cash On Delivery</Text>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Payable</Text>
        <Text style={styles.totalValue}>{formatCurrency(payableValue)}</Text>
      </View>

      <Pressable
        disabled={isPlacingOrder || !canPlaceOrder}
        onPress={onPlaceOrder}
        style={({ pressed }) => [
          styles.placeOrderBtn,
          (!canPlaceOrder || isPlacingOrder) && styles.placeOrderBtnDisabled,
          pressed && canPlaceOrder && !isPlacingOrder && styles.placeOrderBtnPressed
        ]}
      >
        {isPlacingOrder ? (
          <ActivityIndicator color={COLORS.surface} size="small" />
        ) : (
          <Text style={styles.placeOrderBtnText}>Place Order</Text>
        )}
      </Pressable>

      <Pressable
        disabled={isClearing}
        onPress={onClearCart}
        style={({ pressed }) => [styles.clearBtn, pressed && styles.pressedBtn]}
      >
        {isClearing ? (
          <ActivityIndicator color={COLORS.surface} size="small" />
        ) : (
          <Text style={styles.clearBtnText}>Clear Cart</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...ELEVATION.card,
  },
  couponBox: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  couponTitle: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  couponRow: {
    flexDirection: "row",
    gap: 8,
  },
  couponInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  applyBtn: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  pressedBtn: {
    opacity: 0.8,
  },
  applyBtnText: {
    color: COLORS.surface,
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: "700",
  },
  appliedCouponRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  appliedCouponText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primaryDeep,
    flex: 1,
  },
  removeCouponText: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.danger,
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  discountLabel: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.success,
  },
  discountValue: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.success,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: 16,
  },
  totalLabel: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primaryDeep,
  },
  placeOrderBtn: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    ...ELEVATION.floating,
  },
  placeOrderBtnDisabled: {
    backgroundColor: COLORS.surfaceMuted,
    elevation: 0,
    shadowOpacity: 0,
  },
  placeOrderBtnPressed: {
    backgroundColor: COLORS.primaryDeep,
  },
  placeOrderBtnText: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.surface,
  },
  clearBtn: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  clearBtnText: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.danger,
  },
});
