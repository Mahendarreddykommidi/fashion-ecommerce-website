import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Heart,
  Minus,
  Plus,
  Ruler,
  Star,
  Truck,
  ShieldCheck,
  ChevronRight,
  ZoomIn,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { useCart } from '../contexts/CartContext.tsx';
import { useWishlist } from '../contexts/WishlistContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { SeoHead } from '../components/common/SeoHead.tsx';
import { SmartImage } from '../components/common/SmartImage.tsx';
import { ProductCard } from '../components/products/ProductCard.tsx';
import { calcDiscountPercent, cn, formatDate, formatINR } from '../lib/format.ts';
import type { Product, Review } from '../types/ecommerce.ts';

const RECENTLY_VIEWED_KEY = 'atelier_recently_viewed_v1';

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setActiveImageIdx(0);
    setQuantity(1);
    setSelectedSize('');

    apiFetch<{ product: Product; reviews: Review[]; related: Product[] }>(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        setProduct(res.product);
        setReviews(res.reviews);
        setRelated(res.related);

        const firstAvail = res.product.variants.find((v) => v.stock_quantity > 0) || res.product.variants[0];
        if (firstAvail) {
          setSelectedColor(firstAvail.color);
          if (new Set(res.product.variants.map((v) => v.size)).size === 1) {
            setSelectedSize(firstAvail.size);
          }
        }

        // Update recently viewed
        try {
          const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
          const prev: Product[] = raw ? JSON.parse(raw) : [];
          const filtered = prev.filter((p) => p.id !== res.product.id);
          setRecentlyViewed(filtered.slice(0, 4));
          const updated = [res.product, ...filtered].slice(0, 6);
          localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
      })
      .catch((err: any) => setError(err.message || 'Product not found.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-12 gap-10 animate-pulse">
          <div className="lg:col-span-7 aspect-[3/4] rounded-3xl bg-[#F2F2EF]" />
          <div className="lg:col-span-5 space-y-4">
            <div className="h-4 w-24 rounded bg-[#F2F2EF]" />
            <div className="h-9 w-3/4 rounded bg-[#F2F2EF]" />
            <div className="h-6 w-1/3 rounded bg-[#F2F2EF]" />
            <div className="h-24 w-full rounded bg-[#F2F2EF]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-[#171717]">Piece Not Found</h1>
        <p className="mt-2 text-sm text-[#777777]">{error || 'This item is no longer available.'}</p>
        <Link
          to="/shop"
          className="mt-6 inline-block rounded-full bg-[#171717] px-6 py-3 text-xs font-semibold text-white"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  const uniqueColors = Array.from(new Map(product.variants.map((v) => [v.color, v])).values());
  const uniqueSizes = Array.from(new Set(product.variants.map((v) => v.size)));
  const activeVariant = product.variants.find(
    (v) => v.color === selectedColor && v.size === selectedSize
  );
  const priceReferenceVariant = activeVariant || product.variants.find((v) => v.color === selectedColor) || product.variants[0];
  const effectivePrice = (product.sale_price ?? product.base_price) + (priceReferenceVariant?.price_adjustment || 0);
  const originalPrice = product.base_price + (priceReferenceVariant?.price_adjustment || 0);
  const discountPct = calcDiscountPercent(originalPrice, effectivePrice < originalPrice ? effectivePrice : null);
  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = async (goToCheckout = false) => {
    if (!selectedSize) {
      showToast('Please select a size first.', 'error');
      return;
    }
    if (!activeVariant || activeVariant.stock_quantity < 1) {
      showToast('This size/color combination is out of stock.', 'error');
      return;
    }
    try {
      await addToCart(product, activeVariant, quantity, !goToCheckout);
      if (goToCheckout) {
        navigate('/checkout');
      } else {
        showToast(`Added ${product.name} (${selectedSize}) to bag`);
      }
    } catch (err: any) {
      showToast(err.message || 'Could not add item to bag', 'error');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await apiFetch<{ review: Review }>('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      setReviews((prev) => [res.review, ...prev]);
      setReviewComment('');
      showToast('Thank you for reviewing this piece.');
    } catch (err: any) {
      showToast(err.message || 'Could not submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <>
      <SeoHead
        title={`${product.name} — ${product.brand}`}
        description={product.description}
        canonicalPath={`/product/${product.slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          brand: { '@type': 'Brand', name: product.brand },
          description: product.description,
          image: product.images.map((i) => i.image_url),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: effectivePrice,
            availability:
              product.variants.some((v) => v.stock_quantity > 0)
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
          },
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[#777777]">
          <Link to="/" className="hover:text-[#171717]">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/shop" className="hover:text-[#171717]">Shop</Link>
          {product.category_name && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to={`/shop?category=${product.category_slug}`} className="hover:text-[#171717]">
                {product.category_name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[#171717] font-medium truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Left: Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-[#F2F2EF] border border-[#E8E8E5]">
              <SmartImage
                src={product.images[activeImageIdx]?.image_url}
                alt={`${product.name} view ${activeImageIdx + 1}`}
                loading="eager"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label="Zoom product image"
                className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#171717] shadow-sm hover:bg-white"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={cn(
                      'h-24 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-[#F2F2EF] transition-all',
                      activeImageIdx === idx ? 'border-[#171717]' : 'border-transparent opacity-70 hover:opacity-100'
                    )}
                  >
                    <SmartImage src={img.image_url} alt={`${product.name} thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Sticky Purchase Module */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#777777]">
                    {product.brand} · {product.collection}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#171717] tabular-nums">
                    <Star className="h-3.5 w-3.5 fill-[#171717]" />
                    {product.rating_avg.toFixed(1)}
                    <span className="text-[#777777]">({product.review_count} reviews)</span>
                  </span>
                </div>

                <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#171717]">
                  {product.name}
                </h1>

                <div className="mt-4 flex items-baseline gap-3 tabular-nums">
                  <span className="text-2xl font-bold text-[#171717]">{formatINR(effectivePrice)}</span>
                  {discountPct > 0 && (
                    <>
                      <span className="text-base text-[#777777] line-through">{formatINR(originalPrice)}</span>
                      <span className="rounded-md bg-[#B8F56A] px-2 py-0.5 text-xs font-bold text-[#171717]">
                        Save {discountPct}%
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#777777]">Inclusive of all taxes</p>
              </div>

              <p className="text-sm leading-relaxed text-[#171717]/85">{product.description}</p>

              {/* Color Selection */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-2.5">
                  Color: <span className="font-normal text-[#777777]">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {uniqueColors.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setSelectedColor(c.color)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                        selectedColor === c.color
                          ? 'border-[#171717] bg-[#171717] text-white'
                          : 'border-[#E8E8E5] bg-white text-[#171717] hover:border-[#171717]'
                      )}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-black/20"
                        style={{ backgroundColor: c.color_hex }}
                      />
                      {c.color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selection (Mandatory) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                    Select Size {selectedSize ? `· ${selectedSize}` : '(Required)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#777777] hover:text-[#171717] underline"
                  >
                    <Ruler className="h-3.5 w-3.5" /> Size Guide
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {uniqueSizes.map((sz) => {
                    const variantForSize = product.variants.find(
                      (v) => v.color === selectedColor && v.size === sz
                    );
                    const inStock = Boolean(variantForSize && variantForSize.stock_quantity > 0);
                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={!inStock}
                        onClick={() => {
                          setSelectedSize(sz);
                          setQuantity(1);
                        }}
                        className={cn(
                          'rounded-xl border py-2.5 text-xs font-semibold transition-colors',
                          selectedSize === sz
                            ? 'border-[#171717] bg-[#171717] text-white'
                            : 'border-[#E8E8E5] bg-white text-[#171717] hover:border-[#171717]',
                          !inStock && 'opacity-35 line-through cursor-not-allowed'
                        )}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
                {activeVariant && (
                  <p className="mt-2 text-xs text-[#777777] tabular-nums">
                    {activeVariant.stock_quantity > 5
                      ? `In stock (${activeVariant.stock_quantity} available)`
                      : activeVariant.stock_quantity > 0
                        ? `Low stock — only ${activeVariant.stock_quantity} left`
                        : 'Out of stock'}
                  </p>
                )}
              </div>

              {/* Quantity & Action Buttons */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center rounded-full border border-[#E8E8E5] bg-white px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                      className="p-2 text-[#171717] hover:bg-[#F2F2EF] rounded-full"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                    <button
                      type="button"
                      disabled={!activeVariant || quantity >= activeVariant.stock_quantity}
                      onClick={() =>
                        setQuantity((q) =>
                          activeVariant ? Math.min(activeVariant.stock_quantity, q + 1) : q + 1
                        )
                      }
                      aria-label="Increase quantity"
                      className="p-2 text-[#171717] hover:bg-[#F2F2EF] rounded-full disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(false)}
                    className="flex-1 rounded-full bg-[#171717] py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2a2a2a] transition-colors"
                  >
                    ADD TO CART
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const added = await toggleWishlist(product.id);
                      showToast(added ? 'Saved to wishlist' : 'Removed from wishlist', 'info');
                    }}
                    aria-label="Toggle wishlist"
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#E8E8E5] bg-white text-[#171717] hover:border-[#171717]',
                      wishlisted && 'bg-[#171717] text-white border-[#171717]'
                    )}
                  >
                    <Heart className={cn('h-4 w-4', wishlisted && 'fill-current')} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddToCart(true)}
                  className="w-full rounded-full border border-[#171717] bg-[#B8F56A] py-3.5 text-xs font-bold uppercase tracking-wider text-[#171717] hover:brightness-95 transition-all"
                >
                  BUY NOW
                </button>
              </div>

              {/* Delivery & Trust */}
              <div className="rounded-2xl border border-[#E8E8E5] bg-[#F2F2EF]/60 p-4 space-y-2.5 text-xs text-[#171717]">
                <div className="flex items-center gap-2.5">
                  <Truck className="h-4 w-4 text-[#777777] shrink-0" />
                  <span>Free standard shipping on orders above ₹1,999 · Estimated delivery in 3–5 business days.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#777777] shrink-0" />
                  <span>14-day easy returns &amp; exchanges on unworn pieces with tags intact.</span>
                </div>
              </div>

              {/* Fabric, Care & Details */}
              <div className="divide-y divide-[#E8E8E5] border-t border-b border-[#E8E8E5]">
                <details open className="py-3.5 group">
                  <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#171717]">
                    Fabric &amp; Composition
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-[#777777]">{product.fabric_info}</p>
                </details>
                <details className="py-3.5 group">
                  <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#171717]">
                    Material &amp; Care
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-[#777777]">{product.care_info}</p>
                </details>
                <details className="py-3.5 group">
                  <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#171717]">
                    Shipping &amp; Returns
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-[#777777]">
                    Orders placed before 2:00 PM IST dispatch the same business day. Complimentary size exchanges within 14 days of delivery.
                  </p>
                </details>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews */}
        <section className="mt-20 border-t border-[#E8E8E5] pt-14">
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <h2 className="font-display text-2xl font-bold text-[#171717]">Customer Reviews</h2>
              <div className="mt-3 flex items-center gap-3">
                <span className="font-display text-4xl font-bold tabular-nums">{product.rating_avg.toFixed(1)}</span>
                <div>
                  <div className="flex items-center gap-0.5 text-[#171717]">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn('h-4 w-4', n <= Math.round(product.rating_avg) && 'fill-[#171717]')}
                      />
                    ))}
                  </div>
                  <p className="mt-0.5 text-xs text-[#777777]">{product.review_count} verified ratings</p>
                </div>
              </div>

              <form onSubmit={handleReviewSubmit} className="mt-6 rounded-2xl border border-[#E8E8E5] bg-white p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#171717]">Write a Review</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewRating(n)}
                      aria-label={`Rate ${n} stars`}
                      className="p-0.5"
                    >
                      <Star className={cn('h-5 w-5', n <= reviewRating ? 'fill-[#171717] text-[#171717]' : 'text-[#D4D4CE]')} />
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={user ? 'Share fit, fabric feel, and sizing notes...' : 'Sign in to publish a review...'}
                  className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] p-3 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full rounded-full bg-[#171717] py-2.5 text-xs font-semibold text-white hover:bg-[#2a2a2a]"
                >
                  {user ? (submittingReview ? 'Submitting...' : 'Submit Review') : 'Sign In to Review'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 space-y-4">
              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-[#E8E8E5] bg-white p-8 text-center text-sm text-[#777777]">
                  Be the first customer to review this piece.
                </div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="rounded-2xl border border-[#E8E8E5] bg-white p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#171717]">{rev.user_name}</span>
                        <span className="text-xs text-[#777777]">· {formatDate(rev.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={cn('h-3.5 w-3.5', n <= rev.rating ? 'fill-[#171717]' : 'text-[#E8E8E5]')} />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2.5 text-sm leading-relaxed text-[#171717]/85">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-20 border-t border-[#E8E8E5] pt-14">
            <h2 className="font-display text-2xl font-bold text-[#171717] mb-8">Pairs Well With</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <section className="mt-16 border-t border-[#E8E8E5] pt-14">
            <h2 className="font-display text-2xl font-bold text-[#171717] mb-8">Recently Viewed</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {recentlyViewed.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Image Zoom Modal */}
      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Close zoom"
            className="absolute top-5 right-5 rounded-full bg-white p-2 text-[#171717]"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={product.images[activeImageIdx]?.image_url}
            alt={product.name}
            className="max-h-[90vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Size Guide Modal */}
      {sizeGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSizeGuideOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl border border-[#E8E8E5]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">ATELIER Size Guide (cm / inches)</h3>
              <button type="button" onClick={() => setSizeGuideOpen(false)} className="p-1 rounded-full hover:bg-[#F2F2EF]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <table className="w-full text-xs text-left border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-[#E8E8E5] text-[#777777]">
                  <th className="py-2">Size</th>
                  <th className="py-2">Chest (in)</th>
                  <th className="py-2">Waist (in)</th>
                  <th className="py-2">Length (cm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E5]">
                <tr><td className="py-2 font-semibold">XS</td><td>34–36</td><td>27–28</td><td>67</td></tr>
                <tr><td className="py-2 font-semibold">S</td><td>36–38</td><td>29–30</td><td>69</td></tr>
                <tr><td className="py-2 font-semibold">M</td><td>38–40</td><td>31–32</td><td>71</td></tr>
                <tr><td className="py-2 font-semibold">L</td><td>40–42</td><td>33–34</td><td>73</td></tr>
                <tr><td className="py-2 font-semibold">XL</td><td>42–45</td><td>35–37</td><td>75</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
