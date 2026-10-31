import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

export function Footer() {
  const { categories, settings, t } = useStore();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#171412] text-[#E7E0D3] border-t border-[#2E2720]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand Heritage */}
          <div className="space-y-4">
            <div className="[&_span]:text-[#FCFBF8]">
              <BrandLogo compact />
            </div>
            <p className="text-sm text-[#B8AFA2] leading-relaxed">
              {t(settings.websiteDescription, settings.websiteDescriptionBn)}
            </p>
            <div className="flex items-center gap-4 pt-1 text-xs text-[#D6B97B]">
              {settings.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline whitespace-nowrap"
                >
                  Facebook
                </a>
              )}
              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline whitespace-nowrap"
                >
                  Instagram
                </a>
              )}
              {settings.youtubeUrl && (
                <a
                  href={settings.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline whitespace-nowrap"
                >
                  YouTube
                </a>
              )}
            </div>
          </div>

          {/* Column 2: Jewellery Categories */}
          <div>
            <h3 className="font-serif-display text-lg font-semibold text-[#FCFBF8] mb-4">
              {t('Jewellery Collections', 'অলংকার ক্যাটাগরি')}
            </h3>
            <ul className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-[#B8AFA2]">
              {categories.slice(0, 10).map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/category/${cat.slug}`}
                    className="hover:text-[#E5C580] transition-colors"
                  >
                    {t(cat.name, cat.nameBn)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Customer Assistance */}
          <div>
            <h3 className="font-serif-display text-lg font-semibold text-[#FCFBF8] mb-4">
              {t('Client Concierge', 'গ্রাহক সেবা')}
            </h3>
            <ul className="space-y-2.5 text-sm text-[#B8AFA2]">
              <li>
                <Link to="/shop" className="hover:text-[#E5C580] transition-colors">
                  {t('Explore Full Catalogue', 'সকল অলংকার দেখুন')}
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?filter=discount"
                  className="hover:text-[#E5C580] transition-colors"
                >
                  {t('Festive & Bridal Offers', 'ব্রাইডাল ও উৎসব ছাড়')}
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-[#E5C580] transition-colors">
                  {t('Your Shopping Bag', 'শপিং ব্যাগ')}
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="hover:text-[#E5C580] transition-colors">
                  {t('Track Your COD Order', 'অর্ডার ট্র্যাকিং')}
                </Link>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#E5C580] transition-colors"
                >
                  {t('XML Sitemap', 'সাইটম্যাপ')}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Showroom & Contact */}
          <div>
            <h3 className="font-serif-display text-lg font-semibold text-[#FCFBF8] mb-4">
              {t('Showroom & Contact', 'যোগাযোগ ও শোরুম')}
            </h3>
            <ul className="space-y-3 text-sm text-[#B8AFA2]">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D6B97B] shrink-0 mt-1" />
                <span>{t(settings.showroomAddress, settings.showroomAddressBn)}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#D6B97B] shrink-0" />
                <a
                  href={`tel:${settings.contactPhone.replace(/\s+/g, '')}`}
                  className="hover:text-[#E5C580] font-tabular"
                >
                  {settings.contactPhone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#D6B97B] shrink-0" />
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="hover:text-[#E5C580] break-all"
                >
                  {settings.contactEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Payment Assurance Bar */}
        <div className="mt-12 pt-6 border-t border-[#2A241E] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8C8377]">
          <p>
            © {currentYear} {settings.websiteName} ({settings.websiteNameBn}).{' '}
            {t('All rights reserved.', 'সর্বস্বত্ব সংরক্ষিত।')}
          </p>
          <p>
            {t(
              '22K Hallmarked Craftsmanship · Cash on Delivery Across All 64 Districts of Bangladesh',
              'হলমার্কযুক্ত অলংকার · বাংলাদেশের ৬৪ জেলায় ক্যাশ অন ডেলিভারি'
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
