import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, Printer, ArrowRight } from 'lucide-react';
import type { Order } from '../types/store.ts';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT } from '../lib/formatters.ts';
import { LuxuryImage } from '../components/LuxuryImage.tsx';

export function OrderConfirmationPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const location = useLocation();
  const { language, t, settings } = useStore();

  const [order, setOrder] = useState<Order | null>(
    (location.state as { order?: Order } | null)?.order || null
  );
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (!order && orderNumber) {
      fetch(`/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.order) setOrder(data.order);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [order, orderNumber]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#FCFBF8] text-sm text-[#78716C]">
        {t('Loading your official order receipt...', 'অর্ডার রিসিট লোড হচ্ছে...')}
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] bg-[#FCFBF8] py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-8">
        <div className="bg-white border border-[#EAE2D3] rounded-2xl p-6 sm:p-10 space-y-7">
          {/* Confirmation Header */}
          <div className="text-center space-y-2 pb-6 border-b border-[#F0E9DC]">
            <div className="w-14 h-14 rounded-full bg-[#FBF6EB] border border-[#E2CFA5] text-[#9A7024] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-xs uppercase tracking-widest text-[#8C6823] font-semibold">
              {t('Order Confirmed · Cash on Delivery', 'অর্ডার সফলভাবে সম্পন্ন হয়েছে')}
            </p>
            <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917]">
              {t('Thank You for Choosing Maa Lakshmi Alankar', 'মা লক্ষ্মী অলংকারে অর্ডারের জন্য ধন্যবাদ')}
            </h1>
            <p className="text-sm text-[#57534E] max-w-lg mx-auto">
              {t(
                'Your order has been permanently recorded. Our jewellery concierge will call your mobile number shortly to verify dispatch.',
                'আপনার অর্ডারটি সফলভাবে সংরক্ষিত হয়েছে। শীঘ্রই আমাদের প্রতিনিধি ফোনে যোগাযোগ করে ডেলিভারি কনফার্ম করবেন।'
              )}
            </p>
          </div>

          {/* Unique Order ID Highlight */}
          <div className="p-5 rounded-xl bg-[#F6F1E7] border border-[#E5DAC4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#78716C]">
                {t('Unique Order ID', 'আপনার অর্ডার আইডি')}
              </p>
              <p className="font-mono text-xl font-semibold text-[#1C1917] mt-0.5">
                {order?.orderNumber || orderNumber}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-[#78716C]">
                {t('Payment Method & Status', 'পেমেন্ট ও স্ট্যাটাস')}
              </p>
              <p className="text-sm font-semibold text-[#9A7024] mt-0.5">
                {t('Cash on Delivery', 'ক্যাশ অন ডেলিভারি')} · {order?.status || 'Pending'}
              </p>
            </div>
          </div>

          {/* Customer & Delivery Details */}
          {order && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
                    {t('Customer Information', 'গ্রাহকের তথ্য')}
                  </p>
                  <p className="font-semibold text-[#1C1917]">{order.customerName}</p>
                  <p className="text-[#44403C] font-tabular">{order.mobileNumber}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
                    {t('Delivery Destination', 'ডেলিভারি ঠিকানা')}
                  </p>
                  <p className="font-semibold text-[#1C1917]">
                    {order.upazila}, {order.district}
                  </p>
                  <p className="text-[#44403C]">{order.fullAddress}</p>
                </div>
              </div>

              {/* Ordered Items */}
              <div className="border-t border-[#F0E9DC] pt-5 space-y-3">
                <p className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
                  {t('Ordered Jewellery Pieces', 'অর্ডারকৃত অলংকার')}
                </p>
                <div className="divide-y divide-[#F3EDE2]">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#F6F1E7] shrink-0">
                        <LuxuryImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1C1917] truncate">
                          {t(item.name, item.nameBn)}
                        </p>
                        <p className="text-xs text-[#78716C]">
                          {item.variation} · {item.productCode} · {t('Qty:', 'পরিমাণ:')} {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[#1C1917] font-tabular">
                        {formatBDT(item.lineTotal, language)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-[#EAE2D3] pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#57534E]">
                  <span>{t('Subtotal', 'সাবটোটাল')}</span>
                  <span className="font-tabular">{formatBDT(order.subtotal, language)}</span>
                </div>
                <div className="flex justify-between text-[#57534E]">
                  <span>{t('Delivery Charge', 'ডেলিভারি চার্জ')}</span>
                  <span className="font-tabular">
                    {order.deliveryCharge === 0
                      ? t('Free', 'ফ্রি')
                      : formatBDT(order.deliveryCharge, language)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#F0E9DC] text-lg font-semibold text-[#1C1917]">
                  <span>{t('Total Payable on Delivery', 'সর্বমোট প্রদেয়')}</span>
                  <span className="text-[#9A7024] font-tabular">
                    {formatBDT(order.totalAmount, language)}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-[#F0E9DC] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#1C1917] bg-[#F5EFE6] hover:bg-[#EAE0D0] rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t('Print / Save Receipt', 'রিসিট প্রিন্ট করুন')}</span>
            </button>

            <div className="flex flex-wrap gap-2.5">
              <Link
                to={`/track-order?id=${encodeURIComponent(order?.orderNumber || orderNumber || '')}`}
                className="inline-flex items-center px-4 py-2.5 text-xs font-medium border border-[#DFD5C3] text-[#1C1917] hover:border-[#9A7024] rounded-lg transition-colors"
              >
                {t('Track Order Status', 'অর্ডার ট্র্যাক করুন')}
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium bg-[#1C1917] text-[#FCFBF8] hover:bg-[#9A7024] rounded-lg transition-colors"
              >
                <span>{t('Continue Shopping', 'আরও কেনাকাটা করুন')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <p className="text-xs text-[#78716C] text-center">
            {t('Need assistance? Call us at', 'যেকোনো প্রয়োজনে কল করুন:')}{' '}
            <span className="font-semibold text-[#1C1917] font-tabular">
              {settings.contactPhone}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
