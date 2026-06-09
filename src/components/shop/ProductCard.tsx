import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../../lib/format";
import { findBestOfferVariant, getProductCardImageUri, getVariantDiscountLabel } from "../../lib/product-utils";
import { CartDropSource, getCartDropSourceFromEvent } from "../../lib/ui-utils";
import { COLORS, ELEVATION, FONTS } from "../../theme/design";
import type { Product, ProductVariant } from "../../types/api";

type ProductCardProps = {
  product: Product;
  onProductPress: (product: Product) => void;
  onPressAddForProduct: (product: Product, variants: ProductVariant[], dropSource?: CartDropSource | null) => void;
  addingVariantId: string | null;
};

export function ProductCard({
  product,
  onProductPress,
  onPressAddForProduct,
  addingVariantId
}: ProductCardProps) {
  const imageUri = getProductCardImageUri(product);
  const variants = product.variants.filter((variant) => variant.isActive);
  const bestOfferVariant = findBestOfferVariant(variants);
  const discountLabel = getVariantDiscountLabel(bestOfferVariant);
  const isOutOfStock = !bestOfferVariant || variants.every((variant) => variant.stock <= 0);
  const isAddingAnyVariant = variants.some((variant) => addingVariantId === variant.id);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onProductPress(product)}
        style={({ pressed }) => [
          styles.imageContainer,
          pressed ? styles.pressed : null
        ]}
      >
        {imageUri ? (
          <Image resizeMode="cover" source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons color={COLORS.textMuted} name="image-outline" size={24} />
          </View>
        )}
        {discountLabel ? <Text style={styles.discountBadge}>{discountLabel}</Text> : null}
      </Pressable>

      <View style={styles.body}>
        <Pressable accessibilityRole="button" onPress={() => onProductPress(product)}>
          <View style={styles.metaPill}>
            <Text numberOfLines={1} style={styles.meta}>
              {product.category.name}
            </Text>
          </View>

          <Text numberOfLines={2} style={styles.name}>
            {product.name}
          </Text>
        </Pressable>

        {bestOfferVariant ? (
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatCurrency(bestOfferVariant.price)}{" "}
              <Text style={styles.unit}>/{bestOfferVariant.unit}</Text>
            </Text>
            {bestOfferVariant.mrp && bestOfferVariant.mrp !== bestOfferVariant.price ? (
              <Text style={styles.mrp}>{formatCurrency(bestOfferVariant.mrp)}</Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.outOfStock}>Unavailable</Text>
        )}

        <View style={styles.actionRow}>
          <Text numberOfLines={1} style={styles.variantHint}>
            {variants.length > 1
              ? `${variants.length} options`
              : variants.length === 1
                ? variants[0].name
                : ""}
          </Text>

          <Pressable
            disabled={!bestOfferVariant || isOutOfStock || isAddingAnyVariant}
            onPress={(event) =>
              onPressAddForProduct(product, variants, getCartDropSourceFromEvent(event, imageUri))
            }
            style={({ pressed }) => [
              styles.addButton,
              variants.length > 1 && styles.addButtonWide,
              pressed && bestOfferVariant && !isOutOfStock && styles.addButtonPressed,
              (!bestOfferVariant || isOutOfStock) && styles.addButtonDisabled,
              isAddingAnyVariant && styles.addButtonBusy
            ]}
          >
            {isAddingAnyVariant ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : isOutOfStock ? (
              <Ionicons color={COLORS.textMuted} name="close" size={16} />
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
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24, // softer radius for glassmorphic feel
    marginBottom: 16,
    width: "48%",
    ...ELEVATION.card,
    overflow: "hidden",
  },
  imageContainer: {
    height: 110,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.85,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    opacity: 0.5,
  },
  body: {
    padding: 12,
    flex: 1,
    justifyContent: "space-between",
  },
  metaPill: {
    backgroundColor: COLORS.chipBg,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  meta: {
    fontFamily: FONTS.body,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primaryDeep,
  },
  name: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  price: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primaryDeep,
  },
  mrp: {
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.primaryDeep,
    borderRadius: 8,
    color: COLORS.surface,
    fontFamily: FONTS.heading,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
  },
  unit: {
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  outOfStock: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.danger,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  variantHint: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.textMuted,
    flex: 1,
    paddingRight: 4,
  },
  addButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...ELEVATION.card,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
  },
  addButtonWide: {
    width: "auto",
    paddingHorizontal: 14,
  },
  addButtonPressed: {
    backgroundColor: COLORS.primaryDeep,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.surfaceMuted,
    shadowOpacity: 0,
  },
  addButtonBusy: {
    backgroundColor: "transparent",
    shadowOpacity: 0,
  },
  addButtonText: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.surface,
  },
});
