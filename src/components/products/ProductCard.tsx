import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, Star, Check } from 'lucide-react';
import { SmartImage } from '../common/SmartImage.tsx';
import { useCart } from '../../contexts/CartContext.tsx';
import { useWishlist } from '../../contexts/WishlistContext.tsx';
import { useToast } from '../../contexts/ToastContext.tsx';
import { calcDiscountPercent, cn, formatINR } from '../../lib/format.ts';
import type { Product } from '../../types/ecommerce.ts';

interface ProductCardProps {
  product: Product;
  showRating?: boolean;
}

export function ProductCard({ product, showRating = false }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const wishlisted = isWishlisted(product.id);
  const primaryImage = product.images[0]?.image_url || '';
  const secondaryImage = product.images[1]?.image_url || primaryImage;
  const effectivePrice = product.sale_price ?? product.base_price;
  const discountPct = calcDiscountPercent(product.base_price, product.sale_price);

  const uniqueColors = Array.from(
    new Map(product.variants.map((v) => [v.color, v])).values()
  );
  const uniqueSizes = Array.from(new Set(product.variants.map((v) => v.size)));
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock_quantity, 0);

  const singleTag = product.new_arrival
    ? 'New Arrival'
    : product.bestseller
      ? 'Best Seller'
      : discountPct > 0
        ? `-${discountPct}%`
        : null;

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const added = await toggleWishlist(product.id);
      showToast(
        added ? `${product.name} saved to wishlist` : `${product.name} removed from wishlist`,
        'info'
      );
    } catch {
      showToast('Could not update wishlist', 'error');
    }
  };

  const handleQuickAddSize = async (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    e.stopPropagation();
    const variant =
      product.variants.find((v) => v.size === size && v.stock_quantity > 0) ||
      product.variants.find((v) => v.stock_quantity > 0);
    if (!variant) {
      showToast('This item is currently out of stock', 'error');
      return;
    }
    setAdding(true);
    try {
      await addToCart(product, variant, 1, true);
      showToast(`Added ${product.name} (${variant.size}) to bag`);
      setQuickAddOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Unable to add item', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleQuickAddClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uniqueSizes.length === 1) {
      await handleQuickAddSize(e, uniqueSizes[0]);
      return;
    }
    setQuickAddOpen((prev) => !prev);
  };

  return (
    <article className="group flex flex-col">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#F2F2EF] border border-[#E8E8E5]/80 transition-transform duration-300 group-hover:-translate-y-0.5">
        <Link to={`/product/${product.slug}`} className="block h-full w-full">
          <SmartImage
            src={primaryImage}
            alt={product.name}
            fallbackTitle={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {secondaryImage && secondaryImage !== primaryImage && (
            <SmartImage
              src={secondaryImage}
              alt={`${product.name} alternate view`}
              fallbackTitle={product.name}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          )}
        </Link>

        {singleTag && (
          <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-white/92 backdrop-blur-xs px-2.5 py-1 text-[11px] font-medium tracking-wide text-[#171717]">
            {singleTag}
          </span>
        )}

        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className={cn(
            'absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-xs text-[#171717] transition-all duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-[#171717]',
            wishlisted && 'bg-[#171717] text-white'
          )}
        >
          <Heart className={cn('h-4 w-4 transition-transform', wishlisted && 'fill-current scale-110')} />
        </button>

        {/* Quick Add control */}
        {totalStock > 0 ? (
          <div className="absolute inset-x-3 bottom-3">
            {quickAddOpen ? (
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="rounded-xl bg-white/96 backdrop-blur-md p-2.5 shadow-md border border-[#E8E8E5]"
              >
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777777]">
                    Select Size
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuickAddOpen(false)}
                    className="text-[11px] text-[#777777] hover:text-[#171717]"
                  >
                    Close
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueSizes.map((sz) => {
                    const hasStock = product.variants.some((v) => v.size === sz && v.stock_quantity > 0);
                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={!hasStock || adding}
                        onClick={(e) => handleQuickAddSize(e, sz)}
                        className="min-w-[36px] rounded-lg border border-[#E8E8E5] bg-[#FAFAF8] px-2.5 py-1.5 text-xs font-medium text-[#171717] transition-colors hover:border-[#171717] hover:bg-[#171717] hover:text-white disabled:opacity-40"
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleQuickAddClick}
                disabled={adding}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/95 backdrop-blur-xs py-2.5 text-xs font-semibold tracking-wide text-[#171717] shadow-sm transition-all duration-200 hover:bg-[#171717] hover:text-white md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 focus-visible:opacity-100"
              >
                {adding ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span className="whitespace-nowrap">Quick Add</span>
              </button>
            )}
          </div>
        ) : (
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 py-2 text-center text-xs font-medium text-[#777777]">
            Sold Out
          </div>
        )}
      </div>

      <div className="mt-3.5 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#777777] truncate">
            {product.brand}
          </p>
          {showRating && (
            <span className="flex items-center gap-1 text-xs text-[#171717] tabular-nums shrink-0">
              <Star className="h-3 w-3 fill-[#171717] text-[#171717]" />
              {product.rating_avg.toFixed(1)}
              <span className="text-[#777777]">({product.review_count})</span>
            </span>
          )}
        </div>

        <Link
          to={`/product/${product.slug}`}
          className="text-[15px] font-semibold text-[#171717] hover:underline decoration-[#171717]/40 underline-offset-4 line-clamp-1"
        >
          {product.name}
        </Link>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-[15px] font-semibold text-[#171717]">
              {formatINR(effectivePrice)}
            </span>
            {discountPct > 0 && (
              <>
                <span className="text-xs text-[#777777] line-through">
                  {formatINR(product.base_price)}
                </span>
                <span className="text-xs font-medium text-emerald-700">
                  {discountPct}% off
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1" aria-label="Available colors">
            {uniqueColors.slice(0, 3).map((c) => (
              <span
                key={c.color}
                title={c.color}
                className="h-3 w-3 rounded-full border border-[#171717]/20"
                style={{ backgroundColor: c.color_hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
