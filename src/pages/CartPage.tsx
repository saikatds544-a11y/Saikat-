import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { LuxuryImage } from '../components/LuxuryImage.tsx';
import { formatBDT } from '../lib/formatters.ts';
import { trackPageView, updateDocumentSeo } from '../lib/analytics.ts';

export function CartPage() {
  const {
    cart,
    cartSubtotal,
    settings,
    language,
    t,
    removeFromCart,
    updateCartQuantity,
    clearCart,
  } = useStore();
  const navigate = useNavigate();
  const [deliveryZone, setDeliveryZone] = useState<'dhaka' | 'outside'>('dhaka');

  useEffect(() => {
    const title = `${t('Shopping Cart', 'শপিং ব্যাগ')} – ${settings.websiteName}`;
    updateDocumentSeo({
      title,
      description: settings.seoMetaDescription,
      productSchema: null,
    });
    trackPageView('/cart', title);
  }, [settings, t]);

  const baseCharge =
    deliveryZone === 'dhaka'
      ? settings.insideDhakaDelivery
      : settings.outsideDhakaDelivery;
  const deliveryCharge =
    cart.length === 0
      ? 0
      : settings.freeDeliveryThreshold > 0 && cartSubtotal >= settings.freeDeliveryThreshold
      ? 0
      : baseCharge;
  const grandTotal = cart.length > 0 ? cartSubtotal + deliveryCharge : 0;

  return (
    <div className="min-h-[75vh] bg-[#FCFBF8] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#EAE2D3]">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#8C6823] font-medium">
              {t('Maa Lakshmi Alankar Bag', 'আপনার নির্বাচিত অলংকার')}
            </p>
            <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917] mt-1">
              {t('Shopping Cart', 'শপিং কার্ট')}
            </h1>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-medium text-[#78716C] hover:text-red-700 self-start sm:self-auto cursor-pointer"
            >
              {t('Clear Shopping Bag', 'সব মুছে ফেলুন')}
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="my-12 p-12 bg-white border border-[#EAE2D3] rounded-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5EFE6] text-[#9A7024] flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
              {t('Your shopping cart is empty', 'আপনার কার্টে কোনো পণ্য নেই')}
            </h2>
            <p className="text-sm text-[#78716C] mt-2 max-w-md mx-auto">
              {t(
                'Discover handcrafted 22K gold necklaces, bridal sets, jhumkas, and bangles ready for Cash on Delivery.',
                'আমাদের আকর্ষণীয় নেকলেস, ব্রাইডাল সেট, ঝুমকা ও বালা সংগ্রহ থেকে পছন্দের অলংকার বেছে নিন।'
              )}
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 text-sm font-medium bg-[#1C1917] text-[#FCFBF8] rounded-lg hover:bg-[#9A7024] transition-colors"
            >
              <span>{t('Continue Shopping', 'অলংকার দেখুন')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variation}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-5 p-5 bg-white border border-[#EAE2D3] rounded-2xl"
                >
                  <Link
                    to={`/product/${item.slug}`}
                    className="w-24 h-24 rounded-xl overflow-hidden bg-[#F6F1E7] shrink-0"
                  >
                    <LuxuryImage
                      src={item.image}
                      alt={t(item.name, item.nameBn)}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  <div className="flex-1 min-w-0 space-y-1">
                    <Link
                      to={`/product/${item.slug}`}
                      className="font-serif-display text-xl font-semibold text-[#1C1917] hover:text-[#9A7024] block"
                    >
                      {t(item.name, item.nameBn)}
                    </Link>
                    <p className="text-xs text-[#78716C]">
                      {t('Variation:', 'ভ্যারিয়েশন:')} {item.variation} · {item.productCode}
                    </p>
                    <p className="text-sm font-medium text-[#57534E] font-tabular">
                      {t('Unit Price:', 'একক মূল্য:')} {formatBDT(item.unitPrice, language)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#F2ECE1]">
                    <div className="inline-flex items-center border border-[#DFD5C3] rounded-lg bg-[#FCFBF8]">
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQuantity(item.productId, item.variation, item.quantity - 1)
                        }
                        className="p-2 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3.5 text-sm font-semibold font-tabular text-[#1C1917]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQuantity(item.productId, item.variation, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.maxStock}
                        className="p-2 text-[#57534E] hover:text-[#1C1917] disabled:opacity-40 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[105px]">
                      <p className="text-base font-semibold text-[#1C1917] font-tabular">
                        {formatBDT(item.unitPrice * item.quantity, language)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.variation)}
                      className="p-2 text-[#A8A29E] hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      aria-label="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary Card */}
            <div className="lg:col-span-4 bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-5 lg:sticky lg:top-24">
              <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
                {t('Order Summary', 'অর্ডার সারাংশ')}
              </h2>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#57534E]">
                  {t('Preview Delivery Location', 'ডেলিভারি এলাকা নির্বাচন করুন')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryZone('dhaka')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      deliveryZone === 'dhaka'
                        ? 'border-[#1C1917] bg-[#1C1917] text-[#FCFBF8]'
                        : 'border-[#DFD5C3] text-[#44403C]'
                    }`}
                  >
                    {t('Inside Dhaka', 'ঢাকার ভেতরে')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryZone('outside')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      deliveryZone === 'outside'
                        ? 'border-[#1C1917] bg-[#1C1917] text-[#FCFBF8]'
                        : 'border-[#DFD5C3] text-[#44403C]'
                    }`}
                  >
                    {t('Outside Dhaka', 'ঢাকার বাইরে')}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-[#F0E9DC] text-sm">
                <div className="flex justify-between text-[#57534E]">
                  <span>{t('Subtotal', 'সাবটোটাল')}</span>
                  <span className="font-medium text-[#1C1917] font-tabular">
                    {formatBDT(cartSubtotal, language)}
                  </span>
                </div>
                <div className="flex justify-between text-[#57534E]">
                  <span>{t('Delivery Charge', 'ডেলিভারি চার্জ')}</span>
                  <span className="font-medium text-[#1C1917] font-tabular">
                    {deliveryCharge === 0
                      ? t('Complimentary (Free)', 'ফ্রি')
                      : formatBDT(deliveryCharge, language)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-[#EAE2D3] text-lg font-semibold text-[#1C1917]">
                  <span>{t('Grand Total', 'সর্বমোট মূল্য')}</span>
                  <span className="text-[#9A7024] font-tabular">
                    {formatBDT(grandTotal, language)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium bg-[#1C1917] hover:bg-[#9A7024] text-[#FCFBF8] rounded-xl transition-colors cursor-pointer"
              >
                <span>{t('Proceed to Checkout (COD)', 'চেকআউট করুন (ক্যাশ অন ডেলিভারি)')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-xs text-[#78716C] text-center">
                {t(
                  'No advance online payment required. Pay Cash on Delivery.',
                  'অগ্রিম পেমেন্টের প্রয়োজন নেই। পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।'
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
