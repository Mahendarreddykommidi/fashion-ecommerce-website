import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, User, Heart, ShoppingBag, Menu, X, ChevronDown, ArrowRight } from 'lucide-react';
import { useCart } from '../../contexts/CartContext.tsx';
import { useWishlist } from '../../contexts/WishlistContext.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { SearchOverlay } from './SearchOverlay.tsx';
import { cn } from '../../lib/format.ts';

export function Navbar() {
  const { itemCount, openDrawer, settings } = useCart();
  const { productIds: wishlistIds } = useWishlist();
  const { user } = useAuth();
  const location = useLocation();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaMenu, setMegaMenu] = useState<'men' | 'women' | 'collections' | null>(null);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {!bannerDismissed && (
        <div className="relative bg-[#171717] text-[#FAFAF8] px-4 py-2 text-center text-[11px] sm:text-xs font-medium tracking-wider">
          <p className="mx-auto max-w-5xl truncate pr-6">
            {settings.announcement_text || 'NEW SEASON COLLECTION IS HERE · FREE SHIPPING ON ORDERS ABOVE ₹1,999'}
          </p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#FAFAF8]/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <header
        className="sticky top-0 z-40 border-b border-[#E8E8E5] bg-[#FAFAF8]/95 backdrop-blur-md"
        onMouseLeave={() => setMegaMenu(null)}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Left: Mobile Menu + Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden rounded-lg p-2 -ml-2 text-[#171717] hover:bg-[#F2F2EF]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              to="/"
              className="font-display text-xl font-bold tracking-[0.14em] text-[#171717] whitespace-nowrap shrink-0"
            >
              ATELIER
            </Link>
          </div>

          {/* Center: Clean single-line navigation links */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#171717]">
            <Link
              to="/"
              className={cn(
                'whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors',
                isActive('/') ? 'border-[#171717]' : 'border-transparent hover:border-[#171717]/40'
              )}
            >
              Home
            </Link>
            <Link
              to="/shop"
              className={cn(
                'whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors',
                isActive('/shop') ? 'border-[#171717]' : 'border-transparent hover:border-[#171717]/40'
              )}
            >
              Shop
            </Link>
            <div
              className="relative"
              onMouseEnter={() => setMegaMenu('men')}
            >
              <Link
                to="/men"
                className={cn(
                  'inline-flex items-center gap-1 whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors',
                  isActive('/men') ? 'border-[#171717]' : 'border-transparent hover:border-[#171717]/40'
                )}
              >
                Men <ChevronDown className="h-3.5 w-3.5 text-[#777777]" />
              </Link>
            </div>
            <div
              className="relative"
              onMouseEnter={() => setMegaMenu('women')}
            >
              <Link
                to="/women"
                className={cn(
                  'inline-flex items-center gap-1 whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors',
                  isActive('/women') ? 'border-[#171717]' : 'border-transparent hover:border-[#171717]/40'
                )}
              >
                Women <ChevronDown className="h-3.5 w-3.5 text-[#777777]" />
              </Link>
            </div>
            <div
              className="relative"
              onMouseEnter={() => setMegaMenu('collections')}
            >
              <Link
                to="/collections"
                className={cn(
                  'inline-flex items-center gap-1 whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors',
                  isActive('/collections') ? 'border-[#171717]' : 'border-transparent hover:border-[#171717]/40'
                )}
              >
                Collections <ChevronDown className="h-3.5 w-3.5 text-[#777777]" />
              </Link>
            </div>
            <Link
              to="/new-arrivals"
              className={cn(
                'whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors',
                isActive('/new-arrivals') ? 'border-[#171717]' : 'border-transparent hover:border-[#171717]/40'
              )}
            >
              New Arrivals
            </Link>
            <Link
              to="/about"
              className={cn(
                'whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors',
                isActive('/about') ? 'border-[#171717]' : 'border-transparent hover:border-[#171717]/40'
              )}
            >
              About Us
            </Link>
          </nav>

          {/* Right: Functional Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search store"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#171717] hover:bg-[#F2F2EF] transition-colors"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            <Link
              to={user ? '/account' : '/login'}
              aria-label={user ? 'My Account' : 'Sign In'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#171717] hover:bg-[#F2F2EF] transition-colors"
            >
              <User className="h-[18px] w-[18px]" />
            </Link>

            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#171717] hover:bg-[#F2F2EF] transition-colors"
            >
              <Heart className="h-[18px] w-[18px]" />
              {wishlistIds.length > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B8F56A] px-1 text-[10px] font-bold text-[#171717] tabular-nums">
                  {wishlistIds.length}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={openDrawer}
              aria-label="Open shopping bag"
              className="relative flex h-10 items-center gap-1.5 rounded-full bg-[#171717] px-3.5 text-white hover:bg-[#2a2a2a] transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="text-xs font-semibold tabular-nums">{itemCount}</span>
            </button>
          </div>
        </div>

        {/* Mega Menu Dropdown */}
        {megaMenu && (
          <div className="hidden lg:block border-t border-[#E8E8E5] bg-[#FAFAF8] shadow-lg">
            <div className="mx-auto grid max-w-7xl grid-cols-4 gap-8 px-8 py-7">
              {megaMenu === 'men' && (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#777777] mb-3">
                      Men's Apparel
                    </p>
                    <ul className="space-y-2 text-sm text-[#171717]">
                      <li><Link to="/men" onClick={() => setMegaMenu(null)} className="hover:underline">All Men's</Link></li>
                      <li><Link to="/shop?gender=men&category=mens-clothing" onClick={() => setMegaMenu(null)} className="hover:underline">Shirts &amp; Overshirts</Link></li>
                      <li><Link to="/shop?gender=men&category=streetwear" onClick={() => setMegaMenu(null)} className="hover:underline">Streetwear &amp; Hoodies</Link></li>
                      <li><Link to="/shop?gender=men&category=summer-collection" onClick={() => setMegaMenu(null)} className="hover:underline">Summer Linen</Link></li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#777777] mb-3">
                      Footwear &amp; Carry
                    </p>
                    <ul className="space-y-2 text-sm text-[#171717]">
                      <li><Link to="/shop?category=sneakers" onClick={() => setMegaMenu(null)} className="hover:underline">Minimal Sneakers &amp; Loafers</Link></li>
                      <li><Link to="/shop?category=accessories" onClick={() => setMegaMenu(null)} className="hover:underline">Canvas Totes &amp; Eyewear</Link></li>
                      <li><Link to="/best-sellers" onClick={() => setMegaMenu(null)} className="hover:underline">Best Sellers</Link></li>
                    </ul>
                  </div>
                  <div className="col-span-2 rounded-2xl bg-[#F2F2EF] p-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[#777777]">Featured Edit</p>
                      <h3 className="mt-1 font-display text-xl font-semibold text-[#171717]">The Everyday Edit</h3>
                      <p className="mt-1 text-xs text-[#777777] max-w-xs">
                        Tailored Belgian linen shirts, selvedge denim, and structured overshirts.
                      </p>
                      <Link
                        to="/shop?collection=the-everyday-edit"
                        onClick={() => setMegaMenu(null)}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#171717] hover:underline"
                      >
                        Shop the Edit <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {megaMenu === 'women' && (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#777777] mb-3">
                      Women's Apparel
                    </p>
                    <ul className="space-y-2 text-sm text-[#171717]">
                      <li><Link to="/women" onClick={() => setMegaMenu(null)} className="hover:underline">All Women's</Link></li>
                      <li><Link to="/shop?gender=women&category=womens-clothing" onClick={() => setMegaMenu(null)} className="hover:underline">Dresses &amp; Tailoring</Link></li>
                      <li><Link to="/shop?gender=women" onClick={() => setMegaMenu(null)} className="hover:underline">Merino Knitwear</Link></li>
                      <li><Link to="/new-arrivals" onClick={() => setMegaMenu(null)} className="hover:underline">New Arrivals</Link></li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#777777] mb-3">
                      Curated Edits
                    </p>
                    <ul className="space-y-2 text-sm text-[#171717]">
                      <li><Link to="/shop?collection=summer-breeze" onClick={() => setMegaMenu(null)} className="hover:underline">Summer Breeze</Link></li>
                      <li><Link to="/shop?collection=minimal-essentials" onClick={() => setMegaMenu(null)} className="hover:underline">Minimal Essentials</Link></li>
                      <li><Link to="/shop?collection=contemporary-classics" onClick={() => setMegaMenu(null)} className="hover:underline">Contemporary Classics</Link></li>
                    </ul>
                  </div>
                  <div className="col-span-2 rounded-2xl bg-[#F2F2EF] p-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[#777777]">Seasonal Capsule</p>
                      <h3 className="mt-1 font-display text-xl font-semibold text-[#171717]">Summer Breeze</h3>
                      <p className="mt-1 text-xs text-[#777777] max-w-xs">
                        Breathable linen dresses, sculpted ribbed knits, and sunlit tailoring.
                      </p>
                      <Link
                        to="/shop?collection=summer-breeze"
                        onClick={() => setMegaMenu(null)}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#171717] hover:underline"
                      >
                        Explore Capsule <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {megaMenu === 'collections' && (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#777777] mb-3">
                      Collections
                    </p>
                    <ul className="space-y-2 text-sm text-[#171717]">
                      <li><Link to="/shop?collection=the-everyday-edit" onClick={() => setMegaMenu(null)} className="hover:underline">The Everyday Edit</Link></li>
                      <li><Link to="/shop?collection=urban-streetwear" onClick={() => setMegaMenu(null)} className="hover:underline">Urban Streetwear</Link></li>
                      <li><Link to="/shop?collection=minimal-essentials" onClick={() => setMegaMenu(null)} className="hover:underline">Minimal Essentials</Link></li>
                      <li><Link to="/shop?collection=summer-breeze" onClick={() => setMegaMenu(null)} className="hover:underline">Summer Breeze</Link></li>
                      <li><Link to="/shop?collection=contemporary-classics" onClick={() => setMegaMenu(null)} className="hover:underline">Contemporary Classics</Link></li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#777777] mb-3">
                      Categories
                    </p>
                    <ul className="space-y-2 text-sm text-[#171717]">
                      <li><Link to="/streetwear" onClick={() => setMegaMenu(null)} className="hover:underline">Streetwear</Link></li>
                      <li><Link to="/shop?category=sneakers" onClick={() => setMegaMenu(null)} className="hover:underline">Sneakers &amp; Footwear</Link></li>
                      <li><Link to="/shop?category=accessories" onClick={() => setMegaMenu(null)} className="hover:underline">Accessories</Link></li>
                    </ul>
                  </div>
                  <div className="col-span-2 rounded-2xl bg-[#F2F2EF] p-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[#777777]">Brand Houses</p>
                      <h3 className="mt-1 font-display text-xl font-semibold text-[#171717]">ATELIER &amp; Studio Labels</h3>
                      <p className="mt-1 text-xs text-[#777777] max-w-xs">
                        Explore pieces from ATELIER ORIGINALS, URBAN CULTURE, ESSENTIALS, FORM STUDIO, and EVERYDAY EDIT.
                      </p>
                      <Link
                        to="/collections"
                        onClick={() => setMegaMenu(null)}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#171717] hover:underline"
                      >
                        View All Collections <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 z-50 flex bg-[#171717]/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="flex h-full w-80 max-w-[85vw] flex-col bg-[#FAFAF8] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4">
              <span className="font-display text-lg font-bold tracking-[0.14em]">ATELIER</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-full p-1.5 hover:bg-[#F2F2EF]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-3 text-base font-medium text-[#171717] overflow-y-auto">
              {[
                { label: 'Home', to: '/' },
                { label: 'Shop All', to: '/shop' },
                { label: 'Men', to: '/men' },
                { label: 'Women', to: '/women' },
                { label: 'Streetwear', to: '/streetwear' },
                { label: 'Collections', to: '/collections' },
                { label: 'New Arrivals', to: '/new-arrivals' },
                { label: 'Best Sellers', to: '/best-sellers' },
                { label: 'Wishlist', to: '/wishlist' },
                { label: 'Track Order', to: '/track-order' },
                { label: 'About Us', to: '/about' },
                { label: 'Contact', to: '/contact' },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="py-1.5 border-b border-[#E8E8E5]/60 flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="h-4 w-4 text-[#777777]" />
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-4 border-t border-[#E8E8E5] flex flex-col gap-2">
              <Link
                to={user ? '/account' : '/login'}
                onClick={() => setMobileOpen(false)}
                className="w-full rounded-full bg-[#171717] py-3 text-center text-xs font-semibold text-white"
              >
                {user ? `Account (${user.full_name})` : 'Sign In / Create Account'}
              </Link>
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="w-full rounded-full border border-[#171717] py-2.5 text-center text-xs font-semibold text-[#171717]"
                >
                  Admin Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
