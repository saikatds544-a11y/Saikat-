import type { Language, Product } from '../types/store.ts';

const EN_TO_BN_DIGITS: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

export function toBengaliDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => EN_TO_BN_DIGITS[d] || d);
}

export function formatBDT(amount: number, lang: Language = 'en'): string {
  const rounded = Math.round(Number(amount) || 0);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(rounded);

  if (lang === 'bn') {
    return `৳${toBengaliDigits(formatted)}`;
  }
  return `৳${formatted}`;
}

export function getEffectivePrice(product: Product): number {
  if (
    product.discountPrice !== null &&
    product.discountPrice > 0 &&
    product.discountPrice < product.regularPrice
  ) {
    return product.discountPrice;
  }
  return product.regularPrice;
}

export function getDiscountPercentage(product: Product): number {
  if (
    product.discountPrice !== null &&
    product.discountPrice > 0 &&
    product.discountPrice < product.regularPrice &&
    product.regularPrice > 0
  ) {
    return Math.round(
      ((product.regularPrice - product.discountPrice) / product.regularPrice) * 100
    );
  }
  return 0;
}
