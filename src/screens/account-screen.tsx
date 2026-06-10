import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

import { AuthScreen } from "./auth-screen";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";
import { SkeletonBlock } from "../components/common/SkeletonBlock";

const formatMemberSince = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently joined";
  }
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(parsedDate);
};

export function AccountScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isReady, isAuthenticated, user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom + 80;

  if (!isReady) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
          <View style={styles.accountSkeletonHero}>
            <SkeletonBlock height={64} width={64} radius={999} />
            <View style={styles.accountSkeletonHeroText}>
              <SkeletonBlock height={24} width="62%" />
              <SkeletonBlock height={14} width="42%" style={styles.skeletonGapTop} />
            </View>
          </View>

          <View style={styles.card}>
            <SkeletonBlock height={18} width="46%" />
            {[0, 1, 2].map((item) => (
              <View key={item} style={styles.skeletonInfoRow}>
                <SkeletonBlock height={12} width="34%" />
                <SkeletonBlock height={16} width="70%" style={styles.skeletonGapTop} />
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <SkeletonBlock height={18} width="34%" />
            <SkeletonBlock height={44} radius={10} style={styles.skeletonLargeGapTop} />
            <SkeletonBlock height={44} radius={10} style={styles.skeletonGapTop} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !user) {
    return <AuthScreen />;
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const memberSince = formatMemberSince(user.createdAt);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
        <LinearGradient
          colors={["#D1FAE5", "#6EE7B7"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.hero}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "U"}</Text>
          </View>

          <View style={styles.heroTextWrap}>
            <Text style={styles.title}>{user.name}</Text>
            <Text style={styles.subtitle}>Welcome back</Text>
          </View>
        </LinearGradient>

        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <Ionicons color={COLORS.primaryDeep} name="checkmark-circle" size={16} />
            <Text style={styles.badgeText}>Verified account</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons color={COLORS.warning} name="sparkles" size={16} />
            <Text style={styles.badgeText}>Member since {memberSince}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <Pressable onPress={() => navigation.navigate("EditProfile")}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelWrap}>
              <Ionicons color={COLORS.primaryDeep} name="person" size={18} />
              <Text style={styles.infoLabel}>Full Name</Text>
            </View>
            <Text style={styles.infoValue}>{user.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelWrap}>
              <Ionicons color={COLORS.primaryDeep} name="mail" size={18} />
              <Text style={styles.infoLabel}>Email</Text>
            </View>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelWrap}>
              <Ionicons color={COLORS.primaryDeep} name="call" size={18} />
              <Text style={styles.infoLabel}>Phone</Text>
            </View>
            <Text style={styles.infoValue}>{user.phone || "Add phone number"}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Settings</Text>

          <Pressable style={styles.actionRow} onPress={() => navigation.navigate("Wishlist")}>
            <View style={styles.actionLabelWrap}>
              <Ionicons color={COLORS.info} name="heart" size={20} />
              <Text style={styles.actionText}>My Wishlist</Text>
            </View>
            <Ionicons color={COLORS.textMuted} name="chevron-forward" size={20} />
          </Pressable>

          <Pressable style={styles.actionRow} onPress={() => navigation.navigate("Addresses")}>
            <View style={styles.actionLabelWrap}>
              <Ionicons color={COLORS.info} name="location" size={20} />
              <Text style={styles.actionText}>My Addresses</Text>
            </View>
            <Ionicons color={COLORS.textMuted} name="chevron-forward" size={20} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Support</Text>

          <Pressable style={styles.actionRow} onPress={() => navigation.navigate("HelpSupport")}>
            <View style={styles.actionLabelWrap}>
              <Ionicons color={COLORS.info} name="help-circle" size={20} />
              <Text style={styles.actionText}>Help & Support</Text>
            </View>
            <Ionicons color={COLORS.textMuted} name="chevron-forward" size={20} />
          </Pressable>

          <Pressable style={styles.actionRow} onPress={() => navigation.navigate("PrivacyPolicy")}>
            <View style={styles.actionLabelWrap}>
              <Ionicons color={COLORS.info} name="shield-checkmark" size={20} />
              <Text style={styles.actionText}>Privacy & Security</Text>
            </View>
            <Ionicons color={COLORS.textMuted} name="chevron-forward" size={20} />
          </Pressable>
        </View>

        <Pressable onPress={() => void logout()} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
          <Ionicons color={COLORS.surface} name="log-out" size={20} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background,
    flex: 1
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  skeletonGapTop: {
    marginTop: 8
  },
  skeletonLargeGapTop: {
    marginTop: 16
  },
  accountSkeletonHero: {
    ...ELEVATION.card,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    flexDirection: "row",
    marginBottom: 24,
    padding: 24
  },
  accountSkeletonHeroText: {
    flex: 1,
    marginLeft: 16
  },
  skeletonInfoRow: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    marginTop: 16,
    paddingBottom: 12
  },
  hero: {
    ...ELEVATION.card,
    alignItems: "center",
    borderRadius: 24,
    flexDirection: "row",
    marginBottom: 24,
    padding: 24
  },
  avatar: {
    alignItems: "center",
    backgroundColor: COLORS.primaryDeep,
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    width: 72,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.4)"
  },
  avatarText: {
    color: COLORS.surface,
    fontFamily: FONTS.heading,
    fontSize: 28,
    fontWeight: "800"
  },
  heroTextWrap: {
    marginLeft: 20
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 26,
    fontWeight: "800"
  },
  subtitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
    opacity: 0.8
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24
  },
  badge: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...ELEVATION.card
  },
  badgeText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8
  },
  card: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    marginBottom: 24,
    padding: 24
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  editButtonText: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: "700"
  },
  infoRow: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    marginBottom: 16,
    paddingBottom: 16
  },
  infoLabelWrap: {
    alignItems: "center",
    flexDirection: "row"
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 10
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8
  },
  actionRow: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 16
  },
  actionLabelWrap: {
    alignItems: "center",
    flexDirection: "row"
  },
  actionText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 12
  },
  signOutButton: {
    ...ELEVATION.floating,
    alignItems: "center",
    backgroundColor: COLORS.danger,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 56,
    marginTop: 8
  },
  signOutText: {
    color: COLORS.surface,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 10
  },
  pressed: {
    opacity: 0.85
  }
});
