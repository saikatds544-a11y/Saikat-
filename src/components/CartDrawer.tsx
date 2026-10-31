import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT } from '../lib/formatters.ts';
import { LuxuryImage } from './LuxuryImage.tsx';

export function CartDrawer() {
  const {
    cart,
    cartSubtotal,
    settings,
    language,
    t,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartQuantity,
  } = useStore();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const estimatedDelivery =
    settings.freeDeliveryThreshold > 0 && cartSubtotal >= settings.freeDeliveryThreshold
      ? 0
      : settings.insideDhakaDelivery;
  const grandTotal = cart.length > 0 ? cartSubtotal + estimatedDelivery : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={t('Shopping Bag', 'শপিং ব্যাগ')}
      onClick={() => setIsCartOpen(false)}
    >
      <div
        className="relative flex h-full w-full max-w-md flex-col bg-[#FCFBF8] shadow-2xl border-l border-[#EAE2D3]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EAE2D3]">
          <div>
            <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
              {t('Your Jewellery Bag', 'আপনার শপিং ব্যাগ')}
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              {t('Cash on Delivery across Bangladesh', 'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-[#F5EFE6] transition-colors cursor-pointer"
            aria-label={t('Close bag', 'বন্ধ করুন')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-14 h-14 rounded-full bg-[#F5EFE6] flex items-center justify-center text-[#9A7024] mb-4">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="font-serif-display text-xl font-medium text-[#1C1917]">
                {t('Your bag is currently empty', 'আপনার শপিং ব্যাগ খালি')}
              </p>
              <p className="text-sm text-[#78716C] mt-1.5 max-w-xs">
                {t(
                  'Explore our handcrafted 22K gold necklaces, bridal sets, earrings, and bangles.',
                  'আমাদের হাতে গড়া নেকলেস, ব্রাইডাল সেট, কানের দুল ও বালা সংগ্রহ দেখুন।'
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/shop');
                }}
                className="mt-6 px-5 py-2.5 text-sm font-medium bg-[#1C1917] text-[#FCFBF8] rounded-lg hover:bg-[#332E2A] transition-colors cursor-pointer"
              >
                {t('Browse Collection', 'অলংকার দেখুন')}
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={`${item.productId}-${item.variation}`}
                className="flex gap-4 p-3.5 bg-white border border-[#EAE2D3] rounded-xl"
              >
                <Link
                  to={`/product/${item.slug}`}
                  onClick={() => setIsCartOpen(false)}
                  className="w-20 h-20 rounded-lg overflow-hidden bg-[#F6F1E7] shrink-0"
                >
                  <LuxuryImage
                    src={item.image}
                    alt={t(item.name, item.nameBn)}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={() => setIsCartOpen(false)}
                      className="font-serif-display text-base font-semibold text-[#1C1917] hover:text-[#9A7024] line-clamp-1"
                    >
                      {t(item.name, item.nameBn)}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.variation)}
                      className="p-1 text-[#A8A29E] hover:text-red-700 transition-colors cursor-pointer"
                      aria-label={t('Remove item', 'মুছে ফেলুন')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-[#78716C] mt-0.5 truncate">
                    {item.variation} · {item.productCode}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <div className="inline-flex items-center border border-[#E5DEC9] rounded-lg bg-[#FCFBF8]">
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQuantity(item.productId, item.variation, item.quantity - 1)
                        }
                        className="p-1.5 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-semibold font-tabular text-[#1C1917]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQuantity(item.productId, item.variation, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.maxStock}
                        className="p-1.5 text-[#57534E] hover:text-[#1C1917] disabled:opacity-40 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-sm font-semibold text-[#1C1917] font-tabular">
                      {formatBDT(item.unitPrice * item.quantity, language)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary */}
        {cart.length > 0 && (
          <div className="border-t border-[#EAE2D3] bg-white px-6 py-5 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#57534E]">
                <span>{t('Subtotal', 'সাবটোটাল')}</span>
                <span className="font-medium text-[#1C1917] font-tabular">
                  {formatBDT(cartSubtotal, language)}
                </span>
              </div>
              <div className="flex justify-between text-[#57534E]">
                <span>{t('Estimated Delivery (Dhaka)', 'আনুমানিক ডেলিভারি চার্জ')}</span>
                <span className="font-medium text-[#1C1917] font-tabular">
                  {estimatedDelivery === 0
                    ? t('Free', 'ফ্রি')
                    : formatBDT(estimatedDelivery, language)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#F0E9DC] text-base font-semibold text-[#1C1917]">
                <span>{t('Grand Total', 'সর্বমোট')}</span>
                <span className="font-tabular text-[#9A7024]">
                  {formatBDT(grandTotal, language)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                to="/cart"
                onClick={() => setIsCartOpen(false)}
                className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-medium text-[#1C1917] bg-[#F5EFE6] hover:bg-[#EAE0D0] rounded-lg transition-colors whitespace-nowrap"
              >
                {t('View Full Cart', 'সম্পূর্ণ কার্ট')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/checkout');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-[#FCFBF8] bg-[#1C1917] hover:bg-[#9A7024] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>{t('Checkout (COD)', 'চেকআউট')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
