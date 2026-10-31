import React, { useMemo, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { getDiscountPercentage, getEffectivePrice } from '../lib/formatters.ts';
import { trackPageView, updateDocumentSeo } from '../lib/analytics.ts';

export function CatalogPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, products, settings, t } = useStore();

  const query = searchParams.get('q') || '';
  const filter = searchParams.get('filter') || 'all';
  const sort = searchParams.get('sort') || 'newest';

  const activeCategory = useMemo(
    () => (slug ? categories.find((c) => c.slug === slug) : undefined),
    [categories, slug]
  );

  useEffect(() => {
    const pageTitle = activeCategory
      ? `${activeCategory.name} – ${settings.websiteName}`
      : query
      ? `Search: "${query}" – ${settings.websiteName}`
      : `Jewellery Catalogue – ${settings.websiteName}`;
    const pageDesc = activeCategory
      ? activeCategory.description || settings.seoMetaDescription
      : settings.seoMetaDescription;

    updateDocumentSeo({
      title: pageTitle,
      description: pageDesc,
      keywords: settings.seoKeywords,
      productSchema: null,
    });
    trackPageView(window.location.pathname + window.location.search, pageTitle);
  }, [activeCategory, query, settings]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (slug) {
      list = list.filter((p) => p.category === slug);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.nameBn && p.nameBn.includes(query.trim())) ||
          p.description.toLowerCase().includes(q) ||
          p.productCode.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (filter === 'featured') {
      list = list.filter((p) => p.isFeatured);
    } else if (filter === 'bestsellers') {
      list = list.filter((p) => p.isBestSeller);
    } else if (filter === 'new') {
      list = list.filter((p) => p.isNewArrival);
    } else if (filter === 'discount') {
      list = list.filter((p) => getDiscountPercentage(p) > 0);
    } else if (filter === 'instock') {
      list = list.filter((p) => p.inStock && p.stockQuantity > 0);
    }

    if (sort === 'price-asc') {
      list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    } else if (sort === 'price-desc') {
      list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    } else {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return list;
  }, [products, slug, query, filter, sort]);

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === 'all' || (key === 'sort' && val === 'newest')) {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-[#FCFBF8] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Breadcrumb & Heading */}
        <div className="pb-8 border-b border-[#EAE2D3]">
          <div className="flex items-center gap-2 text-xs text-[#78716C] mb-2">
            <Link to="/" className="hover:text-[#1C1917]">
              {t('Home', 'হোম')}
            </Link>
            <span>/</span>
            <Link to="/shop" className="hover:text-[#1C1917]">
              {t('Catalogue', 'সকল অলংকার')}
            </Link>
            {activeCategory && (
              <>
                <span>/</span>
                <span className="text-[#1C1917] font-medium">
                  {t(activeCategory.name, activeCategory.nameBn)}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917]">
                {activeCategory
                  ? t(activeCategory.name, activeCategory.nameBn)
                  : query
                  ? t(`Search Results for “${query}”`, `“${query}” এর ফলাফল`)
                  : t('Complete Jewellery Catalogue', 'সম্পূর্ণ অলংকার সংগ্রহ')}
              </h1>
              {activeCategory && (
                <p className="text-sm text-[#57534E] mt-1.5 max-w-2xl">
                  {t(activeCategory.description, activeCategory.descriptionBn)}
                </p>
              )}
            </div>
            <p className="text-xs text-[#78716C] font-tabular shrink-0">
              {filteredProducts.length}{' '}
              {t(
                filteredProducts.length === 1 ? 'jewellery piece' : 'jewellery pieces',
                'টি অলংকার পাওয়া গেছে'
              )}
            </p>
          </div>
        </div>

        {/* Category Navigation Strip */}
        <div className="py-5 flex items-center gap-2 overflow-x-auto border-b border-[#F0E9DC]">
          <Link
            to="/shop"
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              !slug
                ? 'bg-[#1C1917] text-[#FCFBF8]'
                : 'bg-[#F5EFE6] text-[#44403C] hover:bg-[#EAE0D0]'
            }`}
          >
            {t('All Categories', 'সব ক্যাটাগরি')}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                slug === cat.slug
                  ? 'bg-[#1C1917] text-[#FCFBF8]'
                  : 'bg-[#F5EFE6] text-[#44403C] hover:bg-[#EAE0D0]'
              }`}
            >
              {t(cat.name, cat.nameBn)}
            </Link>
          ))}
        </div>

        {/* Filter & Sort Controls */}
        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', en: 'All', bn: 'সব' },
                { id: 'featured', en: 'Featured', bn: 'ফিচার্ড' },
                { id: 'bestsellers', en: 'Best-Selling', bn: 'সেরা বিক্রিত' },
                { id: 'new', en: 'New Arrivals', bn: 'নতুন' },
                { id: 'discount', en: 'Discounted', bn: 'ছাড়' },
                { id: 'instock', en: 'In Stock', bn: 'স্টকে আছে' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => updateParam('filter', f.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                  filter === f.id
                    ? 'border-[#9A7024] bg-[#FBF6EB] text-[#7A581B]'
                    : 'border-[#E6DDD0] bg-white text-[#57534E] hover:border-[#B58938]'
                }`}
              >
                {t(f.en, f.bn)}
              </button>
            ))}

            {query && (
              <button
                type="button"
                onClick={() => updateParam('q', '')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#F5EFE6] text-[#1C1917] rounded-md hover:bg-[#EAE0D0] cursor-pointer"
              >
                <span>“{query}”</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="catalog-sort" className="text-xs text-[#78716C] whitespace-nowrap">
              {t('Sort by:', 'সাজান:')}
            </label>
            <select
              id="catalog-sort"
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E2D8C5] rounded-lg text-[#1C1917] focus:outline-none focus:border-[#9A7024]"
            >
              <option value="newest">{t('Newest Arrivals', 'নতুন সংযোজন')}</option>
              <option value="price-asc">{t('Price: Low to High', 'কম থেকে বেশি দাম')}</option>
              <option value="price-desc">{t('Price: High to Low', 'বেশি থেকে কম দাম')}</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="my-12 p-12 bg-white border border-[#EAE2D3] rounded-2xl text-center">
            <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
              {t('No matching jewellery pieces found', 'কোনো অলংকার পাওয়া যায়নি')}
            </h2>
            <p className="text-sm text-[#78716C] mt-2 max-w-md mx-auto">
              {t(
                'Try clearing your search filter or exploring another jewellery category.',
                'অনুগ্রহ করে ফিল্টার পরিবর্তন করুন অথবা অন্য ক্যাটাগরি দেখুন।'
              )}
            </p>
            <Link
              to="/shop"
              className="inline-block mt-6 px-5 py-2.5 text-sm font-medium bg-[#1C1917] text-[#FCFBF8] rounded-lg hover:bg-[#9A7024] transition-colors"
            >
              {t('Reset Catalogue Filters', 'সব অলংকার দেখুন')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 pt-2 pb-12">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
