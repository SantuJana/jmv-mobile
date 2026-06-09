import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { apiClient, getErrorMessage } from "../lib/api-client";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { RootStackParamList } from "../navigation/types";
import type { Address, ApiResponse } from "../types/api";

import { Button } from "../components/common/Button";

type AddressesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Addresses">;

export function AddressesScreen() {
  const navigation = useNavigation<AddressesScreenNavigationProp>();
  const { isReady, isAuthenticated, authorizedRequest } = useAuth();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      const res = await authorizedRequest<ApiResponse<{ addresses: Address[] }>>("/users/me/addresses");
      setAddresses(res.data.addresses);
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error, "Failed to load addresses"));
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isReady && isAuthenticated) {
        fetchAddresses();
      }
    }, [isReady, isAuthenticated])
  );

  const handleDelete = (id: string) => {
    Alert.alert("Delete Address", "Are you sure you want to remove this address?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive",
        onPress: async () => {
          try {
            setIsDeleting(id);
            await authorizedRequest(`/users/me/addresses/${id}`, { method: "DELETE" });
            setAddresses(prev => prev.filter(a => a.id !== id));
          } catch (error) {
            Alert.alert("Error", getErrorMessage(error, "Failed to delete address"));
          } finally {
            setIsDeleting(null);
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: Address }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <Ionicons 
            name={item.type === "HOME" ? "home" : item.type === "WORK" ? "business" : "location"} 
            size={14} 
            color={COLORS.primaryDeep} 
          />
          <Text style={styles.typeText}>{item.type}</Text>
        </View>
        {item.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.name}>{item.fullName}</Text>
      <Text style={styles.phone}>{item.phone}</Text>
      <Text style={styles.addressLine}>{item.line1}</Text>
      {item.line2 ? <Text style={styles.addressLine}>{item.line2}</Text> : null}
      <Text style={styles.addressLine}>{`${item.city}, ${item.state} ${item.postalCode}`}</Text>
      
      <View style={styles.cardActions}>
        <Pressable 
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => handleDelete(item.id)}
          disabled={isDeleting === item.id}
        >
          {isDeleting === item.id ? (
            <ActivityIndicator size="small" color={COLORS.danger} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              <Text style={styles.deleteText}>Delete</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons color={COLORS.textPrimary} name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons color={COLORS.textMuted} name="location-outline" size={64} />
          <Text style={styles.emptyTitle}>No Addresses Found</Text>
          <Text style={styles.emptySubtitle}>You haven't added any delivery addresses yet.</Text>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.bottomBar}>
        <Button 
          label="Add New Address" 
          onPress={() => navigation.navigate("AddAddress")} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  pressed: {
    opacity: 0.7,
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...ELEVATION.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  typeText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primaryDeep,
  },
  defaultBadge: {
    backgroundColor: COLORS.success + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.success,
  },
  name: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  phone: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  addressLine: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
  },
  deleteText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.danger,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 32, // for safe area
  },
});
