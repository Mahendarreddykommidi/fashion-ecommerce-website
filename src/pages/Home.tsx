import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { EDITORIAL_MEDIA } from '../lib/media.ts';
import { SmartImage } from '../components/common/SmartImage.tsx';
import { SeoHead } from '../components/common/SeoHead.tsx';
import { ProductCard } from '../components/products/ProductCard.tsx';
import type { Category, Product } from '../types/ecommerce.ts';

const BRAND_HOUSES = [
  { name: 'ATELIER ORIGINALS', note: 'Core architectural silhouettes' },
  { name: 'URBAN CULTURE', note: 'Heavyweight street uniform' },
  { name: 'ESSENTIALS', note: 'Loopback fleece & daily basics' },
  { name: 'FORM STUDIO', note: 'Tailored shirting & footwear' },
  { name: 'EVERYDAY EDIT', note: 'Belgian linen & fine merino' },
];

const EDITORIAL_COLLECTIONS = [
  {
    name: 'The Everyday Edit',
    slug: 'the-everyday-edit',
    description: 'Relaxed linen-cotton shirting, structured canvas carryalls, and effortless daily layers.',
    image: EDITORIAL_MEDIA.collections.everydayEdit,
  },
  {
    name: 'Urban Streetwear',
    slug: 'urban-streetwear',
    description: '440 GSM French terry hoodies, articulated cargos, and dry-hand oversized jersey.',
    image: EDITORIAL_MEDIA.collections.urbanStreetwear,
  },
  {
    name: 'Summer Breeze',
    slug: 'summer-breeze',
    description: 'Breathable European flax dresses, camp-collar shirts, and sunlit neutral tones.',
    image: EDITORIAL_MEDIA.collections.summerBreeze,
  },
];

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [bestsellerSort, setBestsellerSort] = useState<'popularity' | 'price_asc' | 'price_desc' | 'newest' | 'rating'>('popularity');
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ categories: Category[] }>('/api/categories'),
      apiFetch<{ products: Product[] }>('/api/products?featured=true&limit=8'),
      apiFetch<{ products: Product[] }>('/api/products?newArrival=true&limit=10'),
    ])
      .then(([catRes, featRes, newRes]) => {
        setCategories(catRes.categories);
        setFeatured(featRes.products.slice(0, 8));
        setNewArrivals(newRes.products);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiFetch<{ products: Product[] }>(`/api/products?bestseller=true&sort=${bestsellerSort}&limit=4`)
      .then((res) => setBestsellers(res.products))
      .catch(() => {});
  }, [bestsellerSort]);

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const offset = dir === 'left' ? -340 : 340;
    carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <>
      <SeoHead
        title="ATELIER — Modern Fashion & Lifestyle Store"
        description="Discover thoughtfully curated fashion essentials, timeless silhouettes, streetwear, footwear, and contemporary styles at ATELIER."
        canonicalPath="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: 'ATELIER',
          description: 'Modern fashion & lifestyle e-commerce store for men, women, streetwear, footwear, and accessories.',
          url: window.location.origin,
        }}
      />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden border-b border-[#E8E8E5] bg-[#FAFAF8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Copy */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 flex flex-col items-start"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#777777]">
                Autumn / Resort Editorial · 2026
              </p>
              <h1 className="mt-4 font-display text-[clamp(2.5rem,4.5vw,4.1rem)] font-bold leading-[1.02] tracking-tight text-[#171717] text-balance">
                REDEFINE YOUR EVERYDAY STYLE.
              </h1>
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#777777] max-w-md">
                Discover thoughtfully curated fashion essentials, timeless silhouettes, and contemporary styles made for every version of you.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-3.5">
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#171717] px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2c2c2c] transition-colors whitespace-nowrap"
                >
                  EXPLORE COLLECTION
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#171717]/25 bg-white px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:border-[#171717] transition-colors whitespace-nowrap"
                >
                  DISCOVER OUR STORY
                </Link>
              </div>

              {/* Circular promotional badge + clean metric line */}
              <div className="mt-10 flex items-center gap-5 pt-6 border-t border-[#E8E8E5] w-full">
                <Link
                  to="/shop?minDiscount=20"
                  className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-[#B8F56A] text-center text-[#171717] transition-transform hover:scale-105"
                >
                  <span className="font-display text-base font-bold leading-none tabular-nums">30% OFF</span>
                  <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider leading-tight">
                    New Drop
                  </span>
                </Link>
                <div className="text-xs text-[#777777] leading-relaxed">
                  <p className="font-semibold text-[#171717]">New Season Collection</p>
                  <p className="mt-0.5">Organic cotton, Belgian flax linen &amp; small-batch footwear.</p>
                </div>
              </div>
            </motion.div>

            {/* Right 3-Card Fashion Collage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 relative"
            >
              {/* Subtle geometric accent */}
              <div
                aria-hidden="true"
                className="absolute -top-4 -right-4 h-36 w-36 rounded-full bg-[#FFB56B]/30 blur-2xl pointer-events-none"
              />
              <div className="grid grid-cols-12 gap-3 sm:gap-4 items-end">
                <Link
                  to="/women"
                  className="col-span-5 group relative aspect-[3/4] overflow-hidden rounded-3xl bg-[#F2F2EF] border border-[#E8E8E5]"
                >
                  <SmartImage
                    src={EDITORIAL_MEDIA.heroBlazer}
                    alt="Tailored cream linen blazer editorial look"
                    loading="eager"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent p-4 text-white">
                    <p className="text-[11px] uppercase tracking-wider text-white/80">Womenswear</p>
                    <p className="text-sm font-semibold">Tailored Linen</p>
                  </div>
                </Link>

                <Link
                  to="/streetwear"
                  className="col-span-4 group relative aspect-[3/4] -translate-y-4 sm:-translate-y-6 overflow-hidden rounded-3xl bg-[#F2F2EF] border border-[#E8E8E5]"
                >
                  <SmartImage
                    src={EDITORIAL_MEDIA.heroStreetwear}
                    alt="Streetwear heavyweight tee and utility cargo look"
                    loading="eager"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent p-4 text-white">
                    <p className="text-[11px] uppercase tracking-wider text-white/80">Streetwear</p>
                    <p className="text-sm font-semibold">Urban Drop</p>
                  </div>
                </Link>

                <Link
                  to="/shop?collection=summer-breeze"
                  className="col-span-3 group relative aspect-[2/3] overflow-hidden rounded-3xl bg-[#F2F2EF] border border-[#E8E8E5]"
                >
                  <SmartImage
                    src={EDITORIAL_MEDIA.heroWomensSummer}
                    alt="Minimalist pleated summer midi dress editorial"
                    loading="eager"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent p-3 text-white">
                    <p className="text-xs font-semibold">Summer Edit</p>
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. PROMOTIONAL & SUSTAINABILITY HIGHLIGHT */}
      <section className="border-b border-[#E8E8E5] bg-[#F2F2EF]/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex h-44 w-44 shrink-0 flex-col items-center justify-center rounded-full bg-[#B8F56A] p-6 text-center text-[#171717]">
                <span className="text-[11px] font-semibold uppercase tracking-widest">Seasonal Offer</span>
                <span className="mt-1 font-display text-3xl font-bold leading-none tabular-nums">
                  UP TO 30% OFF
                </span>
                <span className="mt-2 text-xs leading-snug text-[#171717]/80">
                  Refresh your wardrobe with our latest collection.
                </span>
              </div>
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] text-balance">
                  FASHION THAT FEELS DIFFERENT
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#777777]">
                  Modern clothing built around tactile fabrics, architectural ease, and individual expression — never seasonal noise.
                </p>
                <Link
                  to="/shop"
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#171717] border-b border-[#171717] pb-0.5 hover:opacity-75"
                >
                  Explore Collection <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6 items-center rounded-3xl bg-white p-6 sm:p-8 border border-[#E8E8E5]">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[#F2F2EF]">
                <SmartImage
                  src={EDITORIAL_MEDIA.sustainability}
                  alt="Organic raw linen and cotton fabric bolts in the ATELIER studio"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">
                  Responsible Craft
                </p>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#171717]">
                  STYLE WITH PURPOSE.
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#777777]">
                  Every garment begins with GOTS-certified organic cotton, European flax linen, and traceable merino spun in small, ethical production runs.
                </p>
                <Link
                  to="/about#sustainability"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#171717] hover:underline"
                >
                  Read Materials Ledger <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SHOP BY CATEGORY (ASYMMETRICAL EDITORIAL GRID) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Curated Departments</p>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#171717]">
              SHOP BY CATEGORY
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:underline"
          >
            View All Departments <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
          {categories.map((cat, idx) => {
            const colSpan =
              idx === 0 || idx === 1
                ? 'lg:col-span-6 aspect-[16/10]'
                : 'lg:col-span-3 aspect-[3/4]';
            return (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.slug}`}
                className={`group relative overflow-hidden rounded-3xl bg-[#F2F2EF] border border-[#E8E8E5] ${colSpan}`}
              >
                <SmartImage
                  src={cat.image_url}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-white/80">{cat.subtitle}</p>
                    <h3 className="mt-1 font-display text-xl sm:text-2xl font-bold">{cat.name}</h3>
                  </div>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#171717] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. FEATURED PRODUCTS: THE LATEST DROPS */}
      <section className="border-t border-[#E8E8E5] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#171717]">
                THE LATEST DROPS
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#777777]">
                Discover pieces designed to make everyday dressing effortless.
              </p>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#171717] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#171717] hover:text-white transition-colors whitespace-nowrap"
            >
              VIEW ALL PRODUCTS <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="animate-pulse space-y-3">
                  <div className="aspect-[3/4] rounded-2xl bg-[#F2F2EF]" />
                  <div className="h-3 w-1/3 rounded bg-[#F2F2EF]" />
                  <div className="h-4 w-3/4 rounded bg-[#F2F2EF]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. NEW ARRIVALS CAROUSEL & EDITORIAL COLLECTIONS */}
      <section className="border-t border-[#E8E8E5] bg-[#FAFAF8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Just Landed</p>
              <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-[#171717]">
                NEW ARRIVALS
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollCarousel('left')}
                aria-label="Scroll new arrivals left"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E8E5] bg-white text-[#171717] hover:border-[#171717]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel('right')}
                aria-label="Scroll new arrivals right"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E8E5] bg-white text-[#171717] hover:border-[#171717]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
          >
            {newArrivals.map((product) => (
              <div key={product.id} className="w-[240px] sm:w-[270px] shrink-0 snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          {/* Curated Collections Grid */}
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {EDITORIAL_COLLECTIONS.map((col) => (
              <Link
                key={col.slug}
                to={`/shop?collection=${col.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#F2F2EF] border border-[#E8E8E5]"
              >
                <SmartImage
                  src={col.image}
                  alt={col.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <h3 className="font-display text-2xl font-bold">{col.name}</h3>
                  <p className="mt-1.5 text-xs text-white/85 line-clamp-2">{col.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#B8F56A]">
                    Shop Now <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. BEST SELLERS WITH LIVE SORTING */}
      <section className="border-t border-[#E8E8E5] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Customer Favorites</p>
              <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-[#171717]">
                BEST SELLERS
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#F2F2EF] p-1">
              {[
                { key: 'popularity', label: 'Popularity' },
                { key: 'price_asc', label: 'Price: Low to High' },
                { key: 'price_desc', label: 'Price: High to Low' },
                { key: 'newest', label: 'Newest' },
                { key: 'rating', label: 'Customer Rating' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setBestsellerSort(opt.key as any)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    bestsellerSort === opt.key
                      ? 'bg-white text-[#171717] shadow-xs'
                      : 'text-[#777777] hover:text-[#171717]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
            {bestsellers.map((product) => (
              <ProductCard key={product.id} product={product} showRating />
            ))}
          </div>
        </div>
      </section>

      {/* 7. BRAND IDENTITY SECTION */}
      <section className="border-t border-[#E8E8E5] bg-[#FAFAF8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">
              CURATED FOR YOUR STYLE
            </h2>
            <p className="mt-2 text-sm text-[#777777]">
              Five distinct design houses united by restraint, durability, and considered proportion.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {BRAND_HOUSES.map((brand) => (
              <Link
                key={brand.name}
                to={`/shop?brand=${encodeURIComponent(brand.name)}`}
                className="group flex flex-col justify-between rounded-2xl border border-[#E8E8E5] bg-white p-5 transition-colors hover:border-[#171717]"
              >
                <span className="font-display text-sm font-bold tracking-wider text-[#171717]">
                  {brand.name}
                </span>
                <span className="mt-3 text-xs text-[#777777] group-hover:text-[#171717] flex items-center justify-between gap-2">
                  <span>{brand.note}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
