export type ApiResponse<TData, TMeta = unknown> = {
  success: boolean;
  message: string;
  data: TData;
  meta?: TMeta;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "CUSTOMER";
  status: "ACTIVE" | "BLOCKED";
  createdAt: string;
};

export type ImageUrls = {
  original: string | null;
  thumbnail: string | null;
  card: string | null;
  detail: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  imagePublicId: string | null;
  imageUrls?: ImageUrls;
  isActive: boolean;
  productsCount: number;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  imageUrls?: ImageUrls;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductVariant = {
  id: string;
  name: string;
  mrp: string;
  price: string;
  offerPrice?: string;
  stock: number;
  sku: string;
  unit: string;
  isActive: boolean;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  imageUrls?: ImageUrls;
  detailImages?: ProductDetailImage[];
  isActive: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  };
  variants: ProductVariant[];
};

export type ProductDetailImage = {
  id: string;
  imageUrl: string;
  imagePublicId: string;
  sortOrder: number;
};

export type CartItem = {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  variant: {
    id: string;
    name: string;
    mrp: string;
    price: string;
    offerPrice?: string;
    sku: string;
    unit: string;
    stock: number;
    isActive: boolean;
  };
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    imageUrls?: ImageUrls;
    isActive: boolean;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
};

export type Cart = {
  id: string | null;
  userId: string | null;
  items: CartItem[];
  subtotal: string;
  totalItems: number;
};

export type WishlistItem = {
  id: string;
  wishlistId: string;
  productId: string;
  createdAt: string;
  product: Product;
};

export type Wishlist = {
  id: string;
  userId: string;
  items: WishlistItem[];
  createdAt: string;
  updatedAt: string;
};

export type Coupon = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string | null;
};

export type Address = {
  id: string;
  userId: string;
  type: "HOME" | "WORK" | "OTHER";
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  unit: string;
  quantity: number;
  mrp: string;
  unitPrice: string;
  total: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    isActive: boolean;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
};

export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  addressId: string;
  address: Address;
  status: "PENDING" | "CONFIRMED" | "PACKED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
  paymentMethod: "COD";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  subtotal: string;
  deliveryFee: string;
  discountAmount: string;
  couponCode: string | null;
  total: string;
  notes: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};
