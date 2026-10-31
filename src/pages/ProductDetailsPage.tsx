import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ArrowRight, ZoomIn } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { LuxuryImage } from '../components/LuxuryImage.tsx';
import {
  formatBDT,
  getDiscountPercentage,
  getEffectivePrice,
} from '../lib/formatters.ts';
import {
  trackPageView,
  trackViewContent,
  updateDocumentSeo,
} from '../lib/analytics.ts';

export function ProductDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { products, categories, settings, language, t, addToCart } = useStore();

  const product = useMemo(
    () => products.find((p) => p.slug === slug || p.id === slug),
    [products, slug]
  );

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  useEffect(() => {
    setSelectedImageIdx(0);
    setQuantity(1);
    setZoomActive(false);
    if (product) {
      setSelectedVariation(product.variations[0] || 'Standard');
      const title = `${product.name} – ${settings.websiteName}`;
      updateDocumentSeo({
        title,
        description: product.description.slice(0, 155),
        keywords: `${product.name}, ${product.category}, ${settings.seoKeywords}`,
        productSchema: product,
      });
      trackPageView(`/product/${product.slug}`, title);
      trackViewContent(product);
    }
  }, [product, settings]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const sameCategory = products.filter(
      (p) => p.category === product.category && p.id !== product.id
    );
    if (sameCategory.length >= 3) return sameCategory.slice(0, 3);
    const others = products.filter(
      (p) => p.category !== product.category && p.id !== product.id
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [products, product]);

  if (!product) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center px-4 text-center bg-[#FCFBF8]">
        <h1 className="font-serif-display text-3xl font-semibold text-[#1C1917]">
          {t('Jewellery Piece Not Found', 'অলংকারটি পাওয়া যায়নি')}
        </h1>
        <p className="text-sm text-[#78716C] mt-2">
          {t(
            'This ornament may have been sold out or moved to another collection.',
            'এই অলংকারটি স্টক শেষ হতে পারে বা সরানো হয়েছে।'
          )}
        </p>
        <Link
          to="/shop"
          className="mt-6 px-6 py-2.5 text-sm font-medium bg-[#1C1917] text-[#FCFBF8] rounded-lg hover:bg-[#9A7024]"
        >
          {t('Return to Catalogue', 'সকল অলংকার দেখুন')}
        </Link>
      </div>
    );
  }

  const categoryObj = categories.find((c) => c.slug === product.category);
  const effectivePrice = getEffectivePrice(product);
  const discountPct = getDiscountPercentage(product);
  const savings = product.regularPrice - effectivePrice;
  const available = product.inStock && product.stockQuantity > 0;
  const images = product.images.length > 0 ? product.images : [''];
  const activeImage = images[selectedImageIdx] || images[0];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({ x, y });
  };

  const handleBuyNow = () => {
    if (!available) return;
    addToCart(product, quantity, selectedVariation, false);
    navigate('/checkout');
  };

  return (
    <div className="bg-[#FCFBF8] pb-20 lg:pb-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-2 text-xs text-[#78716C] mb-6">
          <Link to="/" className="hover:text-[#1C1917]">
            {t('Home', 'হোম')}
          </Link>
          <span>/</span>
          {categoryObj && (
            <>
              <Link to={`/category/${categoryObj.slug}`} className="hover:text-[#1C1917]">
                {t(categoryObj.name, categoryObj.nameBn)}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-[#1C1917] font-medium truncate max-w-[260px]">
            {t(product.name, product.nameBn)}
          </span>
        </nav>

        {/* Contiguous 2-Column PDP Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Sticky Gallery with Interactive Image Zoom */}
          <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-4">
            <div
              className="relative aspect-[4/3] w-full bg-[#F6F1E7] border border-[#EAE2D3] rounded-2xl overflow-hidden cursor-zoom-in"
              onMouseEnter={() => setZoomActive(true)}
              onMouseLeave={() => setZoomActive(false)}
              onMouseMove={handleMouseMove}
              onClick={() => setZoomActive((v) => !v)}
            >
              <div
                className="w-full h-full transition-transform duration-150 ease-out"
                style={{
                  transform: zoomActive ? 'scale(2.1)' : 'scale(1)',
                  transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                }}
              >
                <LuxuryImage
                  src={activeImage}
                  alt={t(product.name, product.nameBn)}
                  eager
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1917]/75 text-[#FCFBF8] text-xs">
                <ZoomIn className="w-3.5 h-3.5" />
                <span>
                  {zoomActive
                    ? t('Tap or move cursor to inspect filigree', 'জুম চালু আছে')
                    : t('Hover or tap to zoom', 'জুম করতে ক্লিক/হোভার করুন')}
                </span>
              </div>
            </div>

            {/* Multiple Product Image Thumbnails */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {images.map((imgUrl, idx) => (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      selectedImageIdx === idx
                        ? 'border-[#9A7024] shadow-sm'
                        : 'border-[#EAE2D3] opacity-75 hover:opacity-100'
                    }`}
                    aria-label={`View angle ${idx + 1}`}
                  >
                    <LuxuryImage
                      src={imgUrl}
                      alt={`${product.name} view ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Contiguous Purchase Module */}
          <div className="lg:col-span-5 bg-white border border-[#EAE2D3] rounded-2xl p-6 sm:p-8 space-y-6">
            {/* Unboxed Metadata */}
            <div className="space-y-2">
              <div className="flex items-center flex-wrap gap-2 text-xs text-[#78716C]">
                <span className="uppercase tracking-wider font-medium text-[#8C6823]">
                  {categoryObj ? t(categoryObj.name, categoryObj.nameBn) : product.category}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{product.productCode}</span>
                <span aria-hidden="true">·</span>
                <span>{product.purity}</span>
              </div>

              <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917] leading-tight">
                {t(product.name, product.nameBn)}
              </h1>
            </div>

            {/* Price & Discount Breakdown */}
            <div className="pb-5 border-b border-[#F0E9DC]">
              <div className="flex items-baseline flex-wrap gap-3">
                <span className="text-3xl font-semibold text-[#1C1917] font-tabular">
                  {formatBDT(effectivePrice, language)}
                </span>
                {discountPct > 0 && (
                  <>
                    <span className="text-base text-[#A8A29E] line-through font-tabular">
                      {formatBDT(product.regularPrice, language)}
                    </span>
                    <span className="text-xs font-medium text-[#9A7024]">
                      {language === 'bn'
                        ? `${discountPct}% ছাড় (${formatBDT(savings, language)} সাশ্রয়)`
                        : `Save ${discountPct}% (${formatBDT(savings, language)})`}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-2 text-xs text-[#57534E]">
                <span className="font-medium text-[#1C1917]">
                  {available
                    ? t(
                        `In Stock (${product.stockQuantity} available)`,
                        `স্টকে আছে (${product.stockQuantity} টি)`
                      )
                    : t('Currently Out of Stock', 'স্টক শেষ')}
                </span>
                {product.weightInfo && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{product.weightInfo}</span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-[#44403C] leading-relaxed">
              {t(product.description, product.descriptionBn)}
            </p>

            {/* Product Variations Selector */}
            {product.variations.length > 0 && (
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                  {t('Select Size / Specification', 'সাইজ / ভ্যারিয়েশন নির্বাচন করুন')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variations.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedVariation(v)}
                      className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        selectedVariation === v
                          ? 'border-[#1C1917] bg-[#1C1917] text-[#FCFBF8]'
                          : 'border-[#DFD5C3] bg-[#FCFBF8] text-[#1C1917] hover:border-[#9A7024]'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Primary Purchase Buttons */}
            {available ? (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                    {t('Quantity', 'পরিমাণ')}
                  </span>
                  <div className="inline-flex items-center border border-[#DFD5C3] rounded-lg bg-[#FCFBF8]">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="p-2.5 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 text-sm font-semibold font-tabular text-[#1C1917]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.min(product.stockQuantity, q + 1))
                      }
                      disabled={quantity >= product.stockQuantity}
                      className="p-2.5 text-[#57534E] hover:text-[#1C1917] disabled:opacity-40 cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => addToCart(product, quantity, selectedVariation, true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium text-[#1C1917] bg-[#F5EFE6] hover:bg-[#EAE0D0] border border-[#DFD5C3] rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{t('Add to Cart', 'ব্যাগে যোগ করুন')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium text-[#FCFBF8] bg-[#1C1917] hover:bg-[#9A7024] rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>{t('Buy Now (COD)', 'এখনই অর্ডার করুন')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F5F5F4] text-center text-sm font-medium text-[#57534E]">
                {t(
                  'Currently out of stock. Contact our Dhaka showroom for custom goldsmithing order.',
                  'এই মুহূর্তে স্টক শেষ। কাস্টম অর্ডারের জন্য আমাদের শোরুমে যোগাযোগ করুন।'
                )}
              </div>
            )}

            {/* COD & Delivery Terms Box */}
            <div className="pt-5 border-t border-[#F0E9DC] space-y-2 text-xs text-[#57534E]">
              <div className="flex justify-between">
                <span>{t('Payment Method', 'পেমেন্ট পদ্ধতি')}</span>
                <span className="font-medium text-[#1C1917]">
                  {t('Cash on Delivery (BDT)', 'ক্যাশ অন ডেলিভারি')}
                </span>
              </div>
              <div className="flex justify-between font-tabular">
                <span>{t('Inside Dhaka Delivery', 'ঢাকার ভেতরে ডেলিভারি')}</span>
                <span className="font-medium text-[#1C1917]">
                  {formatBDT(settings.insideDhakaDelivery, language)}
                </span>
              </div>
              <div className="flex justify-between font-tabular">
                <span>{t('Outside Dhaka (All Districts)', 'ঢাকার বাইরে ডেলিভারি')}</span>
                <span className="font-medium text-[#1C1917]">
                  {formatBDT(settings.outsideDhakaDelivery, language)}
                </span>
              </div>
              {settings.freeDeliveryThreshold > 0 && (
                <p className="text-[#8C6823] pt-1">
                  {t(
                    `Complimentary insured delivery on orders above ${formatBDT(settings.freeDeliveryThreshold, language)}.`,
                    `${formatBDT(settings.freeDeliveryThreshold, language)}+ অর্ডারে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি।`
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Related Jewellery Pieces */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 pt-12 border-t border-[#EAE2D3]">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#8C6823] font-medium">
                  {t('Complete Your Ensemble', 'ম্যাচিং অলংকার')}
                </p>
                <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#1C1917] mt-1">
                  {t('Related Jewellery Pieces', 'সম্পর্কিত আরও অলংকার')}
                </h2>
              </div>
              <Link
                to={categoryObj ? `/category/${categoryObj.slug}` : '/shop'}
                className="text-sm font-medium text-[#9A7024] hover:text-[#1C1917] whitespace-nowrap"
              >
                {t('View More', 'আরও দেখুন')}
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile Sticky Bottom Buy Bar (Compact <= 64px to stay well within 15% sticky budget) */}
      {available && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EAE2D3] px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-[#78716C] truncate">{t(product.name, product.nameBn)}</p>
            <p className="text-sm font-semibold text-[#1C1917] font-tabular">
              {formatBDT(effectivePrice * quantity, language)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBuyNow}
            className="px-5 py-2.5 text-xs font-medium bg-[#1C1917] text-[#FCFBF8] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t('Buy Now (COD)', 'এখনই অর্ডার করুন')}
          </button>
        </div>
      )}
    </div>
  );
}
