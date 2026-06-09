import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBlock } from "../common/SkeletonBlock";
import { COLORS, ELEVATION } from "../../theme/design";

export function OrdersSkeleton({ bottomInset = 24 }: { bottomInset?: number }) {
  return (
    <ScrollView 
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} 
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <SkeletonBlock height={24} width="42%" />
        <SkeletonBlock height={12} width="34%" style={styles.gapTop} />
      </View>

      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.card}>
          <View style={styles.row}>
            <SkeletonBlock height={14} width="46%" />
            <SkeletonBlock height={24} width={92} radius={999} />
          </View>
          <SkeletonBlock height={12} width="62%" style={styles.largeGapTop} />
          <SkeletonBlock height={12} width="38%" style={styles.gapTop} />
          <SkeletonBlock height={12} width="74%" style={styles.largeGapTop} />
          <SkeletonBlock height={16} width="34%" style={styles.largeGapTop} />
        </View>
      ))}
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
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hero: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  card: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
});
