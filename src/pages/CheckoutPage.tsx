import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshLocations.ts';
import { LuxuryImage } from '../components/LuxuryImage.tsx';
import { formatBDT } from '../lib/formatters.ts';
import {
  trackInitiateCheckout,
  trackPageView,
  trackPurchase,
  updateDocumentSeo,
} from '../lib/analytics.ts';

export function CheckoutPage() {
  const {
    cart,
    cartSubtotal,
    settings,
    language,
    t,
    clearCart,
    refreshStorefront,
  } = useStore();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('Dhanmondi');
  const [customUpazila, setCustomUpazila] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const title = `${t('Checkout – Cash on Delivery', 'চেকআউট – ক্যাশ অন ডেলিভারি')} – ${settings.websiteName}`;
    updateDocumentSeo({
      title,
      description: settings.seoMetaDescription,
      productSchema: null,
    });
    trackPageView('/checkout', title);
    if (cart.length > 0) {
      trackInitiateCheckout(cart, cartSubtotal);
    }
  }, [settings]);

  const activeDistrictObj = useMemo(
    () => BANGLADESH_DISTRICTS.find((d) => d.name === district) || BANGLADESH_DISTRICTS[0],
    [district]
  );

  const handleDistrictChange = (nextDistrict: string) => {
    setDistrict(nextDistrict);
    const found = BANGLADESH_DISTRICTS.find((d) => d.name === nextDistrict);
    if (found && found.upazilas.length > 0) {
      setUpazila(found.upazilas[0]);
    } else {
      setUpazila('Other');
    }
  };

  const deliveryCharge = useMemo(() => {
    if (cart.length === 0) return 0;
    if (settings.freeDeliveryThreshold > 0 && cartSubtotal >= settings.freeDeliveryThreshold) {
      return 0;
    }
    return district.toLowerCase() === 'dhaka'
      ? settings.insideDhakaDelivery
      : settings.outsideDhakaDelivery;
  }, [cart.length, cartSubtotal, district, settings]);

  const grandTotal = cartSubtotal + deliveryCharge;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const resolvedUpazila =
      upazila === 'Other' ? customUpazila.trim() : upazila.trim();

    if (customerName.trim().length < 2) {
      setErrorMessage(
        t('Please enter your full name.', 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন।')
      );
      return;
    }

    const cleanDigits = mobileNumber.replace(/[^0-9]/g, '');
    if (!/^(?:88)?01[3-9]\d{8}$/.test(cleanDigits)) {
      setErrorMessage(
        t(
          'Please enter a valid 11-digit Bangladesh mobile number (e.g., 017XXXXXXXX).',
          'অনুগ্রহ করে সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।'
        )
      );
      return;
    }

    if (!district || !resolvedUpazila) {
      setErrorMessage(
        t('Please select both District and Upazila.', 'জেলা এবং উপজেলা নির্বাচন করুন।')
      );
      return;
    }

    if (fullAddress.trim().length < 6) {
      setErrorMessage(
        t(
          'Please provide your complete house, road, and area delivery address.',
          'অনুগ্রহ করে বাসা, রোড ও এলাকার সম্পূর্ণ ঠিকানা লিখুন।'
        )
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          mobileNumber: mobileNumber.trim(),
          district,
          upazila: resolvedUpazila,
          fullAddress: fullAddress.trim(),
          orderNotes: orderNotes.trim(),
          items: cart.map((item) => ({
            productId: item.productId,
            variation: item.variation,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.order) {
        throw new Error(data.error || 'Failed to submit order.');
      }

      trackPurchase(data.order);
      clearCart();
      await refreshStorefront();

      navigate(`/order-confirmation/${encodeURIComponent(data.order.orderNumber)}`, {
        state: { order: data.order },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center px-4 text-center bg-[#FCFBF8]">
        <h1 className="font-serif-display text-3xl font-semibold text-[#1C1917]">
          {t('No Items in Checkout', 'চেকআউটের জন্য কোনো পণ্য নেই')}
        </h1>
        <p className="text-sm text-[#78716C] mt-2">
          {t(
            'Add a jewellery piece to your bag before placing a Cash on Delivery order.',
            'অর্ডার করতে প্রথমে পছন্দের অলংকার ব্যাগে যোগ করুন।'
          )}
        </p>
        <Link
          to="/shop"
          className="mt-6 px-6 py-2.5 text-sm font-medium bg-[#1C1917] text-[#FCFBF8] rounded-lg hover:bg-[#9A7024]"
        >
          {t('Browse Jewellery', 'অলংকার দেখুন')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="mb-8">
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78716C] hover:text-[#1C1917] mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('Back to Shopping Cart', 'কার্টে ফিরে যান')}</span>
          </Link>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917]">
            {t('Cash on Delivery Checkout', 'চেকআউট ও ডেলিভারি তথ্য')}
          </h1>
          <p className="text-sm text-[#57534E] mt-1">
            {t(
              'Complete your delivery details below. Pay in cash only upon receiving your jewellery.',
              'নিচের ফর্মটি পূরণ করে অর্ডার সম্পন্ন করুন। পণ্য হাতে পেয়ে মূল্য পরিশোধ করবেন।'
            )}
          </p>
        </div>

        <form
          onSubmit={handleSubmitOrder}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          {/* Left Customer Delivery Information Form */}
          <div className="lg:col-span-7 bg-white border border-[#EAE2D3] rounded-2xl p-6 sm:p-8 space-y-5">
            <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917] pb-3 border-b border-[#F0E9DC]">
              {t('1. Customer & Delivery Address', '১. গ্রাহকের নাম ও ডেলিভারি ঠিকানা')}
            </h2>

            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800"
              >
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                  {t('Full Name *', 'পূর্ণ নাম *')}
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t('e.g., Ananya Rahman', 'আপনার পূর্ণ নাম লিখুন')}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FCFBF8] border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                  {t('Mobile Number (Bangladesh) *', 'মোবাইল নম্বর *')}
                </label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FCFBF8] border border-[#DFD5C3] rounded-xl font-tabular focus:outline-none focus:border-[#9A7024]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                  {t('District *', 'জেলা নির্বাচন করুন *')}
                </label>
                <select
                  value={district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FCFBF8] border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
                >
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d.name} value={d.name}>
                      {language === 'bn' ? `${d.nameBn} (${d.name})` : `${d.name} (${d.nameBn})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                  {t('Upazila / Thana *', 'উপজেলা / থানা *')}
                </label>
                <select
                  value={upazila}
                  onChange={(e) => setUpazila(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FCFBF8] border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
                >
                  {activeDistrictObj.upazilas.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  <option value="Other">{t('Other Upazila / Area', 'অন্যান্য থানা / এলাকা')}</option>
                </select>
              </div>
            </div>

            {upazila === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                  {t('Enter Upazila / Thana Name *', 'উপজেলা / থানার নাম লিখুন *')}
                </label>
                <input
                  type="text"
                  required
                  value={customUpazila}
                  onChange={(e) => setCustomUpazila(e.target.value)}
                  placeholder={t('Enter your Upazila or Thana', 'আপনার উপজেলার নাম')}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FCFBF8] border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                {t('Full Delivery Address *', 'সম্পূর্ণ ডেলিভারি ঠিকানা *')}
              </label>
              <textarea
                rows={3}
                required
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder={t(
                  'House No, Apartment, Road No, Block/Sector, Nearby Landmark...',
                  'বাসা নম্বর, ফ্ল্যাট, রোড নম্বর, এলাকা ও পরিচিত ল্যান্ডমার্ক লিখুন...'
                )}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FCFBF8] border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                {t('Special Delivery / Gift Note (Optional)', 'বিশেষ নির্দেশনা (ঐচ্ছিক)')}
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder={t(
                  'Preferred delivery time or bridal gift wrap note',
                  'ডেলিভারির সময় বা গিফট নোট থাকলে লিখুন'
                )}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FCFBF8] border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>

            {/* Payment Method Section (Strictly Cash on Delivery) */}
            <div className="pt-4 border-t border-[#F0E9DC]">
              <h3 className="font-serif-display text-xl font-semibold text-[#1C1917] mb-3">
                {t('2. Payment Method', '২. পেমেন্ট পদ্ধতি')}
              </h3>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FBF7EE] border border-[#D8C59E]">
                <CheckCircle2 className="w-5 h-5 text-[#9A7024] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#1C1917]">
                    {t('Cash on Delivery (COD) — BDT (৳)', 'ক্যাশ অন ডেলিভারি (পণ্য হাতে পেয়ে মূল্য পরিশোধ)')}
                  </p>
                  <p className="text-xs text-[#57534E] mt-1">
                    {t(
                      'Our representative will confirm your order by phone prior to insured dispatch. Pay the exact invoice total in BDT cash upon delivery.',
                      'অর্ডারটি পাঠানোর পূর্বে আমাদের প্রতিনিধি ফোনে কনফার্ম করবেন। ডেলিভারি ম্যানের কাছ থেকে অলংকার বুঝে নিয়ে নগদ টাকায় পরিশোধ করুন।'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Order Summary & Submit */}
          <div className="lg:col-span-5 bg-white border border-[#EAE2D3] rounded-2xl p-6 sm:p-8 space-y-5 lg:sticky lg:top-24">
            <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917] pb-3 border-b border-[#F0E9DC]">
              {t('Order Details', 'অর্ডার বিবরণী')}
            </h2>

            <div className="divide-y divide-[#F3EDE2] max-h-[340px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variation}`}
                  className="py-3.5 first:pt-0 flex items-center gap-3.5"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#F6F1E7] shrink-0">
                    <LuxuryImage
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1C1917] line-clamp-1">
                      {t(item.name, item.nameBn)}
                    </p>
                    <p className="text-xs text-[#78716C]">
                      {item.variation} · {t('Qty:', 'পরিমাণ:')} {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#1C1917] font-tabular shrink-0">
                    {formatBDT(item.unitPrice * item.quantity, language)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#EAE2D3] space-y-2.5 text-sm">
              <div className="flex justify-between text-[#57534E]">
                <span>{t('Subtotal', 'সাবটোটাল')}</span>
                <span className="font-medium text-[#1C1917] font-tabular">
                  {formatBDT(cartSubtotal, language)}
                </span>
              </div>
              <div className="flex justify-between text-[#57534E]">
                <span>
                  {t('Delivery Charge', 'ডেলিভারি চার্জ')} ({district})
                </span>
                <span className="font-medium text-[#1C1917] font-tabular">
                  {deliveryCharge === 0
                    ? t('Free', 'ফ্রি')
                    : formatBDT(deliveryCharge, language)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#EAE2D3] text-lg font-semibold text-[#1C1917]">
                <span>{t('Total Payable (COD)', 'সর্বমোট প্রদেয়')}</span>
                <span className="text-[#9A7024] font-tabular">
                  {formatBDT(grandTotal, language)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 text-sm font-semibold text-[#FCFBF8] bg-[#1C1917] hover:bg-[#9A7024] disabled:opacity-60 rounded-xl transition-colors cursor-pointer"
            >
              {submitting
                ? t('Confirming Your Order...', 'অর্ডার সম্পন্ন হচ্ছে...')
                : t(
                    `Confirm Order · ${formatBDT(grandTotal, language)}`,
                    `অর্ডার কনফার্ম করুন · ${formatBDT(grandTotal, language)}`
                  )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
