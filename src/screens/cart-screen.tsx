import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getErrorMessage } from "../lib/api-client";
import { formatCurrency } from "../lib/format";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { Address, ApiResponse, Cart, Coupon, Order } from "../types/api";

type CartScreenProps = {
  bottomInset?: number;
  onOrderPlaced?: () => void;
  onRequireAuth: () => void;
};

const FREE_DELIVERY_TARGET = 299;
const DEFAULT_COUNTRY = "India";
const keyboardAvoidingBehavior = Platform.OS === "ios" ? "padding" : "height";

type AddressFormState = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

const emptyAddressForm: AddressFormState = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: ""
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

export function CartScreen({ onRequireAuth, onOrderPlaced, bottomInset = 24 }: CartScreenProps) {
  const { isReady, isAuthenticated, authorizedRequest } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isCreatingAddress, setIsCreatingAddress] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: Coupon; discountAmount: string } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotalValue = useMemo(() => Number(cart?.subtotal ?? 0), [cart?.subtotal]);
  const discountValue = useMemo(() => Number(appliedCoupon?.discountAmount ?? 0), [appliedCoupon?.discountAmount]);
  const freeDeliveryRemaining = Math.max(0, FREE_DELIVERY_TARGET - subtotalValue);
  const deliveryValue = freeDeliveryRemaining > 0 ? 29 : 0;
  const payableValue = Math.max(0, subtotalValue + deliveryValue - discountValue);
  const deliveryProgress = Math.max(0, Math.min(1, subtotalValue / FREE_DELIVERY_TARGET));
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  const loadCart = useCallback(async () => {
    setError(null);
    const response = await authorizedRequest<ApiResponse<{ cart: Cart }>>("/cart");
    setCart(response.data.cart);
  }, [authorizedRequest]);

  const loadAddresses = useCallback(async () => {
    setIsAddressLoading(true);
    setError(null);

    try {
      const response = await authorizedRequest<ApiResponse<{ addresses: Address[] }>>("/users/me/addresses");
      const nextAddresses = response.data.addresses;
      const defaultAddress = nextAddresses.find((address) => address.isDefault) ?? nextAddresses[0] ?? null;

      setAddresses(nextAddresses);
      setSelectedAddressId((currentSelectedId) => {
        if (currentSelectedId && nextAddresses.some((address) => address.id === currentSelectedId)) {
          return currentSelectedId;
        }

        return defaultAddress?.id ?? null;
      });
    } finally {
      setIsAddressLoading(false);
    }
  }, [authorizedRequest]);

  const loadCheckoutData = useCallback(async () => {
    await Promise.all([loadCart(), loadAddresses()]);
  }, [loadAddresses, loadCart]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      setCart(null);
      setIsLoading(false);
      return;
    }

    const fetchCart = async () => {
      setIsLoading(true);

      try {
        await loadCheckoutData();
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Unable to load cart"));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCart();
  }, [isAuthenticated, isReady, loadCheckoutData]);

  const handleRefresh = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      await loadCheckoutData();
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, "Unable to refresh cart"));
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, loadCheckoutData]);

  const updateItemQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      setBusyItemId(itemId);
      setError(null);

      try {
        const response = await authorizedRequest<ApiResponse<{ cart: Cart }>>(`/cart/items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ quantity })
        });
        setCart(response.data.cart);
        setAppliedCoupon(null);
      } catch (updateError) {
        Alert.alert("Could not update quantity", getErrorMessage(updateError, "Please try again."));
      } finally {
        setBusyItemId(null);
      }
    },
    [authorizedRequest]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      setBusyItemId(itemId);
      setError(null);

      try {
        const response = await authorizedRequest<ApiResponse<{ cart: Cart }>>(`/cart/items/${itemId}`, {
          method: "DELETE"
        });
        setCart(response.data.cart);
        setAppliedCoupon(null);
      } catch (removeError) {
        Alert.alert("Could not remove item", getErrorMessage(removeError, "Please try again."));
      } finally {
        setBusyItemId(null);
      }
    },
    [authorizedRequest]
  );

  const clearCart = useCallback(async () => {
    setIsClearing(true);
    setError(null);

    try {
      const response = await authorizedRequest<ApiResponse<{ cart: Cart }>>("/cart", {
        method: "DELETE"
      });
      setCart(response.data.cart);
      setAppliedCoupon(null);
      setCouponCode("");
    } catch (clearError) {
      Alert.alert("Could not clear cart", getErrorMessage(clearError, "Please try again."));
    } finally {
      setIsClearing(false);
    }
  }, [authorizedRequest]);

  const applyCoupon = useCallback(async () => {
    const normalizedCode = couponCode.trim().toUpperCase();

    if (!normalizedCode) {
      Alert.alert("Coupon required", "Enter a coupon code first.");
      return;
    }

    setIsApplyingCoupon(true);
    setError(null);

    try {
      const response = await authorizedRequest<ApiResponse<{ coupon: Coupon; discountAmount: string }>>("/coupons/validate", {
        method: "POST",
        body: JSON.stringify({
          code: normalizedCode,
          subtotal: (cart?.subtotal ?? "0").toString()
        })
      });

      setCouponCode(response.data.coupon.code);
      setAppliedCoupon(response.data);
    } catch (couponError) {
      setAppliedCoupon(null);
      Alert.alert("Coupon not applied", getErrorMessage(couponError, "Please try another coupon."));
    } finally {
      setIsApplyingCoupon(false);
    }
  }, [authorizedRequest, cart?.subtotal, couponCode]);

  const createAddress = useCallback(async () => {
    const payload = {
      fullName: addressForm.fullName.trim(),
      phone: addressForm.phone.trim(),
      line1: addressForm.line1.trim(),
      line2: addressForm.line2.trim() || undefined,
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      postalCode: addressForm.postalCode.trim(),
      country: DEFAULT_COUNTRY
    };

    if (!payload.fullName || !payload.phone || !payload.line1 || !payload.city || !payload.state || !payload.postalCode) {
      Alert.alert("Incomplete address", "Please fill full name, phone, address line, city, state, and postal code.");
      return;
    }

    setIsCreatingAddress(true);
    setError(null);

    try {
      const response = await authorizedRequest<ApiResponse<{ address: Address }>>("/users/me/addresses", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          type: "HOME",
          isDefault: addresses.length === 0
        })
      });

      const nextAddress = response.data.address;

      setAddresses((current) => {
        if (nextAddress.isDefault) {
          return [nextAddress, ...current.map((address) => ({ ...address, isDefault: false }))];
        }

        return [nextAddress, ...current];
      });
      setSelectedAddressId(nextAddress.id);
      setShowAddressForm(false);
      setAddressForm(emptyAddressForm);
      Alert.alert("Address saved", "Delivery address has been added.");
    } catch (createError) {
      Alert.alert("Could not save address", getErrorMessage(createError, "Please try again."));
    } finally {
      setIsCreatingAddress(false);
    }
  }, [addressForm, addresses.length, authorizedRequest]);

  const placeOrder = useCallback(async () => {
    const cartItemsCount = cart?.items.length ?? 0;

    if (cartItemsCount === 0) {
      Alert.alert("Cart is empty", "Add items to your cart before placing an order.");
      return;
    }

    if (!selectedAddressId) {
      Alert.alert("Address required", "Please select or add a delivery address.");
      return;
    }

    setIsPlacingOrder(true);
    setError(null);

    try {
      const response = await authorizedRequest<ApiResponse<{ order: Order }>>("/orders", {
        method: "POST",
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod: "COD",
          couponCode: appliedCoupon?.coupon.code
        })
      });

      await loadCart();
      setAppliedCoupon(null);
      setCouponCode("");
      Alert.alert("Order placed", `Order ${response.data.order.orderNumber} created successfully.`);
      onOrderPlaced?.();
    } catch (placeError) {
      Alert.alert("Could not place order", getErrorMessage(placeError, "Please try again."));
    } finally {
      setIsPlacingOrder(false);
    }
  }, [appliedCoupon?.coupon.code, authorizedRequest, cart?.items.length, loadCart, onOrderPlaced, selectedAddressId]);

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
        <Ionicons color={COLORS.primary} name="bag-handle-outline" size={32} />
        <Text style={styles.emptyTitle}>Sign in to view your basket</Text>
        <Text style={styles.emptySubtitle}>Your saved items and offers will appear here.</Text>
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
          <View style={styles.summarySkeleton}>
            <SkeletonBlock height={24} width="44%" />
            <SkeletonBlock height={12} width="56%" style={styles.skeletonGapTop} />
            <SkeletonBlock height={54} radius={12} style={styles.skeletonLargeGapTop} />
          </View>

          {[0, 1, 2].map((item) => (
            <View key={item} style={styles.itemCard}>
              <SkeletonBlock height={104} width={96} radius={0} />
              <View style={styles.itemBody}>
                <SkeletonBlock height={14} width="72%" />
                <SkeletonBlock height={12} width="42%" style={styles.skeletonGapTop} />
                <SkeletonBlock height={16} width="50%" style={styles.skeletonLargeGapTop} />
                <SkeletonBlock height={28} width="88%" radius={999} style={styles.skeletonLargeGapTop} />
              </View>
            </View>
          ))}

          <View style={styles.addressCard}>
            <SkeletonBlock height={18} width="48%" />
            <SkeletonBlock height={64} radius={10} style={styles.skeletonLargeGapTop} />
          </View>

          <View style={styles.checkoutCard}>
            <SkeletonBlock height={14} width="100%" />
            <SkeletonBlock height={14} width="84%" style={styles.skeletonGapTop} />
            <SkeletonBlock height={44} radius={10} style={styles.skeletonLargeGapTop} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const items = cart?.items ?? [];

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={keyboardAvoidingBehavior} style={styles.keyboardAvoidingRoot}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 120 }]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        >
        <LinearGradient
          colors={["#FFD89A", "#FFC47F", "#FFB060"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.summaryHero}
        >
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryHeroTitle}>My Basket</Text>
              <Text style={styles.summaryHeroSubTitle}>{cart?.totalItems ?? 0} items ready for checkout</Text>
            </View>
            <View style={styles.summaryHeroPill}>
              <Ionicons color={COLORS.surface} name="timer-outline" size={13} />
              <Text style={styles.summaryHeroPillText}>10-20 min</Text>
            </View>
          </View>

          <View style={styles.deliveryProgressWrap}>
            <View style={styles.deliveryProgressTrack}>
              <View style={[styles.deliveryProgressFill, { width: `${deliveryProgress * 100}%` }]} />
            </View>
            <Text style={styles.deliveryProgressText}>
              {freeDeliveryRemaining > 0
                ? `Add ${formatCurrency(freeDeliveryRemaining)} for free delivery`
                : "You unlocked free delivery"}
            </Text>
          </View>
        </LinearGradient>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>Add products from the Shop tab to continue.</Text>
          </View>
        ) : (
          <>
            {items.map((item) => {
              const imageUri = item.product.imageUrls?.thumbnail ?? item.product.imageUrl;
              const isBusy = busyItemId === item.id;
              const canDecrease = item.quantity > 1;

              return (
                <View key={item.id} style={styles.itemCard}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons color={COLORS.textMuted} name="image-outline" size={18} />
                    </View>
                  )}

                  <View style={styles.itemBody}>
                    <Text numberOfLines={1} style={styles.itemName}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.itemMeta}>{item.variant.name}</Text>
                    <Text style={styles.itemMeta}>{formatCurrency(item.unitPrice)} each</Text>
                    <Text style={styles.itemTotal}>{formatCurrency(item.lineTotal)}</Text>

                    <View style={styles.itemActions}>
                      <View style={styles.stepper}>
                        <Pressable
                          disabled={!canDecrease || isBusy}
                          onPress={() => void updateItemQuantity(item.id, item.quantity - 1)}
                          style={[styles.stepperButton, !canDecrease ? styles.stepperButtonDisabled : null]}
                        >
                          <Ionicons color={COLORS.surface} name="remove" size={14} />
                        </Pressable>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <Pressable
                          disabled={isBusy}
                          onPress={() => void updateItemQuantity(item.id, item.quantity + 1)}
                          style={styles.stepperButton}
                        >
                          <Ionicons color={COLORS.surface} name="add" size={14} />
                        </Pressable>
                      </View>

                      <Pressable disabled={isBusy} onPress={() => void removeItem(item.id)} style={styles.removeButton}>
                        {isBusy ? (
                          <ActivityIndicator color={COLORS.danger} size="small" />
                        ) : (
                          <Text style={styles.removeButtonText}>Remove</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Text style={styles.addressTitle}>Delivery Address</Text>
                <Pressable
                  disabled={isCreatingAddress}
                  onPress={() => setShowAddressForm((current) => !current)}
                  style={styles.addressToggleButton}
                >
                  <Text style={styles.addressToggleButtonText}>{showAddressForm ? "Close" : "Add New"}</Text>
                </Pressable>
              </View>

              {isAddressLoading ? (
                <View style={styles.addressLoadingWrap}>
                  <ActivityIndicator color={COLORS.primary} size="small" />
                  <Text style={styles.addressLoadingText}>Loading addresses...</Text>
                </View>
              ) : addresses.length === 0 ? (
                <Text style={styles.addressEmptyText}>No saved address. Add one to place your order.</Text>
              ) : (
                <View style={styles.addressList}>
                  {addresses.map((address) => {
                    const isSelected = selectedAddressId === address.id;

                    return (
                      <Pressable
                        key={address.id}
                        onPress={() => setSelectedAddressId(address.id)}
                        style={[styles.addressOption, isSelected ? styles.addressOptionSelected : null]}
                      >
                        <View style={styles.addressOptionTopRow}>
                          <Text style={styles.addressOptionName}>
                            {address.fullName} · {address.phone}
                          </Text>
                          <Text style={[styles.addressOptionType, address.isDefault ? styles.addressDefaultType : null]}>
                            {address.isDefault ? "Default" : address.type}
                          </Text>
                        </View>
                        <Text style={styles.addressOptionLine}>
                          {address.line1}
                          {address.line2 ? `, ${address.line2}` : ""}
                        </Text>
                        <Text style={styles.addressOptionLine}>
                          {address.city}, {address.state} {address.postalCode}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {showAddressForm ? (
                <View style={styles.addressForm}>
                  <TextInput
                    onChangeText={(value) => setAddressForm((current) => ({ ...current, fullName: value }))}
                    placeholder="Full Name"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.addressInput}
                    value={addressForm.fullName}
                  />
                  <TextInput
                    keyboardType="phone-pad"
                    onChangeText={(value) => setAddressForm((current) => ({ ...current, phone: value }))}
                    placeholder="Phone"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.addressInput}
                    value={addressForm.phone}
                  />
                  <TextInput
                    onChangeText={(value) => setAddressForm((current) => ({ ...current, line1: value }))}
                    placeholder="Address Line 1"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.addressInput}
                    value={addressForm.line1}
                  />
                  <TextInput
                    onChangeText={(value) => setAddressForm((current) => ({ ...current, line2: value }))}
                    placeholder="Address Line 2 (optional)"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.addressInput}
                    value={addressForm.line2}
                  />
                  <View style={styles.addressFormRow}>
                    <TextInput
                      onChangeText={(value) => setAddressForm((current) => ({ ...current, city: value }))}
                      placeholder="City"
                      placeholderTextColor={COLORS.textMuted}
                      style={[styles.addressInput, styles.addressInputHalf]}
                      value={addressForm.city}
                    />
                    <TextInput
                      onChangeText={(value) => setAddressForm((current) => ({ ...current, state: value }))}
                      placeholder="State"
                      placeholderTextColor={COLORS.textMuted}
                      style={[styles.addressInput, styles.addressInputHalf]}
                      value={addressForm.state}
                    />
                  </View>
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={(value) => setAddressForm((current) => ({ ...current, postalCode: value }))}
                    placeholder="Postal Code"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.addressInput}
                    value={addressForm.postalCode}
                  />

                  <Pressable
                    disabled={isCreatingAddress}
                    onPress={() => {
                      Keyboard.dismiss();
                      void createAddress();
                    }}
                    style={({ pressed }) => [styles.saveAddressButton, pressed && styles.pressed]}
                  >
                    {isCreatingAddress ? (
                      <ActivityIndicator color={COLORS.surface} size="small" />
                    ) : (
                      <Text style={styles.saveAddressButtonText}>Save Address</Text>
                    )}
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.checkoutCard}>
              <View style={styles.couponBox}>
                <Text style={styles.couponTitle}>Coupon</Text>
                <View style={styles.couponRow}>
                  <TextInput
                    autoCapitalize="characters"
                    onChangeText={(value) => {
                      setCouponCode(value.toUpperCase());
                      setAppliedCoupon(null);
                    }}
                    placeholder="Enter code"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.couponInput}
                    value={couponCode}
                  />
                  <Pressable
                    disabled={isApplyingCoupon}
                    onPress={() => {
                      Keyboard.dismiss();
                      void applyCoupon();
                    }}
                    style={({ pressed }) => [styles.applyCouponButton, pressed && styles.pressed]}
                  >
                    {isApplyingCoupon ? (
                      <ActivityIndicator color={COLORS.surface} size="small" />
                    ) : (
                      <Text style={styles.applyCouponButtonText}>Apply</Text>
                    )}
                  </Pressable>
                </View>
                {appliedCoupon ? (
                  <View style={styles.appliedCouponRow}>
                    <Text style={styles.appliedCouponText}>
                      {appliedCoupon.coupon.code} applied · saved {formatCurrency(appliedCoupon.discountAmount)}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setAppliedCoupon(null);
                        setCouponCode("");
                      }}
                    >
                      <Text style={styles.removeCouponText}>Remove</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <View style={styles.checkoutRow}>
                <Text style={styles.checkoutLabel}>Items</Text>
                <Text style={styles.checkoutValue}>{cart?.totalItems ?? 0}</Text>
              </View>
              <View style={styles.checkoutRow}>
                <Text style={styles.checkoutLabel}>Subtotal</Text>
                <Text style={styles.checkoutValue}>{formatCurrency(cart?.subtotal ?? "0")}</Text>
              </View>
              <View style={styles.checkoutRow}>
                <Text style={styles.checkoutLabel}>Delivery</Text>
                <Text style={styles.checkoutValue}>{deliveryValue > 0 ? formatCurrency(deliveryValue) : "FREE"}</Text>
              </View>
              {discountValue > 0 ? (
                <View style={styles.checkoutRow}>
                  <Text style={styles.discountLabel}>Coupon</Text>
                  <Text style={styles.discountValue}>-{formatCurrency(discountValue)}</Text>
                </View>
              ) : null}

              <View style={styles.checkoutRow}>
                <Text style={styles.checkoutLabel}>Pay Mode</Text>
                <Text style={styles.checkoutValue}>Cash On Delivery</Text>
              </View>

              <View style={styles.checkoutTotalRow}>
                <Text style={styles.checkoutTotalLabel}>Payable</Text>
                <Text style={styles.checkoutTotalValue}>{formatCurrency(payableValue)}</Text>
              </View>

              <Pressable
                disabled={isPlacingOrder || !selectedAddress}
                onPress={() => void placeOrder()}
                style={({ pressed }) => [
                  styles.placeOrderButton,
                  (!selectedAddress || isPlacingOrder) ? styles.placeOrderButtonDisabled : null,
                  pressed && styles.pressed
                ]}
              >
                {isPlacingOrder ? (
                  <ActivityIndicator color={COLORS.surface} size="small" />
                ) : (
                  <Text style={styles.placeOrderButtonText}>Place Order</Text>
                )}
              </Pressable>

              <Pressable
                disabled={isClearing}
                onPress={() => void clearCart()}
                style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
              >
                {isClearing ? <ActivityIndicator color={COLORS.surface} size="small" /> : <Text style={styles.clearButtonText}>Clear Cart</Text>}
              </Pressable>
            </View>
          </>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background,
    flex: 1
  },
  keyboardAvoidingRoot: {
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
  summarySkeleton: {
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
  summaryHero: {
    ...ELEVATION.card,
    borderRadius: 20,
    marginBottom: 12,
    padding: 14
  },
  summaryTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  summaryHeroTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: "700"
  },
  summaryHeroSubTitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 2
  },
  summaryHeroPill: {
    alignItems: "center",
    backgroundColor: COLORS.primaryDeep,
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  summaryHeroPillText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4
  },
  deliveryProgressWrap: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 12,
    padding: 10
  },
  deliveryProgressTrack: {
    backgroundColor: "rgba(31,35,48,0.16)",
    borderRadius: 999,
    height: 8,
    marginBottom: 7,
    overflow: "hidden"
  },
  deliveryProgressFill: {
    backgroundColor: COLORS.success,
    borderRadius: 999,
    height: 8
  },
  deliveryProgressText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700"
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
  itemCard: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 10,
    overflow: "hidden"
  },
  itemImage: {
    height: 104,
    width: 96
  },
  itemImagePlaceholder: {
    alignItems: "center",
    backgroundColor: "#F2E7D8",
    height: 104,
    justifyContent: "center",
    width: 96
  },
  itemBody: {
    flex: 1,
    padding: 10
  },
  itemName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700"
  },
  itemMeta: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 1
  },
  itemTotal: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 5
  },
  itemActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },
  stepper: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  stepperButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    height: 23,
    justifyContent: "center",
    width: 23
  },
  stepperButtonDisabled: {
    backgroundColor: "#BFB8AF"
  },
  quantityText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "700",
    marginHorizontal: 9,
    minWidth: 12,
    textAlign: "center"
  },
  removeButton: {
    borderColor: "#F4B8BC",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 66,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  removeButtonText: {
    color: COLORS.danger,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  addressCard: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 2,
    padding: 12
  },
  addressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  addressTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700"
  },
  addressToggleButton: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  addressToggleButtonText: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700"
  },
  addressLoadingWrap: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 6
  },
  addressLoadingText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginLeft: 6
  },
  addressEmptyText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginBottom: 4
  },
  addressList: {
    gap: 8
  },
  addressOption: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 9
  },
  addressOptionSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1.5
  },
  addressOptionTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  addressOptionName: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 8
  },
  addressOptionType: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700"
  },
  addressDefaultType: {
    color: COLORS.success
  },
  addressOptionLine: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 11,
    marginTop: 2
  },
  addressForm: {
    marginTop: 10
  },
  addressInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 9,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  addressFormRow: {
    flexDirection: "row",
    gap: 8
  },
  addressInputHalf: {
    flex: 1
  },
  saveAddressButton: {
    alignItems: "center",
    backgroundColor: COLORS.primaryDeep,
    borderRadius: 10,
    minHeight: 40,
    justifyContent: "center"
  },
  saveAddressButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "800"
  },
  checkoutCard: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    padding: 12
  },
  couponBox: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 10
  },
  couponTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8
  },
  couponRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  couponInput: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 9,
    borderWidth: 1,
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13,
    minHeight: 40,
    paddingHorizontal: 10
  },
  applyCouponButton: {
    alignItems: "center",
    backgroundColor: COLORS.primaryDeep,
    borderRadius: 9,
    minHeight: 40,
    justifyContent: "center",
    minWidth: 78,
    paddingHorizontal: 12
  },
  applyCouponButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "800"
  },
  appliedCouponRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },
  appliedCouponText: {
    color: COLORS.success,
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 8
  },
  removeCouponText: {
    color: COLORS.danger,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "700"
  },
  checkoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  checkoutLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600"
  },
  checkoutValue: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700"
  },
  discountLabel: {
    color: COLORS.success,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "700"
  },
  discountValue: {
    color: COLORS.success,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700"
  },
  checkoutTotalRow: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 2,
    paddingTop: 10
  },
  checkoutTotalLabel: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "800"
  },
  checkoutTotalValue: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "800"
  },
  placeOrderButton: {
    alignItems: "center",
    backgroundColor: COLORS.success,
    borderRadius: 10,
    marginBottom: 8,
    marginTop: 4,
    minHeight: 44,
    justifyContent: "center"
  },
  placeOrderButtonDisabled: {
    backgroundColor: "#A9B8AE"
  },
  placeOrderButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "800"
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    marginTop: 6,
    minHeight: 42,
    justifyContent: "center"
  },
  clearButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "800"
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
