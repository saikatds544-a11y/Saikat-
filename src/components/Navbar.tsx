import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Search, Menu, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';
import { formatBDT, getEffectivePrice } from '../lib/formatters.ts';
import { trackSearch } from '../lib/analytics.ts';
import { LuxuryImage } from './LuxuryImage.tsx';

export function Navbar() {
  const {
    products,
    categories,
    settings,
    language,
    setLanguage,
    t,
    cartCount,
    cartSubtotal,
    setIsCartOpen,
  } = useStore();

  const navigate = useNavigate();
  const location = useLocation();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Quiet keyboard shortcut (Ctrl+Shift+A) for store owner to open private Admin Portal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        navigate('/admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchFocused(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = searchQuery.trim();
  const liveMatches =
    trimmedQuery.length >= 1 && trimmedQuery !== '/admin'
      ? products
          .filter((p) => {
            const q = trimmedQuery.toLowerCase();
            return (
              p.name.toLowerCase().includes(q) ||
              (p.nameBn && p.nameBn.includes(trimmedQuery)) ||
              p.productCode.toLowerCase().includes(q) ||
              p.category.toLowerCase().includes(q)
            );
          })
          .slice(0, 5)
      : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedQuery) return;
    if (trimmedQuery.toLowerCase() === '/admin') {
      setSearchQuery('');
      setSearchFocused(false);
      navigate('/admin');
      return;
    }
    trackSearch(trimmedQuery);
    setSearchFocused(false);
    navigate(`/shop?q=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <div className="w-full">
      {/* Slim Dismissible Announcement Bar (<= 36px height) */}
      {settings.announcementEnabled && settings.announcementText && !bannerDismissed && (
        <div className="bg-[#1C1917] text-[#F5EFE6] px-4 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <p className="truncate mx-auto text-center font-normal tracking-wide">
              {t(settings.announcementText, settings.announcementTextBn)}
            </p>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="text-[#A8A29E] hover:text-white shrink-0 cursor-pointer"
              aria-label="Dismiss announcement"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#EAE2D3]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-8 py-4">
          {/* Zone 1: Single-line Brand Wordmark / Official Logo */}
          <Link to="/" className="whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#9A7024]">
            <BrandLogo />
          </Link>

          {/* Zone 2: 5 Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#44403C]"
          >
            <Link
              to="/shop"
              className="hover:text-[#9A7024] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B58938]"
            >
              {t('Shop All', 'সকল অলংকার')}
            </Link>
            <Link
              to="/category/necklace"
              className="hover:text-[#9A7024] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B58938]"
            >
              {t('Necklaces', 'নেকলেস')}
            </Link>
            <Link
              to="/category/bridal-jewellery"
              className="hover:text-[#9A7024] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B58938]"
            >
              {t('Bridal', 'ব্রাইডাল')}
            </Link>
            <Link
              to="/shop?filter=discount"
              className="hover:text-[#9A7024] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B58938]"
            >
              {t('Special Offers', 'বিশেষ ছাড়')}
            </Link>
            <Link
              to="/track-order"
              className="hover:text-[#9A7024] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B58938]"
            >
              {t('Track Order', 'অর্ডার ট্র্যাক')}
            </Link>
          </nav>

          {/* Zone 3: Primary Shopping Bag Action (+ Mobile Menu Trigger on small screens) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-[#FCFBF8] bg-[#1C1917] hover:bg-[#9A7024] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {t('Bag', 'ব্যাগ')} ({cartCount})
              </span>
              {cartCount > 0 && (
                <span className="hidden sm:inline font-tabular text-[#E7CBA0]">
                  · {formatBDT(cartSubtotal, language)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 text-[#1C1917] hover:bg-[#F5EFE6] rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#EAE2D3] bg-[#FCFBF8] px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm font-medium text-[#1C1917]">
              <Link to="/shop" className="px-3 py-2 rounded-lg hover:bg-[#F5EFE6]">
                {t('Shop All Jewellery', 'সকল অলংকার')}
              </Link>
              <Link to="/category/bridal-jewellery" className="px-3 py-2 rounded-lg hover:bg-[#F5EFE6]">
                {t('Bridal Collection', 'ব্রাইডাল জুয়েলারি')}
              </Link>
              <Link to="/shop?filter=discount" className="px-3 py-2 rounded-lg hover:bg-[#F5EFE6]">
                {t('Special Offers', 'বিশেষ ছাড়')}
              </Link>
              <Link to="/track-order" className="px-3 py-2 rounded-lg hover:bg-[#F5EFE6]">
                {t('Track Order', 'অর্ডার ট্র্যাক করুন')}
              </Link>
            </div>
            <div className="pt-2 border-t border-[#F0E9DC]">
              <p className="text-xs text-[#78716C] mb-2 px-1">
                {t('Browse Categories', 'ক্যাটাগরি সমূহ')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    className="px-2.5 py-1.5 text-xs text-[#44403C] bg-[#F5EFE6] rounded-md hover:bg-[#EAE0D0] whitespace-nowrap"
                  >
                    {t(cat.name, cat.nameBn)}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Storefront Discovery Toolbar (Search Bar + Bilingual Switcher + Quick Categories) */}
      <div className="bg-[#F6F1E7]/70 border-b border-[#EAE2D3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Instant Search Bar */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder={t(
                  'Search necklaces, jhumkas, bangles, rings, or code (MLA-22K)...',
                  'নেকলেস, ঝুমকা, বালা, আংটি বা প্রোডাক্ট কোড খুঁজুন...'
                )}
                className="w-full pl-10 pr-20 py-2 text-sm bg-white border border-[#E2D8C5] rounded-lg text-[#1C1917] placeholder:text-[#8A8279] focus:outline-none focus:border-[#9A7024]"
              />
              <button
                type="submit"
                className="absolute right-1.5 px-3 py-1 text-xs font-medium bg-[#F5EFE6] hover:bg-[#1C1917] hover:text-white text-[#1C1917] rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                {t('Search', 'খুঁজুন')}
              </button>
            </form>

            {/* Instant Search Results Popover */}
            {searchFocused && trimmedQuery.length > 0 && trimmedQuery !== '/admin' && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#EAE2D3] rounded-xl shadow-xl z-30 overflow-hidden">
                {liveMatches.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-[#78716C]">
                    {t(
                      `No jewellery pieces matched "${trimmedQuery}".`,
                      `"${trimmedQuery}" নামে কোনো অলংকার পাওয়া যায়নি।`
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-[#F3EDE2]">
                    {liveMatches.map((prod) => (
                      <Link
                        key={prod.id}
                        to={`/product/${prod.slug}`}
                        onClick={() => setSearchFocused(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FCF9F3] transition-colors"
                      >
                        <div className="w-11 h-11 rounded-md overflow-hidden bg-[#F6F1E7] shrink-0">
                          <LuxuryImage
                            src={prod.images[0]}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1C1917] truncate">
                            {t(prod.name, prod.nameBn)}
                          </p>
                          <p className="text-xs text-[#78716C]">
                            {prod.productCode} · {prod.purity}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[#9A7024] font-tabular shrink-0">
                          {formatBDT(getEffectivePrice(prod), language)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Language Segmented Control & Currency Indicator */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <span className="text-xs text-[#57534E] whitespace-nowrap">
              {t('Currency: BDT (৳) · COD', 'মুদ্রা: টাকা (৳) · ক্যাশ অন ডেলিভারি')}
            </span>
            <div
              role="group"
              aria-label="Language Switcher"
              className="inline-flex items-center p-0.5 bg-white border border-[#E2D8C5] rounded-lg"
            >
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#1C1917] text-[#FCFBF8]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  language === 'bn'
                    ? 'bg-[#1C1917] text-[#FCFBF8]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
