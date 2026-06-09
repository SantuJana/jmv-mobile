import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiClient, getErrorMessage } from "../lib/api-client";
import { formatCurrency } from "../lib/format";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { ApiResponse, Cart, Address } from "../types/api";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";

import { CartItemCard } from "../components/cart/CartItemCard";
import { CartSkeleton } from "../components/cart/CartSkeleton";
import { Button } from "../components/common/Button";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "CartTab">,
  NativeStackScreenProps<RootStackParamList>
>;

export function CartScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom + 80;

  const { isReady, isAuthenticated, authorizedRequest } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);

  const totalItems = useMemo(() => {
    return cart?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0;
  }, [cart]);

  const loadCart = useCallback(async () => {
    setError(null);
    const response = await authorizedRequest<ApiResponse<{ cart: Cart }>>("/cart");
    setCart(response.data.cart);
  }, [authorizedRequest]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }
    if (!cart) return;

    setIsCheckingCoupon(true);
    setCouponError(null);

    try {
      const response = await authorizedRequest<ApiResponse<{ coupon: any; discountAmount: string }>>("/coupons/validate", {
        method: "POST",
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          subtotal: cart.subtotal
        })
      });

      setAppliedCoupon(response.data.coupon);
      setDiscountAmount(parseFloat(response.data.discountAmount));
      setCouponError(null);
      Alert.alert("Coupon Applied", `You saved ${formatCurrency(parseFloat(response.data.discountAmount))}!`);
    } catch (err) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponError(getErrorMessage(err, "Invalid coupon code"));
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
    setCouponError(null);
  };

  // Re-validate coupon if subtotal changes and coupon is applied
  useEffect(() => {
    if (appliedCoupon && cart) {
      const revalidateCoupon = async () => {
        try {
          const response = await authorizedRequest<ApiResponse<{ coupon: any; discountAmount: string }>>("/coupons/validate", {
            method: "POST",
            body: JSON.stringify({
              code: appliedCoupon.code,
              subtotal: cart.subtotal
            })
          });
          setDiscountAmount(parseFloat(response.data.discountAmount));
          setCouponError(null);
        } catch (err) {
          setAppliedCoupon(null);
          setDiscountAmount(0);
          const errorMsg = getErrorMessage(err, "Applied coupon is no longer valid");
          setCouponError(errorMsg);
          Alert.alert("Coupon Removed", errorMsg);
        }
      };
      void revalidateCoupon();
    }
  }, [cart?.subtotal, authorizedRequest]);

  useFocusEffect(
    useCallback(() => {
      if (!isReady) return;
      if (!isAuthenticated) {
        setCart(null);
        setIsLoading(false);
        return;
      }

      const fetchCartAndAddresses = async () => {
        setIsLoading(true);
        try {
          await loadCart();
          const addressRes = await authorizedRequest<ApiResponse<{ addresses: Address[] }>>("/users/me/addresses");
          const loadedAddresses = addressRes.data.addresses;
          setAddresses(loadedAddresses);
          
          if (loadedAddresses.length > 0) {
            const defaultAddr = loadedAddresses.find((a: Address) => a.isDefault) || loadedAddresses[0];
            setSelectedAddressId(defaultAddr.id);
          }
        } catch (loadError) {
          setError(getErrorMessage(loadError, "Unable to load data"));
        } finally {
          setIsLoading(false);
        }
      };

      void fetchCartAndAddresses();
    }, [isAuthenticated, isReady, loadCart])
  );

  const handleUpdateQuantity = async (cartItemId: string, quantity: number) => {
    setIsUpdating(cartItemId);
    try {
      await authorizedRequest<ApiResponse<{ cart: Cart }>>(`/cart/items/${cartItemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity })
      });
      await loadCart();
    } catch (updateError) {
      Alert.alert("Error", getErrorMessage(updateError, "Failed to update quantity"));
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    setIsUpdating(cartItemId);
    try {
      await authorizedRequest<ApiResponse<{ cart: Cart }>>(`/cart/items/${cartItemId}`, {
        method: "DELETE"
      });
      await loadCart();
    } catch (removeError) {
      Alert.alert("Error", getErrorMessage(removeError, "Failed to remove item"));
    } finally {
      setIsUpdating(null);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert("No Address", "Please select or add a delivery address.");
      return;
    }
    
    setIsPlacingOrder(true);
    try {
      await authorizedRequest<ApiResponse<{ order: unknown }>>("/orders", {
        method: "POST",
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod: "COD",
          couponCode: appliedCoupon ? appliedCoupon.code : undefined
        })
      });
      Alert.alert("Success", "Your order has been placed!");
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponCode("");
      setCart(null);
      navigation.navigate("OrdersTab");
    } catch (orderError) {
      Alert.alert("Checkout Failed", getErrorMessage(orderError, "Failed to place order"));
    } finally {
      setIsPlacingOrder(false);
    }
  };

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
        <Ionicons color={COLORS.primaryDeep} name="cart-outline" size={64} />
        <Text style={styles.emptyTitle}>Sign in to view your cart</Text>
        <Text style={styles.emptySubtitle}>You must be logged in to add items and checkout.</Text>
        <Button
          label="Go to Account"
          onPress={() => navigation.navigate("AccountTab")}
          style={{ marginTop: 24, width: "60%" }}
        />
      </View>
    );
  }

  if (isLoading && !cart) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <CartSkeleton bottomInset={bottomInset} />
      </SafeAreaView>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons color={COLORS.textMuted} name="cart-outline" size={64} />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Explore our shop to add some items.</Text>
        <Button
          label="Go to Shop"
          onPress={() => navigation.navigate("ShopTab")}
          style={{ marginTop: 24, width: "60%" }}
        />
      </View>
    );
  }

  const FREE_DELIVERY_THRESHOLD = 500;
  const deliveryFee = parseFloat(cart.subtotal) >= FREE_DELIVERY_THRESHOLD ? 0 : 40;
  const finalTotal = Math.max(0, parseFloat(cart.subtotal) + deliveryFee - discountAmount);
  const progressToFreeDelivery = Math.min(100, (parseFloat(cart.subtotal) / FREE_DELIVERY_THRESHOLD) * 100);

  const totalMrp = cart.items.reduce((sum, item) => sum + parseFloat(item.variant.mrp || item.unitPrice) * item.quantity, 0);
  const totalSavings = (totalMrp - parseFloat(cart.subtotal)) + discountAmount;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#A7F3D0", "#34D399"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>Basket Summary</Text>
          <Text style={styles.heroSubTitle}>
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </Text>

          <View style={styles.deliveryWidget}>
            <View style={styles.deliveryHeaderRow}>
              <Ionicons color={COLORS.primaryDeep} name="bicycle" size={18} />
              <Text style={styles.deliveryWidgetText}>
                {deliveryFee === 0
                  ? "You got Free Delivery!"
                  : `Add ${formatCurrency(FREE_DELIVERY_THRESHOLD - parseFloat(cart.subtotal))} more for Free Delivery`}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressToFreeDelivery}%` }]} />
            </View>
          </View>
        </LinearGradient>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>Review Items</Text>
        <View style={styles.itemsList}>
          {cart.items.map((item) => (
            <CartItemCard
              item={item}
              isBusy={isUpdating === item.id}
              key={item.id}
              onRemove={(id) => void handleRemoveItem(id)}
              onUpdateQuantity={(id, quantity) => void handleUpdateQuantity(id, quantity)}
            />
          ))}
        </View>

        {/* Coupon Card */}
        <View style={styles.billCard}>
          <View style={styles.couponHeader}>
            <Ionicons name="pricetag-outline" size={18} color={COLORS.primaryDeep} />
            <Text style={styles.couponCardTitle}>Coupons & Offers</Text>
          </View>

          <View style={styles.couponInputContainer}>
            <TextInput
              style={[
                styles.couponInput,
                appliedCoupon && styles.couponInputDisabled,
                couponError && styles.couponInputError
              ]}
              placeholder="Enter Coupon Code"
              placeholderTextColor={COLORS.textMuted}
              value={couponCode}
              onChangeText={(text) => {
                setCouponCode(text);
                setCouponError(null);
              }}
              autoCapitalize="characters"
              editable={!appliedCoupon && !isCheckingCoupon}
            />
            {appliedCoupon ? (
              <Pressable
                style={[styles.couponButton, styles.couponButtonRemove]}
                onPress={handleRemoveCoupon}
              >
                <Text style={styles.couponButtonTextRemove}>Remove</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.couponButton}
                onPress={() => void handleApplyCoupon()}
                disabled={isCheckingCoupon || !couponCode.trim()}
              >
                {isCheckingCoupon ? (
                  <ActivityIndicator color={COLORS.surface} size="small" />
                ) : (
                  <Text style={styles.couponButtonText}>Apply</Text>
                )}
              </Pressable>
            )}
          </View>

          {couponError ? (
            <Text style={styles.couponErrorText}>{couponError}</Text>
          ) : null}

          {appliedCoupon ? (
            <View style={styles.couponSuccessBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.couponSuccessText}>
                "{appliedCoupon.code}" applied! You saved {formatCurrency(discountAmount)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.billCard}>
          <View style={styles.addressCardHeader}>
            <Text style={styles.billTitle}>Delivery Address</Text>
            {addresses.length > 0 && (
              <Pressable onPress={() => setIsAddressModalVisible(true)}>
                <Text style={styles.changeAddressText}>Change</Text>
              </Pressable>
            )}
          </View>
          
          {selectedAddressId ? (() => {
            const addr = addresses.find((a: Address) => a.id === selectedAddressId);
            if (!addr) return null;
            return (
              <View style={styles.addressDetailsWrap}>
                <Text style={styles.addressName}>{addr.fullName} <Text style={styles.addressType}>({addr.type})</Text></Text>
                <Text style={styles.addressLine}>{addr.line1}</Text>
                {addr.line2 ? <Text style={styles.addressLine}>{addr.line2}</Text> : null}
                <Text style={styles.addressLine}>{addr.city}, {addr.state} {addr.postalCode}</Text>
              </View>
            );
          })() : (
            <Button 
              label="Add Delivery Address" 
              onPress={() => navigation.navigate("AddAddress")}
            />
          )}
        </View>

        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Bill Details</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>{formatCurrency(parseFloat(cart.subtotal))}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabelCoupon}>Coupon Discount</Text>
              <Text style={styles.billValueCoupon}>-{formatCurrency(discountAmount)}</Text>
            </View>
          )}
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValue}>
              {deliveryFee === 0 ? <Text style={styles.freeText}>FREE</Text> : formatCurrency(deliveryFee)}
            </Text>
          </View>
          <View style={[styles.billRow, styles.billRowTotal]}>
            <Text style={styles.billLabelTotal}>To Pay</Text>
            <Text style={styles.billValueTotal}>{formatCurrency(finalTotal)}</Text>
          </View>
          {totalSavings > 0 && (
            <View style={styles.savingsBox}>
              <Text style={styles.savingsText}>You saved {formatCurrency(totalSavings)} on this order!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={isAddressModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery Address</Text>
              <Pressable onPress={() => setIsAddressModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {addresses.map((addr: Address) => (
                <Pressable
                  key={addr.id}
                  style={[styles.addressOption, selectedAddressId === addr.id && styles.addressOptionSelected]}
                  onPress={() => {
                    setSelectedAddressId(addr.id);
                    setIsAddressModalVisible(false);
                  }}
                >
                  <View style={styles.addressOptionTextWrap}>
                    <Text style={styles.addressName}>{addr.fullName} <Text style={styles.addressType}>({addr.type})</Text></Text>
                    <Text style={styles.addressLine}>{addr.line1}</Text>
                    <Text style={styles.addressLine}>{addr.city}, {addr.state} {addr.postalCode}</Text>
                  </View>
                  {selectedAddressId === addr.id && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  )}
                </Pressable>
              ))}
              <Button 
                label="Add New Address" 
                style={{ marginTop: 16, marginBottom: 24 }}
                onPress={() => {
                  setIsAddressModalVisible(false);
                  navigation.navigate("AddAddress");
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={[styles.checkoutBar, { bottom: Math.max(insets.bottom, 16) + 64 + 12 }]}>
        <View style={styles.checkoutBarContent}>
          <View style={styles.checkoutPriceWrap}>
            <Text style={styles.checkoutPriceLabel}>Grand Total</Text>
            <Text style={styles.checkoutPriceValue}>{formatCurrency(finalTotal)}</Text>
          </View>
          <Button
            isLoading={isPlacingOrder}
            label="Place Order"
            onPress={() => void handlePlaceOrder()}
            style={{ width: "50%" }}
          />
        </View>
      </View>
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
    padding: 20
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 22,
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
  deliveryWidget: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 16,
    marginTop: 16,
    padding: 12
  },
  deliveryHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 8
  },
  deliveryWidgetText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6
  },
  progressBarBg: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 999,
    height: 6,
    overflow: "hidden",
    width: "100%"
  },
  progressBarFill: {
    backgroundColor: COLORS.primaryDeep,
    borderRadius: 999,
    height: "100%"
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginBottom: 12
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16
  },
  itemsList: {
    gap: 16,
    marginBottom: 24
  },
  billCard: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24
  },
  billTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16
  },
  billRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  billLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14
  },
  billValue: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "600"
  },
  freeText: {
    color: COLORS.success,
    fontWeight: "800"
  },
  billRowTotal: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    marginBottom: 0,
    marginTop: 4,
    paddingTop: 16
  },
  billLabelTotal: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "800"
  },
  billValueTotal: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800"
  },
  checkoutBar: {
    ...ELEVATION.sheet,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 24,
    left: 16,
    right: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    position: "absolute",
    shadowColor: COLORS.primaryDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  checkoutBarContent: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  checkoutPriceWrap: {
    flex: 1
  },
  checkoutPriceLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2
  },
  checkoutPriceValue: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: "800"
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
  addressCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  changeAddressText: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  addressDetailsWrap: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
  },
  addressName: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  addressType: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  addressLine: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  closeModalBtn: {
    padding: 4,
  },
  addressOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginBottom: 12,
  },
  addressOptionSelected: {
    borderColor: COLORS.primaryDeep,
    backgroundColor: COLORS.surfaceMuted,
  },
  addressOptionTextWrap: {
    flex: 1,
  },
  couponHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  couponCardTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  couponInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  couponInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  couponInputDisabled: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: "rgba(16, 185, 129, 0.2)",
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  couponInputError: {
    borderColor: COLORS.danger,
  },
  couponButton: {
    backgroundColor: COLORS.primaryDeep,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    minWidth: 72,
  },
  couponButtonRemove: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.danger,
  },
  couponButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  couponButtonTextRemove: {
    color: COLORS.danger,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  couponErrorText: {
    color: COLORS.danger,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  couponSuccessBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.chipBg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  couponSuccessText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  billLabelCoupon: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "600",
  },
  billValueCoupon: {
    color: COLORS.success,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
  },
});

