import { useEffect, useRef } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, ELEVATION, FONTS } from "../../theme/design";

type ShopHeroProps = {
  locationLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
};

export function ShopHero({ locationLabel, searchValue, onSearchChange }: ShopHeroProps) {
  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    let toRight = true;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        if (toRight) {
          scrollRef.current.scrollToEnd({ animated: true });
        } else {
          scrollRef.current.scrollTo({ x: 0, animated: true });
        }
        toRight = !toRight;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.warning, "#FFE6B8", "#FFD8A4"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.innerContent}
      >
        <View style={styles.header}>
          <View style={styles.locationBlock}>
            <Text numberOfLines={1} style={styles.title}>Delivery in 10-20 mins</Text>
            <View style={styles.locationRow}>
              <Ionicons color={COLORS.primaryDeep} name="location" size={14} />
              <Text numberOfLines={1} style={styles.locationText}>
                {locationLabel}
              </Text>
            </View>
          </View>
          <View style={styles.liveBadge}>
            <Animated.View style={{ opacity: pulseAnim }}>
              <Ionicons color={COLORS.surface} name="flash" size={14} />
            </Animated.View>
            <Text style={styles.liveBadgeText}>Live</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons color={COLORS.textMuted} name="search" size={20} />
          <TextInput
            onChangeText={onSearchChange}
            placeholder="Search for atta, milk, snacks..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
            value={searchValue}
          />
        </View>

        <ScrollView 
          ref={scrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPerksRow}
        >
          <View style={styles.perkChip}>
            <Ionicons color={COLORS.success} name="timer-outline" size={14} />
            <Text style={styles.perkChipText}>Fast delivery</Text>
          </View>
          <View style={styles.perkChip}>
            <Ionicons color={COLORS.danger} name="pricetag-outline" size={14} />
            <Text style={styles.perkChipText}>Fresh offers</Text>
          </View>
          <View style={styles.perkChip}>
            <Ionicons color={COLORS.info} name="leaf-outline" size={14} />
            <Text style={styles.perkChipText}>Daily essentials</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...ELEVATION.card,
    borderRadius: 24,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  innerContent: {
    borderRadius: 24,
    padding: 16,
    overflow: "hidden",
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  locationBlock: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 4,
  },
  locationText: {
    color: COLORS.textSecondary,
    flexShrink: 1,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  liveBadge: {
    alignItems: "center",
    backgroundColor: COLORS.danger,
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveBadgeText: {
    color: COLORS.surface,
    fontFamily: FONTS.heading,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 12,
    height: Platform.select({ ios: 44, android: 50, default: 48 }),
    ...ELEVATION.card,
    shadowOpacity: 0.05,
  },
  searchInput: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 15,
    marginLeft: 10,
  },
  quickPerksRow: {
    flexDirection: "row",
    gap: 8,
  },
  perkChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  perkChipText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },
});
