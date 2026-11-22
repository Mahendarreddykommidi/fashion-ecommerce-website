import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext.tsx';
import { useCart } from '../contexts/CartContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { SeoHead } from '../components/common/SeoHead.tsx';
import { SmartImage } from '../components/common/SmartImage.tsx';
import { formatINR } from '../lib/format.ts';
import type { Product } from '../types/ecommerce.ts';

export default function Wishlist() {
  const { products, toggleWishlist, loading } = useWishlist();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleMoveToBag = async (product: Product) => {
    const variant = product.variants.find((v) => v.stock_quantity > 0);
    if (!variant) {
      showToast('This piece is currently out of stock', 'error');
      return;
    }
    try {
      await addToCart(product, variant, 1, true);
      showToast(`Added ${product.name} (${variant.size}) to bag`);
    } catch (err: any) {
      showToast(err.message || 'Could not add to bag', 'error');
    }
  };

  return (
    <>
      <SeoHead title="Wishlist" description="Your saved ATELIER pieces and wardrobe favorites." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex items-end justify-between border-b border-[#E8E8E5] pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Saved Pieces</p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-[#171717]">
              My Wishlist ({products.length})
            </h1>
          </div>
          <Link to="/shop" className="text-xs font-semibold text-[#171717] hover:underline">
            Explore More
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="animate-pulse aspect-[3/4] rounded-2xl bg-[#F2F2EF]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="my-12 rounded-3xl border border-[#E8E8E5] bg-white py-16 px-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F2F2EF]">
              <Heart className="h-6 w-6 text-[#777777]" />
            </div>
            <h2 className="font-display text-xl font-semibold text-[#171717]">Your wishlist is empty</h2>
            <p className="mt-2 text-sm text-[#777777] max-w-md mx-auto">
              Save pieces you love while browsing and return to them anytime.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#171717] px-7 py-3 text-xs font-semibold text-white"
            >
              Browse Collection <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="flex flex-col rounded-2xl border border-[#E8E8E5] bg-white overflow-hidden">
                <Link to={`/product/${product.slug}`} className="aspect-[3/4] bg-[#F2F2EF] overflow-hidden">
                  <SmartImage
                    src={product.images[0]?.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </Link>
                <div className="p-4 flex flex-1 flex-col justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#777777]">{product.brand}</p>
                    <Link to={`/product/${product.slug}`} className="text-sm font-semibold text-[#171717] hover:underline line-clamp-1">
                      {product.name}
                    </Link>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {formatINR(product.sale_price ?? product.base_price)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleMoveToBag(product)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#171717] py-2.5 text-xs font-semibold text-white hover:bg-[#2a2a2a]"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" /> Add to Bag
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleWishlist(product.id);
                        showToast('Removed from wishlist', 'info');
                      }}
                      aria-label="Remove from wishlist"
                      className="rounded-full border border-[#E8E8E5] p-2.5 text-[#777777] hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
