import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBlock } from "../common/SkeletonBlock";

export function ShopSkeleton({ bottomInset = 24 }: { bottomInset?: number }) {
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <SkeletonBlock height={24} width="64%" />
        <SkeletonBlock height={14} width="48%" style={styles.gapTop} />
        <SkeletonBlock height={42} radius={12} style={styles.largeGapTop} />
        <View style={styles.chipRow}>
          <SkeletonBlock height={28} width="30%" radius={999} />
          <SkeletonBlock height={28} width="30%" radius={999} />
          <SkeletonBlock height={28} width="30%" radius={999} />
        </View>
      </View>

      <SkeletonBlock height={18} width="42%" style={styles.sectionTitle} />
      <SkeletonBlock height={230} radius={20} />

      <View style={styles.categoryRow}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={styles.categoryCard}>
            <SkeletonBlock height={56} width={56} radius={999} />
            <SkeletonBlock height={12} width="80%" style={styles.gapTop} />
            <SkeletonBlock height={12} width="62%" style={styles.gapTop} />
          </View>
        ))}
      </View>

      <SkeletonBlock height={18} width="48%" style={styles.sectionTitle} />
      <View style={styles.productGrid}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={styles.productCard}>
            <SkeletonBlock height={140} radius={0} />
            <View style={styles.productBody}>
              <SkeletonBlock height={14} width="86%" />
              <SkeletonBlock height={12} width="58%" style={styles.gapTop} />
              <SkeletonBlock height={18} width="70%" style={styles.largeGapTop} />
              <SkeletonBlock height={36} radius={12} style={styles.largeGapTop} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  hero: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4E7EC",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  gapTop: {
    marginTop: 8,
  },
  largeGapTop: {
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    marginTop: 16,
  },
  categoryCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E4E7EC",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    width: 80,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4E7EC",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
    width: "48%",
  },
  productBody: {
    padding: 12,
  },
});
