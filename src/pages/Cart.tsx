import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, Heart, Bookmark, Tag, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../contexts/CartContext.tsx';
import { useWishlist } from '../contexts/WishlistContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { SeoHead } from '../components/common/SeoHead.tsx';
import { SmartImage } from '../components/common/SmartImage.tsx';
import { formatINR } from '../lib/format.ts';

export default function Cart() {
  const {
    items,
    savedForLater,
    subtotal,
    originalSubtotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    updateQuantity,
    removeItem,
    saveForLater,
    moveToCartFromSaved,
    removeSavedItem,
    settings,
  } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const productSavings = Math.max(0, originalSubtotal - subtotal);
  const couponDiscount = appliedCoupon?.discount || 0;
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const shippingFee =
    items.length === 0
      ? 0
      : discountedSubtotal >= settings.free_shipping_threshold
        ? 0
        : settings.standard_shipping_fee;
  const taxAmount = Math.round((discountedSubtotal * settings.tax_rate_percent) / 100);
  const finalTotal = discountedSubtotal + shippingFee + taxAmount;
  const remainingForFree = Math.max(0, settings.free_shipping_threshold - discountedSubtotal);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      await applyCoupon(couponInput.trim());
      showToast(`Coupon ${couponInput.trim().toUpperCase()} applied`);
      setCouponInput('');
    } catch (err: any) {
      showToast(err.message || 'Invalid coupon code', 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <>
      <SeoHead title="Shopping Bag" description="Review your ATELIER bag, apply promo codes, and proceed to secure checkout." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex items-end justify-between border-b border-[#E8E8E5] pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Your Selection</p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-[#171717]">Shopping Bag</h1>
          </div>
          <Link to="/shop" className="text-xs font-semibold text-[#171717] hover:underline">
            Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="my-12 rounded-3xl border border-[#E8E8E5] bg-white py-16 px-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F2F2EF]">
              <ShoppingBag className="h-6 w-6 text-[#777777]" />
            </div>
            <h2 className="font-display text-xl font-semibold text-[#171717]">Your shopping bag is empty</h2>
            <p className="mt-2 text-sm text-[#777777] max-w-md mx-auto">
              Add essentials, outerwear, or footwear to begin checkout.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#171717] px-7 py-3 text-xs font-semibold text-white"
            >
              Explore Collection <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Cart Items */}
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-2xl border border-[#E8E8E5] bg-[#F2F2EF]/60 px-5 py-3.5">
                <p className="text-xs font-medium text-[#171717]">
                  {remainingForFree === 0
                    ? 'Complimentary standard shipping unlocked on this order.'
                    : `Add ${formatINR(remainingForFree)} more to unlock free standard shipping.`}
                </p>
              </div>

              <div className="divide-y divide-[#E8E8E5] rounded-3xl border border-[#E8E8E5] bg-white px-6">
                {items.map((item) => (
                  <div key={item.product_variant_id} className="flex flex-col sm:flex-row gap-5 py-6">
                    <Link
                      to={`/product/${item.product_slug}`}
                      className="h-32 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#F2F2EF] border border-[#E8E8E5]"
                    >
                      <SmartImage src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" />
                    </Link>

                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-[#777777]">
                            {item.brand}
                          </p>
                          <Link
                            to={`/product/${item.product_slug}`}
                            className="text-base font-semibold text-[#171717] hover:underline"
                          >
                            {item.product_name}
                          </Link>
                          <p className="mt-1 text-xs text-[#777777]">
                            Size {item.selected_size} · {item.selected_color}
                          </p>
                        </div>
                        <div className="text-right tabular-nums">
                          <p className="text-base font-semibold text-[#171717]">
                            {formatINR(item.unit_price * item.quantity)}
                          </p>
                          {item.original_price > item.unit_price && (
                            <p className="text-xs text-[#777777] line-through">
                              {formatINR(item.original_price * item.quantity)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-full border border-[#E8E8E5] bg-[#FAFAF8]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product_variant_id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="p-2 text-[#171717] hover:bg-[#F2F2EF] rounded-full"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-3 text-xs font-semibold tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            disabled={item.quantity >= item.stock_quantity}
                            onClick={() => updateQuantity(item.product_variant_id, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="p-2 text-[#171717] hover:bg-[#F2F2EF] rounded-full disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-medium text-[#777777]">
                          <button
                            type="button"
                            onClick={async () => {
                              await saveForLater(item);
                              showToast('Saved for later', 'info');
                            }}
                            className="inline-flex items-center gap-1 hover:text-[#171717]"
                          >
                            <Bookmark className="h-3.5 w-3.5" /> Save for later
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!isWishlisted(item.product_id)) {
                                await toggleWishlist(item.product_id);
                              }
                              await removeItem(item.product_variant_id);
                              showToast('Moved to wishlist', 'info');
                            }}
                            className="inline-flex items-center gap-1 hover:text-[#171717]"
                          >
                            <Heart className="h-3.5 w-3.5" /> Move to wishlist
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.product_variant_id)}
                            className="inline-flex items-center gap-1 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <aside className="lg:col-span-4">
              <div className="sticky top-24 rounded-3xl border border-[#E8E8E5] bg-white p-6 space-y-5">
                <h2 className="font-display text-xl font-bold text-[#171717]">Order Summary</h2>

                {/* Coupon Form */}
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <label htmlFor="cart-coupon" className="text-xs font-semibold uppercase tracking-wider text-[#777777]">
                    Promo Code
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#777777]" />
                      <input
                        id="cart-coupon"
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="WELCOME10 / ATELIER20"
                        className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] pl-9 pr-3 py-2.5 text-xs uppercase text-[#171717] focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={couponLoading}
                      className="rounded-xl bg-[#171717] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2a2a2a]"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-[11px] text-[#777777]">
                    Available codes: WELCOME10 · ATELIER20 · FIRSTORDER
                  </p>
                </form>

                {appliedCoupon && (
                  <div className="flex items-center justify-between rounded-xl bg-[#B8F56A]/35 px-3 py-2 text-xs font-medium text-[#171717]">
                    <span>Applied: {appliedCoupon.code}</span>
                    <button type="button" onClick={removeCoupon} className="underline hover:no-underline">
                      Remove
                    </button>
                  </div>
                )}

                <div className="space-y-2.5 border-t border-[#E8E8E5] pt-4 text-sm tabular-nums">
                  <div className="flex justify-between text-[#777777]">
                    <span>Subtotal</span>
                    <span className="text-[#171717]">{formatINR(subtotal)}</span>
                  </div>
                  {productSavings > 0 && (
                    <div className="flex justify-between text-emerald-700 text-xs">
                      <span>Markdown Savings</span>
                      <span>-{formatINR(productSavings)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Coupon Discount</span>
                      <span>-{formatINR(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#777777]">
                    <span>Shipping</span>
                    <span className="text-[#171717]">
                      {shippingFee === 0 ? 'Free' : formatINR(shippingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#777777]">
                    <span>Estimated GST ({settings.tax_rate_percent}%)</span>
                    <span className="text-[#171717]">{formatINR(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E8E8E5] pt-3 text-base font-bold text-[#171717]">
                    <span>Total Payable</span>
                    <span>{formatINR(finalTotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#171717] py-3.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2a2a2a] transition-colors"
                >
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Saved for later */}
        {savedForLater.length > 0 && (
          <section className="mt-16 border-t border-[#E8E8E5] pt-12">
            <h2 className="font-display text-2xl font-bold text-[#171717] mb-6">
              Saved for Later ({savedForLater.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {savedForLater.map((item) => (
                <div key={item.product_variant_id} className="rounded-2xl border border-[#E8E8E5] bg-white p-4 flex flex-col justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="h-20 w-16 rounded-xl overflow-hidden bg-[#F2F2EF] shrink-0">
                      <SmartImage src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#171717] truncate">{item.product_name}</p>
                      <p className="text-xs text-[#777777]">Size {item.selected_size} · {item.selected_color}</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">{formatINR(item.unit_price)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveToCartFromSaved(item)}
                      className="flex-1 rounded-full bg-[#171717] py-2 text-xs font-semibold text-white"
                    >
                      Move to Bag
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSavedItem(item.product_variant_id)}
                      className="rounded-full border border-[#E8E8E5] px-3 py-2 text-xs text-[#777777] hover:text-[#171717]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
