import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Mail, MapPin } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { LuxuryImage } from '../components/LuxuryImage.tsx';
import { formatBDT, getDiscountPercentage } from '../lib/formatters.ts';
import { trackPageView, updateDocumentSeo } from '../lib/analytics.ts';

type ShowcaseTab = 'featured' | 'bestsellers' | 'new' | 'discount' | 'all';

export function HomePage() {
  const { categories, products, settings, reviews, language, t } = useStore();
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('featured');

  useEffect(() => {
    updateDocumentSeo({
      title: settings.seoMetaTitle || `${settings.websiteName} – Fine Gold & Bridal Jewellery`,
      description: settings.seoMetaDescription || settings.websiteDescription,
      keywords: settings.seoKeywords,
      productSchema: null,
    });
    trackPageView('/', settings.seoMetaTitle || settings.websiteName);
  }, [settings]);

  const displayedProducts = useMemo(() => {
    switch (activeTab) {
      case 'featured': {
        const list = products.filter((p) => p.isFeatured);
        return (list.length > 0 ? list : products).slice(0, 6);
      }
      case 'bestsellers': {
        const list = products.filter((p) => p.isBestSeller);
        return (list.length > 0 ? list : products).slice(0, 6);
      }
      case 'new': {
        const list = products.filter((p) => p.isNewArrival);
        return (list.length > 0 ? list : products).slice(0, 6);
      }
      case 'discount': {
        const list = products.filter((p) => getDiscountPercentage(p) > 0);
        return (list.length > 0 ? list : products).slice(0, 6);
      }
      case 'all':
      default:
        return products.slice(0, 9);
    }
  }, [products, activeTab]);

  return (
    <div className="bg-[#FCFBF8]">
      {/* 1. Split-Screen Editorial Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch bg-[#F6F0E4] border border-[#E7DEC9] rounded-2xl overflow-hidden">
          {/* Left Copy Column */}
          <div className="lg:col-span-6 p-7 sm:p-12 lg:p-14 flex flex-col justify-center">
            <p className="text-xs font-medium tracking-wider uppercase text-[#8C6823] mb-3">
              {t(settings.tagline, settings.taglineBn)}
            </p>
            <h1
              className="font-serif-display text-4xl sm:text-5xl font-semibold text-[#1C1917] leading-[1.12] tracking-tight"
              style={{ textWrap: 'balance' } as React.CSSProperties}
            >
              {t(settings.heroTitle, settings.heroTitleBn)}
            </h1>
            <p className="mt-5 text-base text-[#57534E] leading-relaxed max-w-xl">
              {t(settings.heroSubtitle, settings.heroSubtitleBn)}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-[#FCFBF8] bg-[#1C1917] hover:bg-[#9A7024] rounded-lg transition-colors whitespace-nowrap"
              >
                <span>{t(settings.heroCtaText || 'Shop Now', settings.heroCtaTextBn || 'সংগ্রহ দেখুন')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/category/bridal-jewellery"
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-[#1C1917] bg-white border border-[#DFD4BE] hover:border-[#9A7024] rounded-lg transition-colors whitespace-nowrap"
              >
                {t('Explore Bridal Vault', 'ব্রাইডাল জুয়েলারি')}
              </Link>
            </div>
          </div>

          {/* Right Photography Column */}
          <div className="lg:col-span-6 min-h-[280px] sm:min-h-[380px] lg:min-h-[480px] bg-[#EDE3D0]">
            <LuxuryImage
              src={settings.heroBannerImage}
              alt={t(settings.heroTitle, settings.heroTitleBn)}
              eager
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Full-Width 4-Column Heritage Trust & Delivery Strip */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 bg-white border border-[#EAE2D3] rounded-xl">
            <p className="font-serif-display text-lg font-semibold text-[#1C1917]">
              {t('916 Hallmarked Purity', '২২ ক্যারেট হলমার্ক মান')}
            </p>
            <p className="text-xs text-[#78716C] mt-1">
              {t(
                'Every ornament arrives with an official purity certificate & invoice.',
                'প্রতিটি অলংকারের সাথে থাকছে খাঁটিত্বের অফিশিয়াল গ্যারান্টি ও ইনভয়েস।'
              )}
            </p>
          </div>
          <div className="p-4 sm:p-5 bg-white border border-[#EAE2D3] rounded-xl">
            <p className="font-serif-display text-lg font-semibold text-[#1C1917]">
              {t('100% Cash on Delivery', '১০০% ক্যাশ অন ডেলিভারি')}
            </p>
            <p className="text-xs text-[#78716C] mt-1">
              {t(
                'Pay in BDT cash only when your sealed parcel arrives at your doorstep.',
                'অর্ডার হাতে পেয়ে যাচাই করে নগদ টাকায় মূল্য পরিশোধের সুবিধা।'
              )}
            </p>
          </div>
          <div className="p-4 sm:p-5 bg-white border border-[#EAE2D3] rounded-xl">
            <p className="font-serif-display text-lg font-semibold text-[#1C1917]">
              {t('64 Districts Coverage', 'সারা বাংলাদেশে ডেলিভারি')}
            </p>
            <p className="text-xs text-[#78716C] mt-1 font-tabular">
              {t(
                `Dhaka ${formatBDT(settings.insideDhakaDelivery, language)} · Nationwide ${formatBDT(settings.outsideDhakaDelivery, language)}`,
                `ঢাকায় ${formatBDT(settings.insideDhakaDelivery, language)} · ঢাকার বাইরে ${formatBDT(settings.outsideDhakaDelivery, language)}`
              )}
            </p>
          </div>
          <div className="p-4 sm:p-5 bg-white border border-[#EAE2D3] rounded-xl">
            <p className="font-serif-display text-lg font-semibold text-[#1C1917]">
              {t('Lifetime Exchange Policy', 'আজীবন এক্সচেঞ্জ সুবিধা')}
            </p>
            <p className="text-xs text-[#78716C] mt-1">
              {t(
                'Transparent gold exchange and resizing support at our Dhaka showroom.',
                'আমাদের ঢাকা শোরুম থেকে সহজ এক্সচেঞ্জ ও সাইজ পরিবর্তনের নিশ্চয়তা।'
              )}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Jewellery Categories Section (All 10 Categories) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 border-t border-[#EFE8DA]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#8C6823]">
              {t('Shop By Category', 'অলংকারের বিভাগসমূহ')}
            </p>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917] mt-1">
              {t('Curated Jewellery Departments', 'পছন্দের ক্যাটাগরি বেছে নিন')}
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9A7024] hover:text-[#1C1917] transition-colors whitespace-nowrap"
          >
            <span>{t('View Complete Catalogue', 'সবগুলো দেখুন')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat.slug).length;
            return (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group flex flex-col bg-white border border-[#EAE2D3] rounded-xl overflow-hidden hover:border-[#B58938] transition-colors"
              >
                <div className="aspect-[4/3] w-full bg-[#F6F1E7] overflow-hidden">
                  <LuxuryImage
                    src={cat.image}
                    alt={t(cat.name, cat.nameBn)}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-3.5 flex items-baseline justify-between gap-2">
                  <h3 className="font-serif-display text-base sm:text-lg font-semibold text-[#1C1917] group-hover:text-[#9A7024] truncate">
                    {t(cat.name, cat.nameBn)}
                  </h3>
                  <span className="text-xs text-[#78716C] font-tabular shrink-0">
                    {count}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Signature Showcase: Featured, Best-Selling, New Arrivals & Discount Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 border-t border-[#EFE8DA]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#8C6823]">
              {t('Artisan Goldsmith Showcase', 'নির্বাচিত অলংকার সম্ভার')}
            </p>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917] mt-1">
              {t('Signature Pieces & Seasonal Collections', 'জনপ্রিয় ও নতুন অলংকার সংগ্রহ')}
            </h2>
          </div>

          {/* Interactive Filter Segmented Tabs */}
          <div
            role="tablist"
            aria-label="Product collections"
            className="flex items-center gap-1 p-1 bg-[#F3ECE0] border border-[#E5DAC6] rounded-xl overflow-x-auto"
          >
            {(
              [
                { id: 'featured', en: 'Featured', bn: 'ফিচার্ড' },
                { id: 'bestsellers', en: 'Best-Selling', bn: 'সেরা বিক্রিত' },
                { id: 'new', en: 'New Arrivals', bn: 'নতুন আগমন' },
                { id: 'discount', en: 'Discount Offers', bn: 'ছাড়ের পণ্য' },
                { id: 'all', en: 'All Pieces', bn: 'সকল পণ্য' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {t(tab.en, tab.bn)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-7 py-3 text-sm font-medium text-[#1C1917] bg-white border border-[#DCCFB8] hover:border-[#1C1917] rounded-lg transition-colors whitespace-nowrap"
          >
            <span>{t('Explore All Jewellery Pieces', 'সম্পূর্ণ কালেকশন দেখুন')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 4. Special Bridal & Festive Offer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch bg-[#1C1917] text-[#FCFBF8] rounded-2xl overflow-hidden border border-[#2F2923]">
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-widest text-[#E5C580] mb-3">
              {settings.specialOfferBadge || 'Bridal Privilege · Save up to 8%'}
            </p>
            <h2
              className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#FCFBF8] leading-tight tracking-wide"
              style={{ textWrap: 'balance' } as React.CSSProperties}
            >
              {t(settings.specialOfferTitle, settings.specialOfferTitleBn)}
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#D6CFC2] leading-relaxed max-w-xl">
              {t(settings.specialOfferSubtitle, settings.specialOfferSubtitleBn)}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/shop?filter=discount"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-[#B58938] hover:bg-[#C69A47] text-[#1C1917] rounded-lg transition-colors whitespace-nowrap"
              >
                <span>{t('Shop Privileged Offers', 'ছাড়ের অলংকার দেখুন')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/category/jewellery-sets"
                className="inline-flex items-center px-6 py-3 text-sm font-medium border border-[#4A4035] hover:border-[#E5C580] text-[#F5EFE6] rounded-lg transition-colors whitespace-nowrap"
              >
                {t('View Complete Sets', 'জুয়েলারি সেট দেখুন')}
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 min-h-[260px] sm:min-h-[340px] bg-[#2A241E]">
            <LuxuryImage
              src={settings.specialOfferBannerImage}
              alt={t(settings.specialOfferTitle, settings.specialOfferTitleBn)}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* 5. Why Choose Us & Verified Bangladeshi Client Reviews */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-14 border-t border-[#EFE8DA]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Why Choose Maa Lakshmi Alankar */}
          <div className="lg:col-span-5 space-y-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8C6823]">
              {t('Why Choose Maa Lakshmi Alankar', 'কেন মা লক্ষ্মী অলংকার বেছে নেবেন')}
            </p>
            <h2
              className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917] leading-tight"
              style={{ textWrap: 'balance' } as React.CSSProperties}
            >
              {t(
                'Generations of Bengali Goldsmithing Integrity',
                'বংশপরম্পরায় খাঁটি বাঙালি স্বর্ণশিল্পের বিশ্বস্ত প্রতিষ্ঠান'
              )}
            </h2>
            <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
              {t(
                'From intricate Nakshi filigree carved by veteran Dhaka artisans to transparent weight documentation and insured Cash on Delivery, every piece honors your family’s most cherished milestones.',
                'ঢাকার অভিজ্ঞ কারিগরদের নিখুঁত নকশি কারুকাজ, সঠিক ওজনের নিশ্চয়তা এবং নিরাপদ ক্যাশ অন ডেলিভারির মাধ্যমে আপনার প্রতিটি শুভ মুহূর্তকে আমরা করে তুলি স্মরণীয়।'
              )}
            </p>

            <div className="space-y-4 pt-2">
              <div className="pb-4 border-b border-[#EAE2D3]">
                <h3 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                  {t('01. Verified Karat & Weight Transparency', '০১. শতভাগ সঠিক ক্যারেট ও ওজন')}
                </h3>
                <p className="text-sm text-[#57534E] mt-1">
                  {t(
                    'Every ornament lists exact gram/bhori specifications and arrives with an itemized hallmark invoice.',
                    'প্রতিটি গহনার সাথে থাকছে সঠিক গ্রাম/ভরি হিসাব এবং অফিশিয়াল হলমার্ক ভাউচার।'
                  )}
                </p>
              </div>
              <div className="pb-4 border-b border-[#EAE2D3]">
                <h3 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                  {t('02. Phone Verification Before Dispatch', '০২. পাঠানোর আগে ফোনে কনফার্মেশন')}
                </h3>
                <p className="text-sm text-[#57534E] mt-1">
                  {t(
                    'Our concierge confirms ring/bangle sizing and delivery timing directly with you by phone.',
                    'অর্ডার পাঠানোর পূর্বে আমাদের প্রতিনিধি ফোনে সাইজ ও ঠিকানা যাচাই করে নেন।'
                  )}
                </p>
              </div>
              <div>
                <h3 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                  {t('03. Tamper-Evident Velvet Presentation', '০৩. সিলকৃত ভেলভেট গিফট বক্স')}
                </h3>
                <p className="text-sm text-[#57534E] mt-1">
                  {t(
                    'Shipped in sealed heirloom presentation boxes ready for bridal trousseaus and auspicious gifting.',
                    'বিয়ে বা উপহারের জন্য প্রিমিয়াম ভেলভেট বক্সে সম্পূর্ণ নিরাপদ প্যাকেজিং।'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Attributable Customer Reviews */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
                {t('Patron Stories Across Bangladesh', 'গ্রাহকদের মতামত ও অভিজ্ঞতা')}
              </h3>
              <span className="text-xs text-[#78716C] font-tabular">
                {t('4.9 / 5.0 Verified COD Patrons', '৪.৯ / ৫.০ ভেরিফায়েড রিভিউ')}
              </span>
            </div>

            {reviews.map((rev) => (
              <blockquote
                key={rev.id}
                className="p-6 bg-white border border-[#EAE2D3] rounded-xl space-y-3"
              >
                <p className="text-sm sm:text-base text-[#292524] leading-relaxed">
                  “{t(rev.comment, rev.commentBn)}”
                </p>
                <footer className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F4EFE4] text-xs text-[#78716C]">
                  <div>
                    <span className="font-semibold text-[#1C1917]">
                      {t(rev.customerName, rev.customerNameBn)}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>{t(rev.location, rev.locationBn)}</span>
                  </div>
                  <div className="text-[#8C6823]">
                    <span>{rev.purchasedItem}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{rev.verifiedDate}</span>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Showroom Concierge & Contact Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-16">
        <div className="p-7 sm:p-10 bg-[#F6F0E4] border border-[#E5DAC4] rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#8C6823] font-medium">
              {t('Personal Bridal Consultation', 'সরাসরি যোগাযোগ ও পরামর্শ')}
            </p>
            <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#1C1917] mt-1">
              {t('Speak With Our Jewellery Concierge', 'আমাদের শোরুমে কথা বলুন')}
            </h2>
          </div>

          <div className="space-y-2 text-sm text-[#44403C]">
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#9A7024] shrink-0" />
              <a
                href={`tel:${settings.contactPhone.replace(/\s+/g, '')}`}
                className="font-semibold text-[#1C1917] hover:text-[#9A7024] font-tabular"
              >
                {settings.contactPhone}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#9A7024] shrink-0" />
              <a
                href={`mailto:${settings.contactEmail}`}
                className="hover:text-[#9A7024] break-all"
              >
                {settings.contactEmail}
              </a>
            </p>
          </div>

          <div className="flex items-start gap-2 text-sm text-[#44403C]">
            <MapPin className="w-4 h-4 text-[#9A7024] shrink-0 mt-1" />
            <span>{t(settings.showroomAddress, settings.showroomAddressBn)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
