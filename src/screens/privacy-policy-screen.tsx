import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, ELEVATION, FONTS } from "../theme/design";

export function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <LinearGradient colors={[COLORS.surface, COLORS.background]} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons color={COLORS.textPrimary} name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.lastUpdated}>Last updated: August 2024</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.paragraph}>
              We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, payment method, and other information you choose to provide.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.paragraph}>
              We may use the information we collect about you to:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>Provide, maintain, and improve our Services.</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>Process transactions and send related information.</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>Send you technical notices, updates, security alerts, and support and administrative messages.</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>Respond to your comments, questions, and requests, and provide customer service.</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Sharing of Information</Text>
            <Text style={styles.paragraph}>
              We may share the information we collect about you as described in this Statement or as described at the time of collection or sharing, including as follows: With third parties to provide you a service you requested through a partnership or promotional offering made by a third party or us.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.paragraph}>
              We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions about this Privacy Statement, please contact us at privacy@jmv.com.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.surface,
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pressed: {
    opacity: 0.7,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  card: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
  },
  lastUpdated: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginBottom: 24,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  paragraph: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 22,
  },
  bulletList: {
    marginTop: 12,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 8,
    paddingRight: 12,
  },
  bullet: {
    backgroundColor: COLORS.primaryDeep,
    borderRadius: 3,
    height: 6,
    marginRight: 12,
    marginTop: 8,
    width: 6,
  },
  bulletText: {
    color: COLORS.textSecondary,
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
