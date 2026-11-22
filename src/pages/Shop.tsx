import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { SeoHead } from '../components/common/SeoHead.tsx';
import { ProductCard } from '../components/products/ProductCard.tsx';
import { formatINR } from '../lib/format.ts';
import type { Category, Product } from '../types/ecommerce.ts';

interface ShopProps {
  presetGender?: 'men' | 'women';
  presetCategory?: string;
  presetNewArrival?: boolean;
  presetBestseller?: boolean;
  pageTitle?: string;
  pageSubtitle?: string;
}

const BRANDS = ['ATELIER ORIGINALS', 'URBAN CULTURE', 'ESSENTIALS', 'FORM STUDIO', 'EVERYDAY EDIT'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', '28', '30', '32', '34', 'UK 7', 'UK 8', 'UK 9', 'One Size'];
const COLORS = ['White', 'Ivory', 'Cream', 'Charcoal', 'Indigo', 'Olive', 'Sand', 'Espresso'];

export default function Shop({
  presetGender,
  presetCategory,
  presetNewArrival,
  presetBestseller,
  pageTitle,
  pageSubtitle,
}: ShopProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const category = presetCategory || searchParams.get('category') || 'all';
  const gender = presetGender || searchParams.get('gender') || 'all';
  const brand = searchParams.get('brand') || 'all';
  const collection = searchParams.get('collection') || 'all';
  const size = searchParams.get('size') || 'all';
  const color = searchParams.get('color') || 'all';
  const maxPrice = searchParams.get('maxPrice') || '';
  const minDiscount = searchParams.get('minDiscount') || '';
  const minRating = searchParams.get('minRating') || '';
  const inStock = searchParams.get('inStock') === 'true';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || (presetBestseller ? 'bestselling' : presetNewArrival ? 'newest' : 'featured');
  const page = Number(searchParams.get('page') || '1');

  useEffect(() => {
    apiFetch<{ categories: Category[] }>('/api/categories')
      .then((res) => setCategories(res.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (category !== 'all') q.set('category', category);
    if (gender !== 'all') q.set('gender', gender);
    if (brand !== 'all') q.set('brand', brand);
    if (collection !== 'all') q.set('collection', collection);
    if (size !== 'all') q.set('size', size);
    if (color !== 'all') q.set('color', color);
    if (maxPrice) q.set('maxPrice', maxPrice);
    if (minDiscount) q.set('minDiscount', minDiscount);
    if (minRating) q.set('minRating', minRating);
    if (inStock) q.set('inStock', 'true');
    if (search) q.set('search', search);
    if (presetNewArrival) q.set('newArrival', 'true');
    if (presetBestseller) q.set('bestseller', 'true');
    q.set('sort', sort);
    q.set('page', String(page));
    q.set('limit', '12');

    apiFetch<{ products: Product[]; total: number; totalPages: number }>(`/api/products?${q.toString()}`)
      .then((res) => {
        setProducts(res.products);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, gender, brand, collection, size, color, maxPrice, minDiscount, minRating, inStock, search, sort, page, presetNewArrival, presetBestseller]);

  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.delete('page');
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  const activeChips: Array<{ label: string; key: string }> = [];
  if (!presetCategory && category !== 'all') activeChips.push({ label: `Category: ${category}`, key: 'category' });
  if (!presetGender && gender !== 'all') activeChips.push({ label: `Gender: ${gender}`, key: 'gender' });
  if (brand !== 'all') activeChips.push({ label: `Brand: ${brand}`, key: 'brand' });
  if (collection !== 'all') activeChips.push({ label: `Collection: ${collection}`, key: 'collection' });
  if (size !== 'all') activeChips.push({ label: `Size: ${size}`, key: 'size' });
  if (color !== 'all') activeChips.push({ label: `Color: ${color}`, key: 'color' });
  if (maxPrice) activeChips.push({ label: `Under ${formatINR(Number(maxPrice))}`, key: 'maxPrice' });
  if (minDiscount) activeChips.push({ label: `${minDiscount}%+ Off`, key: 'minDiscount' });
  if (minRating) activeChips.push({ label: `${minRating}★ & above`, key: 'minRating' });
  if (inStock) activeChips.push({ label: 'In Stock Only', key: 'inStock' });
  if (search) activeChips.push({ label: `Search: "${search}"`, key: 'search' });

  const resolvedTitle =
    pageTitle ||
    (presetGender === 'men'
      ? "Men's Collection"
      : presetGender === 'women'
        ? "Women's Collection"
        : presetNewArrival
          ? 'New Arrivals'
          : presetBestseller
            ? 'Best Sellers'
            : 'Shop All Pieces');

  const filterSidebarContent = (
    <div className="space-y-6">
      {/* Search within shop */}
      <div>
        <label htmlFor="shop-search" className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-2">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#777777]" />
          <input
            id="shop-search"
            type="text"
            value={search}
            onChange={(e) => setFilter('search', e.target.value || null)}
            placeholder="Filter by keyword..."
            className="w-full rounded-xl border border-[#E8E8E5] bg-white pl-9 pr-3 py-2 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
          />
        </div>
      </div>

      {/* Category */}
      {!presetCategory && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-2.5">Category</p>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setFilter('category', null)}
              className={`block w-full text-left text-xs py-1 ${category === 'all' ? 'font-semibold text-[#171717]' : 'text-[#777777] hover:text-[#171717]'}`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter('category', c.slug)}
                className={`block w-full text-left text-xs py-1 ${category === c.slug ? 'font-semibold text-[#171717]' : 'text-[#777777] hover:text-[#171717]'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gender */}
      {!presetGender && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-2.5">Department</p>
          <div className="flex flex-wrap gap-1.5">
            {['all', 'men', 'women', 'unisex'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setFilter('gender', g)}
                className={`rounded-lg border px-2.5 py-1 text-xs capitalize transition-colors ${
                  gender === g
                    ? 'border-[#171717] bg-[#171717] text-white'
                    : 'border-[#E8E8E5] bg-white text-[#171717] hover:border-[#171717]'
                }`}
              >
                {g === 'all' ? 'All' : g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Brand */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-2.5">Brand</p>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setFilter('brand', null)}
            className={`block w-full text-left text-xs py-1 ${brand === 'all' ? 'font-semibold text-[#171717]' : 'text-[#777777] hover:text-[#171717]'}`}
          >
            All Brands
          </button>
          {BRANDS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setFilter('brand', b)}
              className={`block w-full text-left text-xs py-1 ${brand === b ? 'font-semibold text-[#171717]' : 'text-[#777777] hover:text-[#171717]'}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-2.5">Max Price</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'Any', val: '' },
            { label: 'Under ₹1,500', val: '1500' },
            { label: 'Under ₹2,500', val: '2500' },
            { label: 'Under ₹3,500', val: '3500' },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setFilter('maxPrice', opt.val || null)}
              className={`rounded-lg border px-2.5 py-1 text-xs ${
                maxPrice === opt.val
                  ? 'border-[#171717] bg-[#171717] text-white'
                  : 'border-[#E8E8E5] bg-white text-[#171717]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-2.5">Size</p>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter('size', size === s ? null : s)}
              className={`rounded-lg border px-2.5 py-1 text-xs ${
                size === s
                  ? 'border-[#171717] bg-[#171717] text-white'
                  : 'border-[#E8E8E5] bg-white text-[#171717]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-2.5">Color</p>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter('color', color === c ? null : c)}
              className={`rounded-lg border px-2.5 py-1 text-xs ${
                color === c
                  ? 'border-[#171717] bg-[#171717] text-white'
                  : 'border-[#E8E8E5] bg-white text-[#171717]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Discount & Rating & Availability */}
      <div className="space-y-3 pt-2 border-t border-[#E8E8E5]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-2">Discount</p>
          <div className="flex flex-wrap gap-1.5">
            {['15', '20', '25'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setFilter('minDiscount', minDiscount === d ? null : d)}
                className={`rounded-lg border px-2.5 py-1 text-xs ${
                  minDiscount === d
                    ? 'border-[#171717] bg-[#171717] text-white'
                    : 'border-[#E8E8E5] bg-white text-[#171717]'
                }`}
              >
                {d}%+ off
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-2">Customer Rating</p>
          <div className="flex gap-1.5">
            {['4.5', '4.8'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilter('minRating', minRating === r ? null : r)}
                className={`rounded-lg border px-2.5 py-1 text-xs ${
                  minRating === r
                    ? 'border-[#171717] bg-[#171717] text-white'
                    : 'border-[#E8E8E5] bg-white text-[#171717]'
                }`}
              >
                {r}★ &amp; up
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-[#171717] cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setFilter('inStock', e.target.checked ? 'true' : null)}
            className="h-4 w-4 accent-[#171717] rounded"
          />
          In stock items only
        </label>
      </div>
    </div>
  );

  return (
    <>
      <SeoHead
        title={resolvedTitle}
        description={pageSubtitle || 'Explore curated menswear, womenswear, streetwear, sneakers, and accessories at ATELIER.'}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8E8E5] pb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">ATELIER Catalog</p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#171717]">
              {resolvedTitle}
            </h1>
            {pageSubtitle && <p className="mt-2 text-sm text-[#777777] max-w-xl">{pageSubtitle}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 rounded-full border border-[#E8E8E5] bg-white px-4 py-2 text-xs font-semibold text-[#171717]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            </button>

            <span className="text-xs text-[#777777] tabular-nums">
              {total} {total === 1 ? 'piece' : 'pieces'}
            </span>

            <label htmlFor="shop-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="shop-sort"
              value={sort}
              onChange={(e) => setFilter('sort', e.target.value)}
              className="rounded-full border border-[#E8E8E5] bg-white px-4 py-2 text-xs font-medium text-[#171717] focus:border-[#171717] focus:outline-none"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="bestselling">Best Selling</option>
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key, null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E8E5] bg-white px-3 py-1 text-xs font-medium text-[#171717] hover:border-[#171717]"
              >
                <span>{chip.label}</span>
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-semibold text-[#777777] hover:text-[#171717] underline ml-2"
            >
              Clear all filters
            </button>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 rounded-2xl border border-[#E8E8E5] bg-[#F2F2EF]/50 p-5">
              {filterSidebarContent}
            </div>
          </aside>

          {/* Product Grid */}
          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="animate-pulse space-y-3">
                    <div className="aspect-[3/4] rounded-2xl bg-[#F2F2EF]" />
                    <div className="h-3 w-1/3 rounded bg-[#F2F2EF]" />
                    <div className="h-4 w-3/4 rounded bg-[#F2F2EF]" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-3xl border border-[#E8E8E5] bg-white py-16 px-6 text-center">
                <p className="font-display text-xl font-semibold text-[#171717]">
                  No pieces match your current filters
                </p>
                <p className="mt-2 text-sm text-[#777777] max-w-md mx-auto">
                  Try widening your price ceiling or clearing a few attribute filters to view the full seasonal collection.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-6 rounded-full bg-[#171717] px-6 py-2.5 text-xs font-semibold text-white"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-10">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} showRating />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => {
                          const next = new URLSearchParams(searchParams);
                          next.set('page', String(pNum));
                          setSearchParams(next);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`h-9 min-w-9 rounded-full px-3 text-xs font-semibold tabular-nums ${
                          page === pNum
                            ? 'bg-[#171717] text-white'
                            : 'border border-[#E8E8E5] bg-white text-[#171717] hover:border-[#171717]'
                        }`}
                      >
                        {pNum}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter products"
          className="fixed inset-0 z-50 flex bg-[#171717]/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            className="flex h-full w-80 max-w-[85vw] flex-col bg-[#FAFAF8] p-6 overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4 mb-5">
              <h2 className="font-display text-lg font-bold">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-1.5 rounded-full hover:bg-[#F2F2EF]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterSidebarContent}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-6 w-full rounded-full bg-[#171717] py-3 text-xs font-semibold text-white"
            >
              Show {total} Results
            </button>
          </div>
        </div>
      )}
    </>
  );
}
