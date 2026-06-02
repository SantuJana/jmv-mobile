import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthScreen } from "./auth-screen";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";

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

const formatMemberSince = (value: string) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently joined";
  }

  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(parsedDate);
};

export function AccountScreen() {
  const { isReady, isAuthenticated, user, logout } = useAuth();

  if (!isReady) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.accountSkeletonHero}>
            <SkeletonBlock height={62} width={62} radius={999} />
            <View style={styles.accountSkeletonHeroText}>
              <SkeletonBlock height={22} width="62%" />
              <SkeletonBlock height={12} width="42%" style={styles.skeletonGapTop} />
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
            <SkeletonBlock height={42} radius={10} style={styles.skeletonLargeGapTop} />
            <SkeletonBlock height={42} radius={10} style={styles.skeletonGapTop} />
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
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={["#FFE6C8", "#FFD8A8", "#FFC98B"]}
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
            <Ionicons color={COLORS.success} name="checkmark-circle-outline" size={14} />
            <Text style={styles.badgeText}>Verified account</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons color={COLORS.primaryDeep} name="sparkles-outline" size={14} />
            <Text style={styles.badgeText}>Member since {memberSince}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelWrap}>
              <Ionicons color={COLORS.primary} name="person-outline" size={15} />
              <Text style={styles.infoLabel}>Full Name</Text>
            </View>
            <Text style={styles.infoValue}>{user.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelWrap}>
              <Ionicons color={COLORS.primary} name="mail-outline" size={15} />
              <Text style={styles.infoLabel}>Email</Text>
            </View>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelWrap}>
              <Ionicons color={COLORS.primary} name="call-outline" size={15} />
              <Text style={styles.infoLabel}>Phone</Text>
            </View>
            <Text style={styles.infoValue}>{user.phone || "Add phone number"}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Support</Text>

          <View style={styles.actionRow}>
            <View style={styles.actionLabelWrap}>
              <Ionicons color={COLORS.info} name="help-circle-outline" size={16} />
              <Text style={styles.actionText}>Help & Support</Text>
            </View>
            <Ionicons color={COLORS.textMuted} name="chevron-forward" size={16} />
          </View>

          <View style={styles.actionRow}>
            <View style={styles.actionLabelWrap}>
              <Ionicons color={COLORS.info} name="shield-outline" size={16} />
              <Text style={styles.actionText}>Privacy & Security</Text>
            </View>
            <Ionicons color={COLORS.textMuted} name="chevron-forward" size={16} />
          </View>
        </View>

        <Pressable onPress={() => void logout()} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
          <Ionicons color={COLORS.surface} name="log-out-outline" size={16} />
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
    paddingBottom: 24,
    paddingHorizontal: 14,
    paddingTop: 10
  },
  centeredContainer: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center"
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
  accountSkeletonHero: {
    ...ELEVATION.card,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    padding: 14
  },
  accountSkeletonHeroText: {
    flex: 1,
    marginLeft: 12
  },
  skeletonInfoRow: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    marginTop: 12,
    paddingBottom: 10
  },
  hero: {
    ...ELEVATION.card,
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    marginBottom: 12,
    padding: 14
  },
  avatar: {
    alignItems: "center",
    backgroundColor: COLORS.primaryDeep,
    borderRadius: 999,
    height: 62,
    justifyContent: "center",
    width: 62
  },
  avatarText: {
    color: COLORS.surface,
    fontFamily: FONTS.heading,
    fontSize: 24,
    fontWeight: "700"
  },
  heroTextWrap: {
    marginLeft: 12
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: "700"
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginTop: 2
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  badge: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  badgeText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5
  },
  card: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10
  },
  infoRow: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    marginBottom: 10,
    paddingBottom: 10
  },
  infoLabelWrap: {
    alignItems: "center",
    flexDirection: "row"
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4
  },
  actionRow: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 10
  },
  actionLabelWrap: {
    alignItems: "center",
    flexDirection: "row"
  },
  actionText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6
  },
  signOutButton: {
    alignItems: "center",
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 44
  },
  signOutText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 6
  },
  pressed: {
    opacity: 0.85
  }
});
