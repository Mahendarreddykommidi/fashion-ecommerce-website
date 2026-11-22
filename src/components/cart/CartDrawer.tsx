import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Bookmark } from 'lucide-react';
import { useCart } from '../../contexts/CartContext.tsx';
import { SmartImage } from '../common/SmartImage.tsx';
import { formatINR } from '../../lib/format.ts';

export function CartDrawer() {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    subtotal,
    appliedCoupon,
    updateQuantity,
    removeItem,
    saveForLater,
    settings,
  } = useCart();
  const navigate = useNavigate();

  if (!isDrawerOpen) return null;

  const discountedSubtotal = Math.max(0, subtotal - (appliedCoupon?.discount || 0));
  const threshold = settings.free_shipping_threshold;
  const remainingForFree = Math.max(0, threshold - discountedSubtotal);
  const progressPct = Math.min(100, Math.round((discountedSubtotal / Math.max(1, threshold)) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
      className="fixed inset-0 z-50 flex justify-end bg-[#171717]/40 backdrop-blur-xs"
      onClick={closeDrawer}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-[#FAFAF8] shadow-2xl border-l border-[#E8E8E5]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E8E8E5] px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-[#171717]">Shopping Bag</h2>
            <span className="text-xs text-[#777777] tabular-nums">
              ({items.reduce((s, i) => s + i.quantity, 0)})
            </span>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close bag"
            className="rounded-full p-1.5 text-[#171717] hover:bg-[#F2F2EF]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free shipping indicator */}
        <div className="border-b border-[#E8E8E5] bg-[#F2F2EF]/60 px-6 py-3">
          <p className="text-xs font-medium text-[#171717] mb-2">
            {remainingForFree === 0
              ? 'You unlocked complimentary standard shipping.'
              : `Add ${formatINR(remainingForFree)} more for complimentary shipping.`}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8E8E5]">
            <div
              className="h-full bg-[#171717] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F2F2EF]">
                <ShoppingBag className="h-6 w-6 text-[#777777]" />
              </div>
              <p className="text-base font-semibold text-[#171717]">Your bag is empty</p>
              <p className="mt-1 text-sm text-[#777777] max-w-xs">
                Explore our latest essentials and curated seasonal collections.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  navigate('/shop');
                }}
                className="mt-5 rounded-full bg-[#171717] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#2a2a2a]"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#E8E8E5]">
              {items.map((item) => (
                <li key={item.product_variant_id} className="flex gap-4 py-4">
                  <Link
                    to={`/product/${item.product_slug}`}
                    onClick={closeDrawer}
                    className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F2F2EF] border border-[#E8E8E5]"
                  >
                    <SmartImage
                      src={item.image_url}
                      alt={item.product_name}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/product/${item.product_slug}`}
                          onClick={closeDrawer}
                          className="text-sm font-semibold text-[#171717] truncate hover:underline"
                        >
                          {item.product_name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product_variant_id)}
                          aria-label={`Remove ${item.product_name}`}
                          className="text-[#777777] hover:text-red-600 p-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-[#777777]">
                        Size {item.selected_size} · {item.selected_color}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-lg border border-[#E8E8E5] bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_variant_id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="p-1.5 text-[#171717] hover:bg-[#F2F2EF]"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2.5 text-xs font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={item.quantity >= item.stock_quantity}
                          onClick={() => updateQuantity(item.product_variant_id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="p-1.5 text-[#171717] hover:bg-[#F2F2EF] disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => saveForLater(item)}
                          title="Save for later"
                          className="text-[11px] font-medium text-[#777777] hover:text-[#171717] inline-flex items-center gap-1"
                        >
                          <Bookmark className="h-3 w-3" />
                          Save
                        </button>
                        <span className="text-sm font-semibold text-[#171717] tabular-nums">
                          {formatINR(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#E8E8E5] bg-white px-6 py-5 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-[#777777]">
                <span>Subtotal</span>
                <span className="tabular-nums text-[#171717] font-medium">{formatINR(subtotal)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-emerald-700 text-xs">
                  <span>Coupon ({appliedCoupon.code})</span>
                  <span className="tabular-nums">-{formatINR(appliedCoupon.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-semibold text-[#171717] pt-1">
                <span>Estimated Total</span>
                <span className="tabular-nums text-base">{formatINR(discountedSubtotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  navigate('/cart');
                }}
                className="rounded-full border border-[#171717] px-4 py-3 text-xs font-semibold text-[#171717] hover:bg-[#F2F2EF] transition-colors"
              >
                View Bag
              </button>
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  navigate('/checkout');
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#171717] px-4 py-3 text-xs font-semibold text-white hover:bg-[#2a2a2a] transition-colors"
              >
                Checkout <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
