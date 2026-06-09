import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS, ELEVATION, FONTS } from "../../theme/design";
import type { Address } from "../../types/api";

type AddressFormState = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

type CartAddressSectionProps = {
  addresses: Address[];
  isLoading: boolean;
  isCreating: boolean;
  showForm: boolean;
  selectedAddressId: string | null;
  formState: AddressFormState;
  onFormStateChange: (state: AddressFormState) => void;
  onToggleForm: () => void;
  onSelectAddress: (id: string) => void;
  onSubmitForm: () => void;
};

export function CartAddressSection({
  addresses,
  isLoading,
  isCreating,
  showForm,
  selectedAddressId,
  formState,
  onFormStateChange,
  onToggleForm,
  onSelectAddress,
  onSubmitForm
}: CartAddressSectionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery Address</Text>
        <Pressable
          disabled={isCreating}
          onPress={onToggleForm}
          style={styles.toggleBtn}
        >
          <Text style={styles.toggleBtnText}>{showForm ? "Close" : "Add New"}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="small" />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      ) : addresses.length === 0 && !showForm ? (
        <Text style={styles.emptyText}>No saved address. Add one to place your order.</Text>
      ) : (
        <View style={styles.list}>
          {addresses.map((address) => {
            const isSelected = selectedAddressId === address.id;

            return (
              <Pressable
                key={address.id}
                onPress={() => onSelectAddress(address.id)}
                style={[styles.option, isSelected && styles.optionSelected]}
              >
                <View style={styles.optionTopRow}>
                  <Text style={styles.optionName}>
                    {address.fullName} · {address.phone}
                  </Text>
                  <Text style={[styles.optionType, address.isDefault && styles.optionTypeDefault]}>
                    {address.isDefault ? "Default" : address.type}
                  </Text>
                </View>
                <Text style={styles.optionLine}>
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                </Text>
                <Text style={styles.optionLine}>
                  {address.city}, {address.state} {address.postalCode}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {showForm && (
        <View style={styles.form}>
          <TextInput
            onChangeText={(v) => onFormStateChange({ ...formState, fullName: v })}
            placeholder="Full Name"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            value={formState.fullName}
          />
          <TextInput
            keyboardType="phone-pad"
            onChangeText={(v) => onFormStateChange({ ...formState, phone: v })}
            placeholder="Phone"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            value={formState.phone}
          />
          <TextInput
            onChangeText={(v) => onFormStateChange({ ...formState, line1: v })}
            placeholder="Address Line 1"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            value={formState.line1}
          />
          <TextInput
            onChangeText={(v) => onFormStateChange({ ...formState, line2: v })}
            placeholder="Address Line 2 (optional)"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            value={formState.line2}
          />
          <View style={styles.row}>
            <TextInput
              onChangeText={(v) => onFormStateChange({ ...formState, city: v })}
              placeholder="City"
              placeholderTextColor={COLORS.textMuted}
              style={[styles.input, styles.inputHalf]}
              value={formState.city}
            />
            <TextInput
              onChangeText={(v) => onFormStateChange({ ...formState, state: v })}
              placeholder="State"
              placeholderTextColor={COLORS.textMuted}
              style={[styles.input, styles.inputHalf]}
              value={formState.state}
            />
          </View>
          <TextInput
            keyboardType="number-pad"
            onChangeText={(v) => onFormStateChange({ ...formState, postalCode: v })}
            placeholder="Postal Code"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            value={formState.postalCode}
          />

          <Pressable
            disabled={isCreating}
            onPress={() => {
              Keyboard.dismiss();
              onSubmitForm();
            }}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
          >
            {isCreating ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Address</Text>
            )}
          </Pressable>
        </View>
      )}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 8,
  },
  toggleBtnText: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primaryDeep,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  loadingText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingVertical: 12,
  },
  list: {
    gap: 12,
  },
  option: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.chipBg,
  },
  optionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  optionName: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  optionType: {
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionTypeDefault: {
    color: COLORS.primaryDeep,
    backgroundColor: COLORS.chipBg,
  },
  optionLine: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  form: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  inputHalf: {
    flex: 1,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnPressed: {
    backgroundColor: COLORS.primaryDeep,
  },
  saveBtnText: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.surface,
  },
});
