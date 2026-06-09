import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, ELEVATION, FONTS } from "../theme/design";

export function HelpSupportScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const faqs = [
    {
      question: "How do I track my order?",
      answer: "You can track your order by going to the Orders tab and tapping on your active order. The timeline will show you exactly where your package is.",
    },
    {
      question: "What is your return policy?",
      answer: "We offer a 7-day return policy for unused items in their original packaging. Please contact our support team to initiate a return.",
    },
    {
      question: "How do I apply a coupon code?",
      answer: "In your cart, you will find a 'Have a coupon?' field. Enter your code there and tap 'Apply' before proceeding to checkout.",
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <LinearGradient colors={[COLORS.surface, COLORS.background]} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons color={COLORS.textPrimary} name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.contactCard}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.descriptionText}>Need immediate assistance? Our support team is here to help you.</Text>
          
          <Pressable style={styles.contactRow}>
            <View style={[styles.iconWrap, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons color={COLORS.primaryDeep} name="call" size={20} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Call Us</Text>
              <Text style={styles.contactDetail}>+91 1800-123-4567</Text>
            </View>
          </Pressable>

          <Pressable style={styles.contactRow}>
            <View style={[styles.iconWrap, { backgroundColor: COLORS.info + "20" }]}>
              <Ionicons color={COLORS.info} name="mail" size={20} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email Us</Text>
              <Text style={styles.contactDetail}>support@jmv.com</Text>
            </View>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, styles.faqTitle]}>Frequently Asked Questions</Text>
        
        {faqs.map((faq, index) => (
          <View key={index} style={styles.faqCard}>
            <Text style={styles.faqQuestion}>{faq.question}</Text>
            <Text style={styles.faqAnswer}>{faq.answer}</Text>
          </View>
        ))}
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
  contactCard: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    marginBottom: 24,
    padding: 24,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  descriptionText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  contactRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 16,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  contactInfo: {
    marginLeft: 12,
  },
  contactTitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginBottom: 2,
  },
  contactDetail: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "700",
  },
  faqTitle: {
    marginBottom: 16,
    marginLeft: 8,
  },
  faqCard: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
  },
  faqQuestion: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  faqAnswer: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
