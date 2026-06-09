import { useEffect, useRef } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../../theme/design";
import type { Category } from "../../types/api";

type CategoryOption = {
  slug: string | null;
  name: string;
  imageUrl: string | null;
  imageUrls?: Category["imageUrls"];
};

type CategoryListProps = {
  categories: Category[];
  selectedCategorySlug: string | null;
  onCategoryChange: (slug: string | null) => void;
};

export function CategoryList({
  categories,
  selectedCategorySlug,
  onCategoryChange
}: CategoryListProps) {
  const horizontalScrollRef = useRef<ScrollView>(null);
  const categoryOptions: CategoryOption[] = [
    { slug: null, name: "All", imageUrl: null, imageUrls: undefined },
    ...categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      imageUrl: category.imageUrl,
      imageUrls: category.imageUrls
    }))
  ];

  useEffect(() => {
    if (!horizontalScrollRef.current) return;
    const index = categoryOptions.findIndex(c => c.slug === selectedCategorySlug);
    if (index > -1) {
      horizontalScrollRef.current.scrollTo({ x: Math.max(0, index * 92 - 64), animated: true });
    }
  }, [selectedCategorySlug, categories]);

  return (
    <ScrollView
      ref={horizontalScrollRef}
      contentContainerStyle={styles.container}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {categoryOptions.map((category) => {
        const isActive = selectedCategorySlug === category.slug;
        const imageUri = category.imageUrls?.thumbnail ?? category.imageUrl;

        return (
          <Pressable
            key={category.slug ?? "all"}
            onPress={() => onCategoryChange(category.slug)}
            style={[styles.card, isActive && styles.cardActive]}
          >
            <View style={[styles.imageWrap, isActive && styles.imageWrapActive]}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.image} />
              ) : (
                <Ionicons
                  color={isActive ? COLORS.primaryDeep : COLORS.primary}
                  name={category.slug ? "nutrition-outline" : "apps-outline"}
                  size={24}
                />
              )}
            </View>
            <Text numberOfLines={2} style={[styles.name, isActive && styles.nameActive]}>
              {category.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    width: 80,
  },
  cardActive: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.primary,
  },
  imageWrap: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    marginBottom: 8,
    width: 56,
    overflow: "hidden",
  },
  imageWrapActive: {
    backgroundColor: COLORS.chipBg,
  },
  image: {
    borderRadius: 999,
    height: "100%",
    width: "100%",
  },
  name: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  nameActive: {
    color: COLORS.primaryDeep,
    fontWeight: "800",
  },
});
