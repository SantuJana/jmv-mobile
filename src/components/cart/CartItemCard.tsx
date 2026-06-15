import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../../lib/format";
import { getVariantDiscountLabel, getVariantThumbnailImageUri } from "../../lib/product-utils";
import { COLORS, FONTS } from "../../theme/design";
import type { CartItem } from "../../types/api";

type CartItemCardProps = {
  item: CartItem;
  isBusy: boolean;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
};

export function CartItemCard({ item, isBusy, onUpdateQuantity, onRemove }: CartItemCardProps) {
  const imageUri = getVariantThumbnailImageUri(item.variant, item.product);
  const canDecrease = item.quantity > 1;
  const offerPrice = item.variant.offerPrice ?? item.variant.price ?? item.unitPrice;
  const hasDiscount = item.variant.mrp && Number(item.variant.mrp) > Number(offerPrice);
  const discountLabel = getVariantDiscountLabel({ mrp: item.variant.mrp, price: offerPrice });

  return (
    <View style={styles.card}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons color={COLORS.textMuted} name="image-outline" size={24} />
        </View>
      )}

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.name}>
          {item.product.name}
        </Text>
        <Text style={styles.meta}>{item.variant.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.offerPrice}>{formatCurrency(offerPrice)} each</Text>
          {hasDiscount ? <Text style={styles.mrp}>{formatCurrency(item.variant.mrp)}</Text> : null}
          {discountLabel ? <Text style={styles.discountBadge}>{discountLabel}</Text> : null}
        </View>
        <Text style={styles.total}>{formatCurrency(item.lineTotal)}</Text>

        <View style={styles.actions}>
          <View style={styles.stepper}>
            <Pressable
              disabled={!canDecrease || isBusy}
              onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
              style={[styles.stepperBtn, !canDecrease && styles.stepperBtnDisabled]}
            >
              <Ionicons color={COLORS.surface} name="remove" size={16} />
            </Pressable>
            
            <Text style={styles.quantity}>{item.quantity}</Text>
            
            <Pressable
              disabled={isBusy}
              onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
              style={styles.stepperBtn}
            >
              <Ionicons color={COLORS.surface} name="add" size={16} />
            </Pressable>
          </View>

          <Pressable
            disabled={isBusy}
            onPress={() => onRemove(item.id)}
            style={styles.removeBtn}
          >
            {isBusy ? (
              <ActivityIndicator color={COLORS.danger} size="small" />
            ) : (
              <Text style={styles.removeBtnText}>Remove</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  meta: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  offerPrice: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.heading,
    fontSize: 12,
    fontWeight: "800",
  },
  mrp: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: COLORS.chipBg,
    borderRadius: 999,
    color: COLORS.primaryDeep,
    fontFamily: FONTS.heading,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  total: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    padding: 4,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  quantity: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
    width: 32,
    textAlign: "center",
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeBtnText: {
    color: COLORS.danger,
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: "700",
  },
});
