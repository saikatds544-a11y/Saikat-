import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import type { Product } from '../types/store.ts';
import { useStore } from '../context/StoreContext.tsx';
import {
  formatBDT,
  getDiscountPercentage,
  getEffectivePrice,
} from '../lib/formatters.ts';
import { LuxuryImage } from './LuxuryImage.tsx';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { categories, language, t, addToCart } = useStore();
  const [hovered, setHovered] = useState(false);

  const categoryObj = categories.find((c) => c.slug === product.category);
  const categoryLabel = categoryObj
    ? t(categoryObj.name, categoryObj.nameBn)
    : product.category;

  const displayTitle = t(product.name, product.nameBn);
  const effectivePrice = getEffectivePrice(product);
  const discountPct = getDiscountPercentage(product);
  const primaryImage = product.images[0] || '';
  const secondaryImage = product.images[1] || primaryImage;
  const available = product.inStock && product.stockQuantity > 0;

  return (
    <article
      className="group flex flex-col bg-white border border-[#EAE2D3] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(28,25,23,0.12)]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        to={`/product/${product.slug}`}
        className="relative block aspect-[4/3] w-full bg-[#F6F1E7] overflow-hidden focus-visible:outline-2 focus-visible:outline-[#9A7024]"
      >
        <LuxuryImage
          src={hovered && secondaryImage ? secondaryImage : primaryImage}
          alt={displayTitle}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          {/* Clean Zero-Pill Unboxed Metadata Line */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-[#78716C] mb-1.5">
            <span className="uppercase tracking-wider font-medium text-[#8C6823]">
              {categoryLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span>{product.purity || '22K Gold'}</span>
            {discountPct > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#9A7024]">
                  {language === 'bn' ? `${discountPct}% ছাড়` : `Save ${discountPct}%`}
                </span>
              </>
            )}
          </div>

          <Link
            to={`/product/${product.slug}`}
            className="block font-serif-display text-lg font-semibold leading-snug text-[#1C1917] hover:text-[#9A7024] transition-colors line-clamp-2 min-h-[3.1rem]"
          >
            {displayTitle}
          </Link>
        </div>

        <div className="mt-4 pt-3.5 border-t border-[#F0E9DC] flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold text-[#1C1917] font-tabular">
                {formatBDT(effectivePrice, language)}
              </span>
              {discountPct > 0 && (
                <span className="text-xs text-[#A8A29E] line-through font-tabular">
                  {formatBDT(product.regularPrice, language)}
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#78716C] mt-0.5">
              {available
                ? t('In Stock · COD Available', 'স্টকে আছে · ক্যাশ অন ডেলিভারি')
                : t('Currently Out of Stock', 'স্টক শেষ')}
            </span>
          </div>

          {available ? (
            <button
              type="button"
              onClick={() => addToCart(product, 1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#1C1917] bg-[#F5EFE6] hover:bg-[#1C1917] hover:text-[#FCFBF8] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              aria-label={`${t('Add to Cart', 'ব্যাগে যোগ করুন')} - ${displayTitle}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{t('Add to Bag', 'ব্যাগে নিন')}</span>
            </button>
          ) : (
            <Link
              to={`/product/${product.slug}`}
              className="inline-flex items-center px-3.5 py-2 text-xs font-medium text-[#78716C] bg-[#F5F5F4] rounded-lg whitespace-nowrap shrink-0"
            >
              {t('Details', 'বিস্তারিত')}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};
