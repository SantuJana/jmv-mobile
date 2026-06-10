import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { getErrorMessage } from "../lib/api-client";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { ApiResponse, Wishlist } from "../types/api";
import type { RootStackParamList } from "../navigation/types";

import { ProductCard } from "../components/shop/ProductCard";

type WishlistNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function WishlistScreen() {
  const navigation = useNavigation<WishlistNavigationProp>();
  const { authorizedRequest, isAuthenticated } = useAuth();

  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await authorizedRequest<ApiResponse<{ wishlist: Wishlist }>>("/wishlist");
      setWishlist(response.data.wishlist);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load wishlist"));
    } finally {
      setIsLoading(false);
    }
  }, [authorizedRequest, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void fetchWishlist();
    }, [fetchWishlist])
  );

  const handleProductPress = (product: any) => {
    navigation.navigate("ProductDetail", { product });
  };

  const handlePressAddForProduct = async (product: any, variants: any[], dropSource?: any) => {
    navigation.navigate("ProductDetail", { product });
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>My Wishlist</Text>
        </View>
        <View style={styles.centeredContainer}>
          <Ionicons name="heart-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Sign in to view your wishlist</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && !wishlist) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>My Wishlist</Text>
        </View>
        <View style={styles.centeredContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>My Wishlist</Text>
      </View>

      {error ? (
        <View style={styles.centeredContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
          <Text style={styles.emptyTitle}>Oops!</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void fetchWishlist()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : !wishlist || wishlist.items.length === 0 ? (
        <View style={styles.centeredContainer}>
          <Ionicons color={COLORS.textMuted} name="heart-outline" size={64} />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtitle}>Save items you like to view them later.</Text>
        </View>
      ) : (
        <FlatList
          data={wishlist.items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              product={item.product}
              onProductPress={handleProductPress}
              onPressAddForProduct={handlePressAddForProduct}
              addingVariantId={addingVariantId}
            />
          )}
        />
      )}
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
  headerTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 16,
  },
  listContent: {
    padding: 16,
  },
  row: {
    justifyContent: "space-between",
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
