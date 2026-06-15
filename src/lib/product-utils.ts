import { Product, ProductVariant } from "../types/api";

type ProductImageSource = Pick<Product, "imageUrl" | "imageUrls">;
type ProductDetailImageSource = ProductImageSource & Pick<Product, "detailImages">;
type VariantImageSource = Pick<ProductVariant, "imageUrl" | "imageUrls" | "detailImages">;

export const findBestOfferVariant = (variants: ProductVariant[]) => {
  if (variants.length === 0) {
    return null;
  }

  return variants.reduce((best, current) => {
    const currentMrp = Number(current.mrp) || Number(current.price);
    const currentPrice = Number(current.price);
    const currentDiscount = currentMrp > currentPrice ? (currentMrp - currentPrice) / currentMrp : 0;

    const bestMrp = Number(best.mrp) || Number(best.price);
    const bestPrice = Number(best.price);
    const bestDiscount = bestMrp > bestPrice ? (bestMrp - bestPrice) / bestMrp : 0;

    if (currentDiscount > bestDiscount) {
      return current;
    } else if (currentDiscount === bestDiscount) {
      if (currentPrice < bestPrice) {
        return current;
      }
    }
    return best;
  }, variants[0]);
};

export const getProductCardImageUri = (product: ProductImageSource | null | undefined) =>
  product?.imageUrls?.card ?? product?.imageUrls?.detail ?? product?.imageUrls?.thumbnail ?? product?.imageUrl;

export const getProductDetailImageUri = (product: ProductImageSource | null | undefined) =>
  product?.imageUrls?.detail ?? product?.imageUrls?.card ?? product?.imageUrls?.thumbnail ?? product?.imageUrl;

const getVariantOnlyDetailImageUri = (variant: VariantImageSource | null | undefined) =>
  variant?.imageUrl ??
  variant?.imageUrls?.detail ??
  variant?.imageUrls?.card ??
  variant?.imageUrls?.thumbnail;

export const getProductDetailImageUris = (product: ProductDetailImageSource | null | undefined) => {
  const mainImageUri = getProductDetailImageUri(product);
  const detailImageUris = (product?.detailImages ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => image.imageUrl)
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));

  return Array.from(
    new Set([mainImageUri, ...detailImageUris].filter((imageUrl): imageUrl is string => Boolean(imageUrl)))
  );
};

export const getProductThumbnailImageUri = (product: ProductImageSource | null | undefined) =>
  product?.imageUrls?.thumbnail ?? product?.imageUrls?.card ?? product?.imageUrls?.detail ?? product?.imageUrl;

export const getVariantCardImageUri = (
  variant: VariantImageSource | null | undefined,
  product: ProductImageSource | null | undefined
) => {
  return (
    variant?.imageUrl ??
    variant?.imageUrls?.card ??
    variant?.imageUrls?.detail ??
    variant?.imageUrls?.thumbnail ??
    getProductCardImageUri(product)
  );
};

export const getVariantDetailImageUri = (
  variant: VariantImageSource | null | undefined,
  product: ProductImageSource | null | undefined
) =>
  getVariantOnlyDetailImageUri(variant) ?? getProductDetailImageUri(product);

export const getVariantDetailImageUris = (
  variant: VariantImageSource | null | undefined,
  product: ProductDetailImageSource | null | undefined
) => {
  const variantDetailImageUris = (variant?.detailImages ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => image.imageUrl)
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
  const variantMainImageUri = getVariantOnlyDetailImageUri(variant);
  const variantImageUris = Array.from(
    new Set([variantMainImageUri, ...variantDetailImageUris].filter((imageUrl): imageUrl is string => Boolean(imageUrl)))
  );

  return variantImageUris.length > 0 ? variantImageUris : getProductDetailImageUris(product);
};

export const getVariantThumbnailImageUri = (
  variant: VariantImageSource | null | undefined,
  product: ProductImageSource | null | undefined
) =>
  variant?.imageUrl ??
  variant?.imageUrls?.thumbnail ??
  variant?.imageUrls?.card ??
  variant?.imageUrls?.detail ??
  getProductThumbnailImageUri(product);

export const getVariantDiscountLabel = (variant: Pick<ProductVariant, "mrp" | "price"> | null | undefined) => {
  if (!variant) {
    return null;
  }

  const mrp = Number(variant.mrp);
  const price = Number(variant.price);

  if (!Number.isFinite(mrp) || !Number.isFinite(price) || mrp <= price || mrp <= 0) {
    return null;
  }

  const discountPercent = Math.round(((mrp - price) / mrp) * 100);

  return discountPercent > 0 ? `${discountPercent}% OFF` : null;
};
