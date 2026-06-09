import { ActivityIndicator, Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { formatCurrency } from "../../lib/format";
import { getProductCardImageUri, getVariantDiscountLabel } from "../../lib/product-utils";
import { CartDropSource, getCartDropSourceFromEvent } from "../../lib/ui-utils";
import { COLORS, ELEVATION, FONTS } from "../../theme/design";
import type { Product, ProductVariant } from "../../types/api";

type VariantPickerSheetProps = {
  product: Product | null;
  variants: ProductVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (variantId: string) => void;
  onClose: () => void;
  onConfirm: (dropSource?: CartDropSource | null) => void;
  isAdding: boolean;
};

const VARIANT_SHEET_DISMISS_DISTANCE = 96;
const VARIANT_SHEET_DISMISS_VELOCITY = 0.85;
const VARIANT_SHEET_MAX_UPWARD_DRAG = -28;
const VARIANT_SHEET_CLOSED_OFFSET = 720;

export function VariantPickerSheet({
  product,
  variants,
  selectedVariantId,
  onSelectVariant,
  onClose,
  onConfirm,
  isAdding
}: VariantPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(VARIANT_SHEET_CLOSED_OFFSET)).current;

  useEffect(() => {
    if (product) {
      translateY.setValue(0);
    }
  }, [product, translateY]);

  const handleClose = useCallback(() => {
    Animated.timing(translateY, {
      duration: 180,
      toValue: VARIANT_SHEET_CLOSED_OFFSET,
      useNativeDriver: true
    }).start(onClose);
  }, [onClose, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, gestureState) =>
          Math.abs(gestureState.dy) > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          translateY.stopAnimation();
        },
        onPanResponderMove: (_e, gestureState) => {
          translateY.setValue(Math.max(gestureState.dy, VARIANT_SHEET_MAX_UPWARD_DRAG));
        },
        onPanResponderRelease: (_e, gestureState) => {
          const shouldDismiss =
            gestureState.dy > VARIANT_SHEET_DISMISS_DISTANCE || gestureState.vy > VARIANT_SHEET_DISMISS_VELOCITY;

          if (shouldDismiss) {
            handleClose();
            return;
          }

          Animated.spring(translateY, {
            bounciness: 4,
            speed: 18,
            toValue: 0,
            useNativeDriver: true
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            bounciness: 4,
            speed: 18,
            toValue: 0,
            useNativeDriver: true
          }).start();
        }
      }),
    [handleClose, translateY]
  );

  const isVisible = Boolean(product);
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={isVisible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable onPress={handleClose} style={styles.backdrop} />
        
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 16,
              transform: [{ translateY }]
            }
          ]}
        >
          <View
            {...panResponder.panHandlers}
            style={styles.handleContainer}
            accessibilityRole="button"
          >
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text numberOfLines={1} style={styles.title}>
              {product?.name ?? "Choose Variant"}
            </Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons color={COLORS.textSecondary} name="close" size={20} />
            </Pressable>
          </View>

          <Text style={styles.hint}>Select a pack size</Text>

          <ScrollView contentContainerStyle={styles.list}>
            {variants.map((variant) => {
              const isSelected = selectedVariantId === variant.id;
              const discountLabel = getVariantDiscountLabel(variant);

              return (
                <Pressable
                  key={variant.id}
                  onPress={() => onSelectVariant(variant.id)}
                  style={[styles.option, isSelected && styles.optionSelected]}
                >
                  <View style={styles.optionTop}>
                    <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>
                      {variant.name}
                    </Text>
                  <View style={styles.optionPriceWrap}>
                      <Text style={[styles.optionPrice, isSelected && styles.optionPriceSelected]}>
                        {formatCurrency(variant.price)}
                      </Text>
                      {variant.mrp && variant.mrp !== variant.price ? (
                        <Text style={styles.optionMrp}>{formatCurrency(variant.mrp)}</Text>
                      ) : null}
                      {discountLabel ? <Text style={styles.optionDiscount}>{discountLabel}</Text> : null}
                    </View>
                  </View>
                  <Text style={[styles.optionMeta, isSelected && styles.optionMetaSelected]}>
                    {variant.unit} · Stock {variant.stock}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            disabled={!selectedVariant || isAdding}
            onPress={(event) =>
              onConfirm(getCartDropSourceFromEvent(event, getProductCardImageUri(product)))
            }
            style={({ pressed }) => [
              styles.addButton,
              !selectedVariant && styles.addButtonDisabled,
              pressed && selectedVariant && !isAdding && styles.addButtonPressed
            ]}
          >
            {isAdding ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Text style={styles.addButtonText}>Add Selected Variant</Text>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "85%",
    ...ELEVATION.sheet,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    backgroundColor: COLORS.border,
    borderRadius: 999,
    height: 5,
    width: 48,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  title: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "800",
    paddingRight: 16,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  hint: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  option: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  optionSelected: {
    backgroundColor: COLORS.chipBg,
    borderColor: COLORS.primary,
  },
  optionTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  optionName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "700",
  },
  optionNameSelected: {
    color: COLORS.primaryDeep,
  },
  optionPriceWrap: {
    alignItems: "flex-end",
  },
  optionPrice: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "800",
  },
  optionPriceSelected: {
    color: COLORS.primaryDeep,
  },
  optionMrp: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  optionDiscount: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.heading,
    fontSize: 11,
    fontWeight: "800",
  },
  optionMeta: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600",
  },
  optionMetaSelected: {
    color: COLORS.primary,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    marginHorizontal: 24,
    ...ELEVATION.floating,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.surfaceMuted,
    elevation: 0,
    shadowOpacity: 0,
  },
  addButtonPressed: {
    backgroundColor: COLORS.primaryDeep,
  },
  addButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700",
  },
});
