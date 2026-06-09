import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { getErrorMessage } from "../lib/api-client";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import type { RootStackParamList } from "../navigation/types";
import { Button } from "../components/common/Button";

type AddAddressScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "AddAddress">;

const ADDRESS_TYPES = ["HOME", "WORK", "OTHER"] as const;

export function AddAddressScreen() {
  const navigation = useNavigation<AddAddressScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { authorizedRequest } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    type: "HOME" as typeof ADDRESS_TYPES[number],
  });

  const handleSubmit = async () => {
    // Basic validation
    if (!form.fullName || !form.phone || !form.line1 || !form.city || !form.state || !form.postalCode) {
      Alert.alert("Missing Fields", "Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authorizedRequest("/users/me/addresses", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          country: "India",
          isDefault: true, // we can default to true for the first one or just let backend handle it
        }),
      });
      Alert.alert("Success", "Address added successfully!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error, "Failed to add address"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons color={COLORS.textPrimary} name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Add New Address</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Info</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor={COLORS.textMuted}
                value={form.fullName}
                onChangeText={(text) => setForm({ ...form, fullName: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 9876543210"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(text) => setForm({ ...form, phone: text })}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address Line 1 *</Text>
              <TextInput
                style={styles.input}
                placeholder="House No, Building, Street"
                placeholderTextColor={COLORS.textMuted}
                value={form.line1}
                onChangeText={(text) => setForm({ ...form, line1: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address Line 2</Text>
              <TextInput
                style={styles.input}
                placeholder="Landmark, Area (Optional)"
                placeholderTextColor={COLORS.textMuted}
                value={form.line2}
                onChangeText={(text) => setForm({ ...form, line2: text })}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor={COLORS.textMuted}
                  value={form.city}
                  onChangeText={(text) => setForm({ ...form, city: text })}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Postal Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="PIN Code"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  value={form.postalCode}
                  onChangeText={(text) => setForm({ ...form, postalCode: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor={COLORS.textMuted}
                value={form.state}
                onChangeText={(text) => setForm({ ...form, state: text })}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address Type</Text>
            <View style={styles.typeSelector}>
              {ADDRESS_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeChip,
                    form.type === type && styles.typeChipActive
                  ]}
                  onPress={() => setForm({ ...form, type })}
                >
                  <Text style={[
                    styles.typeChipText,
                    form.type === type && styles.typeChipTextActive
                  ]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button 
          label="Save Address" 
          onPress={handleSubmit} 
          isLoading={isSubmitting}
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
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...ELEVATION.card,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
  },
  typeChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  typeChipActive: {
    borderColor: COLORS.primaryDeep,
    backgroundColor: COLORS.surfaceMuted,
  },
  typeChipText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: COLORS.primaryDeep,
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
  },
});
