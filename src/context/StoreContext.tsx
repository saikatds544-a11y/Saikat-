import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Category,
  Product,
  SiteSettings,
  CustomerReview,
  CartItem,
  Language,
} from '../types/store.ts';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_REVIEWS,
} from '../data/seedData.ts';
import { getEffectivePrice } from '../lib/formatters.ts';
import { configureAnalyticsScripts, trackAddToCart } from '../lib/analytics.ts';

interface StoreContextValue {
  categories: Category[];
  products: Product[];
  settings: SiteSettings;
  reviews: CustomerReview[];
  loading: boolean;
  refreshStorefront: () => Promise<void>;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (en: string, bn?: string) => string;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number, variation?: string, openDrawer?: boolean) => void;
  removeFromCart: (productId: string, variation: string) => void;
  updateCartQuantity: (productId: string, variation: string, quantity: number) => void;
  clearCart: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const CART_STORAGE_KEY = 'mla_shopping_bag_v1';
const LANG_STORAGE_KEY = 'mla_language_pref_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SETTINGS);
  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_REVIEWS);
  const [loading, setLoading] = useState<boolean>(true);

  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      return saved === 'bn' ? 'bn' : 'en';
    } catch {
      return 'en';
    }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }, []);

  const t = useCallback(
    (en: string, bn?: string) => {
      if (language === 'bn' && bn && bn.trim()) {
        return bn;
      }
      return en;
    },
    [language]
  );

  const refreshStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.categories)) setCategories(data.categories);
        if (Array.isArray(data.products)) setProducts(data.products);
        if (data.settings) {
          setSettings(data.settings);
          configureAnalyticsScripts(data.settings);
        }
        if (Array.isArray(data.reviews)) setReviews(data.reviews);
      }
    } catch (err) {
      console.error('Failed to sync storefront catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStorefront();
  }, [refreshStorefront]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  const addToCart = useCallback(
    (product: Product, quantity = 1, variation?: string, openDrawer = true) => {
      if (!product.inStock || product.stockQuantity <= 0) return;
      const chosenVariation = variation || product.variations[0] || 'Standard';
      const unitPrice = getEffectivePrice(product);
      const safeQty = Math.max(1, Math.min(quantity, product.stockQuantity));

      setCart((prev) => {
        const idx = prev.findIndex(
          (item) => item.productId === product.id && item.variation === chosenVariation
        );
        if (idx > -1) {
          const updated = [...prev];
          const nextQty = Math.min(
            product.stockQuantity,
            updated[idx].quantity + safeQty
          );
          updated[idx] = {
            ...updated[idx],
            quantity: nextQty,
            unitPrice,
            regularPrice: product.regularPrice,
            maxStock: product.stockQuantity,
          };
          return updated;
        }
        return [
          ...prev,
          {
            productId: product.id,
            productCode: product.productCode,
            slug: product.slug,
            name: product.name,
            nameBn: product.nameBn,
            image: product.images[0] || '',
            unitPrice,
            regularPrice: product.regularPrice,
            variation: chosenVariation,
            quantity: safeQty,
            maxStock: product.stockQuantity,
          },
        ];
      });

      trackAddToCart(product, safeQty, chosenVariation);
      if (openDrawer) {
        setIsCartOpen(true);
      }
    },
    []
  );

  const removeFromCart = useCallback((productId: string, variation: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.productId === productId && item.variation === variation)
      )
    );
  }, []);

  const updateCartQuantity = useCallback(
    (productId: string, variation: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId, variation);
        return;
      }
      setCart((prev) =>
        prev.map((item) => {
          if (item.productId === productId && item.variation === variation) {
            return {
              ...item,
              quantity: Math.min(item.maxStock, Math.max(1, quantity)),
            };
          }
          return item;
        })
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  const value = useMemo(
    () => ({
      categories,
      products,
      settings,
      reviews,
      loading,
      refreshStorefront,
      language,
      setLanguage,
      t,
      cart,
      cartCount,
      cartSubtotal,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
    }),
    [
      categories,
      products,
      settings,
      reviews,
      loading,
      refreshStorefront,
      language,
      setLanguage,
      t,
      cart,
      cartCount,
      cartSubtotal,
      isCartOpen,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
