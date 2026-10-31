import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Order, OrderStatus } from '../types/store.ts';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT } from '../lib/formatters.ts';
import { trackPageView, updateDocumentSeo } from '../lib/analytics.ts';

const STATUS_STEPS: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
];

export function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const { language, t, settings } = useStore();

  const [orderNumber, setOrderNumber] = useState(searchParams.get('id') || '');
  const [mobileNumber, setMobileNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const title = `${t('Track Your Order', 'অর্ডার ট্র্যাকিং')} – ${settings.websiteName}`;
    updateDocumentSeo({
      title,
      description: settings.seoMetaDescription,
      productSchema: null,
    });
    trackPageView('/track-order', title);
  }, [settings, t]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const qs = new URLSearchParams({
        orderNumber: orderNumber.trim(),
        mobile: mobileNumber.trim(),
      });
      const res = await fetch(`/api/orders/track?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(
          data.error ||
            t(
              'Order not found. Please check your Order ID and Mobile Number.',
              'অর্ডারটি খুঁজে পাওয়া যায়নি। অর্ডার আইডি এবং মোবাইল নম্বর যাচাই করুন।'
            )
        );
      } else {
        setOrder(data.order);
      }
    } catch {
      setError(t('Unable to check order status right now.', 'এই মুহূর্তে তথ্য লোড করা যাচ্ছে না।'));
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;

  return (
    <div className="min-h-[75vh] bg-[#FCFBF8] py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-wider text-[#8C6823] font-medium">
            {t('Cash on Delivery Dispatch Tracker', 'লাইভ অর্ডার স্ট্যাটাস')}
          </p>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917]">
            {t('Track Your Jewellery Order', 'আপনার অর্ডার ট্র্যাক করুন')}
          </h1>
          <p className="text-sm text-[#57534E] max-w-lg mx-auto">
            {t(
              'Enter your unique Order ID (e.g., MLA-20261031-9035) and mobile number to view real-time preparation and courier status.',
              'আপনার অর্ডার আইডি (যেমন: MLA-20261031-9035) ও মোবাইল নম্বর দিয়ে বর্তমান অবস্থা দেখুন।'
            )}
          </p>
        </div>

        <form
          onSubmit={handleTrack}
          className="bg-white border border-[#EAE2D3] rounded-2xl p-6 sm:p-8 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                {t('Order ID *', 'অর্ডার আইডি *')}
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="MLA-20261031-XXXX"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FCFBF8] border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                {t('Customer Mobile Number (Optional)', 'মোবাইল নম্বর (ঐচ্ছিক)')}
              </label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3.5 py-2.5 text-sm font-tabular bg-[#FCFBF8] border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-[#1C1917] hover:bg-[#9A7024] text-[#FCFBF8] rounded-xl transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? t('Checking...', 'খোঁজা হচ্ছে...') : t('Check Order Status', 'স্ট্যাটাস দেখুন')}</span>
          </button>

          {error && (
            <p className="text-xs sm:text-sm text-red-700 pt-2" role="alert">
              {error}
            </p>
          )}
        </form>

        {order && (
          <div className="bg-white border border-[#EAE2D3] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-[#F0E9DC]">
              <div>
                <p className="text-xs text-[#78716C]">{t('Order ID', 'অর্ডার আইডি')}</p>
                <p className="font-mono text-lg font-semibold text-[#1C1917]">
                  {order.orderNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#78716C]">{t('Current Status', 'বর্তমান অবস্থা')}</p>
                <p
                  className={`text-base font-semibold ${
                    order.status === 'Cancelled' ? 'text-red-700' : 'text-[#9A7024]'
                  }`}
                >
                  {order.status}
                </p>
              </div>
            </div>

            {order.status !== 'Cancelled' ? (
              <div className="grid grid-cols-5 gap-2 text-center pt-2">
                {STATUS_STEPS.map((step, idx) => {
                  const completed = idx <= currentStepIndex;
                  return (
                    <div key={step} className="space-y-2">
                      <div
                        className={`h-2 rounded-full ${
                          completed ? 'bg-[#9A7024]' : 'bg-[#EDE6D8]'
                        }`}
                      />
                      <p
                        className={`text-[11px] sm:text-xs font-medium ${
                          completed ? 'text-[#1C1917]' : 'text-[#A8A29E]'
                        }`}
                      >
                        {step}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                {t(
                  'This order has been cancelled. Please contact our concierge if you wish to place a new order.',
                  'এই অর্ডারটি বাতিল করা হয়েছে। বিস্তারিত জানতে আমাদের হেল্পলাইনে যোগাযোগ করুন।'
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#F0E9DC] text-sm">
              <div>
                <p className="text-xs text-[#78716C]">{t('Recipient', 'গ্রাহক')}</p>
                <p className="font-medium text-[#1C1917]">{order.customerName}</p>
                <p className="text-xs text-[#57534E]">
                  {order.upazila}, {order.district}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-[#78716C]">
                  {t('Total Payable (Cash on Delivery)', 'সর্বমোট প্রদেয়')}
                </p>
                <p className="text-lg font-semibold text-[#1C1917] font-tabular">
                  {formatBDT(order.totalAmount, language)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
