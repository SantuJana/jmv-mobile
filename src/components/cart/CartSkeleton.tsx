import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBlock } from "../common/SkeletonBlock";
import { COLORS, ELEVATION } from "../../theme/design";

export function CartSkeleton({ bottomInset = 24 }: { bottomInset?: number }) {
  return (
    <ScrollView 
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} 
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.summarySkeleton}>
        <SkeletonBlock height={24} width="44%" />
        <SkeletonBlock height={12} width="56%" style={styles.gapTop} />
        <SkeletonBlock height={54} radius={12} style={styles.largeGapTop} />
      </View>

      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.itemCard}>
          <SkeletonBlock height={104} width={96} radius={0} />
          <View style={styles.itemBody}>
            <SkeletonBlock height={14} width="72%" />
            <SkeletonBlock height={12} width="42%" style={styles.gapTop} />
            <SkeletonBlock height={16} width="50%" style={styles.largeGapTop} />
            <SkeletonBlock height={28} width="88%" radius={999} style={styles.largeGapTop} />
          </View>
        </View>
      ))}

      <View style={styles.addressCard}>
        <SkeletonBlock height={18} width="48%" />
        <SkeletonBlock height={64} radius={10} style={styles.largeGapTop} />
      </View>

      <View style={styles.checkoutCard}>
        <SkeletonBlock height={14} width="100%" />
        <SkeletonBlock height={14} width="84%" style={styles.gapTop} />
        <SkeletonBlock height={44} radius={10} style={styles.largeGapTop} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  gapTop: {
    marginTop: 8,
  },
  largeGapTop: {
    marginTop: 16,
  },
  summarySkeleton: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  itemBody: {
    padding: 12,
    flex: 1,
  },
  addressCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  checkoutCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
});
