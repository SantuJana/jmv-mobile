import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { getErrorMessage } from "../lib/api-client";
import { useAuth } from "./auth-provider";
import type { ApiResponse, Wishlist } from "../types/api";

type WishlistContextType = {
  wishlist: Wishlist | null;
  isLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authorizedRequest } = useAuth();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist(null);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await authorizedRequest<ApiResponse<{ wishlist: Wishlist }>>("/wishlist");
      setWishlist(response.data.wishlist);
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authorizedRequest]);

  useEffect(() => {
    void fetchWishlist();
  }, [fetchWishlist]);

  const isWishlisted = useCallback((productId: string) => {
    if (!wishlist) return false;
    return wishlist.items.some((item) => item.productId === productId);
  }, [wishlist]);

  const toggleWishlist = useCallback(async (productId: string) => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to add items to your wishlist.");
      return;
    }

    const currentlyWishlisted = isWishlisted(productId);
    
    // Optimistic update
    setWishlist((prev) => {
      if (!prev) return prev;
      if (currentlyWishlisted) {
        return {
          ...prev,
          items: prev.items.filter((item) => item.productId !== productId)
        };
      } else {
        // Optimistic add (we don't have the full product object, so we just add a stub)
        return {
          ...prev,
          items: [...prev.items, { productId, id: "temp", wishlistId: prev.id, createdAt: new Date().toISOString(), product: {} as any }]
        };
      }
    });

    try {
      if (currentlyWishlisted) {
        await authorizedRequest(`/wishlist/items/${productId}`, { method: "DELETE" });
      } else {
        await authorizedRequest(`/wishlist/items`, {
          method: "POST",
          body: JSON.stringify({ productId })
        });
      }
      // Re-fetch to get real data
      void fetchWishlist();
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error, "Could not update wishlist"));
      // Revert optimistic update
      void fetchWishlist();
    }
  }, [isAuthenticated, isWishlisted, authorizedRequest, fetchWishlist]);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isLoading,
        isWishlisted,
        toggleWishlist,
        refreshWishlist: fetchWishlist
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
