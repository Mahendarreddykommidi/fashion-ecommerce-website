import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, Clock } from 'lucide-react';
import { apiFetch } from '../../lib/api.ts';
import { SmartImage } from '../common/SmartImage.tsx';
import { formatINR } from '../../lib/format.ts';
import type { Product } from '../../types/ecommerce.ts';

const RECENT_SEARCH_KEY = 'atelier_recent_searches_v1';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [suggested, setSuggested] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCH_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
      apiFetch<{ products: Product[] }>('/api/products?featured=true&limit=4')
        .then((res) => setSuggested(res.products))
        .catch(() => {});
    } else {
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      apiFetch<{ products: Product[] }>(`/api/products?search=${encodeURIComponent(trimmed)}&limit=8`)
        .then((res) => setResults(res.products))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 240);
    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const recordSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    const next = [clean, ...recentSearches.filter((r) => r.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
    setRecentSearches(next);
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    recordSearch(query);
    onClose();
    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search ATELIER products"
      className="fixed inset-0 z-50 flex flex-col bg-[#171717]/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full bg-[#FAFAF8] border-b border-[#E8E8E5] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
          <form onSubmit={handleSubmit} className="relative flex items-center border-b border-[#171717] pb-3">
            <Search className="h-5 w-5 text-[#777777] mr-3 shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shirts, linen dresses, sneakers, streetwear..."
              className="w-full bg-transparent text-base sm:text-lg text-[#171717] placeholder:text-[#777777] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs font-medium text-[#777777] hover:text-[#171717] mr-3"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="p-1.5 rounded-full hover:bg-[#F2F2EF] text-[#171717]"
            >
              <X className="h-5 w-5" />
            </button>
          </form>

          {/* Recent searches */}
          {!query.trim() && recentSearches.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wider text-[#777777] mb-2.5">
                Recent Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E8E5] bg-white px-3 py-1.5 text-xs font-medium text-[#171717] hover:border-[#171717]"
                  >
                    <Clock className="h-3 w-3 text-[#777777]" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results or Suggested */}
          <div className="mt-6">
            {query.trim() ? (
              loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="animate-pulse space-y-2">
                      <div className="aspect-[3/4] rounded-xl bg-[#F2F2EF]" />
                      <div className="h-3 w-2/3 rounded bg-[#F2F2EF]" />
                    </div>
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-base font-medium text-[#171717]">
                    No pieces found for "{query}"
                  </p>
                  <p className="mt-1 text-sm text-[#777777]">
                    Try searching for "Linen", "Denim", "Hoodie", or browse the full catalog.
                  </p>
                  <Link
                    to="/shop"
                    onClick={onClose}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#171717] px-5 py-2.5 text-xs font-semibold text-white"
                  >
                    Explore All Pieces <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-[#777777]">
                      Matching Pieces ({results.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        recordSearch(query);
                        onClose();
                        navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
                      }}
                      className="text-xs font-semibold text-[#171717] hover:underline flex items-center gap-1"
                    >
                      View all results <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[55vh] overflow-y-auto pr-1">
                    {results.map((p) => (
                      <Link
                        key={p.id}
                        to={`/product/${p.slug}`}
                        onClick={() => {
                          recordSearch(query);
                          onClose();
                        }}
                        className="group flex flex-col gap-2"
                      >
                        <div className="aspect-[3/4] overflow-hidden rounded-xl bg-[#F2F2EF] border border-[#E8E8E5]">
                          <SmartImage
                            src={p.images[0]?.image_url}
                            alt={p.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wider text-[#777777] truncate">
                            {p.brand}
                          </p>
                          <p className="text-sm font-medium text-[#171717] truncate">{p.name}</p>
                          <p className="text-xs font-semibold text-[#171717] tabular-nums">
                            {formatINR(p.sale_price ?? p.base_price)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#777777] mb-3">
                  Curated Suggestions
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {suggested.map((p) => (
                    <Link
                      key={p.id}
                      to={`/product/${p.slug}`}
                      onClick={onClose}
                      className="group flex flex-col gap-2"
                    >
                      <div className="aspect-[3/4] overflow-hidden rounded-xl bg-[#F2F2EF] border border-[#E8E8E5]">
                        <SmartImage
                          src={p.images[0]?.image_url}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#171717] truncate">{p.name}</p>
                        <p className="text-xs text-[#777777] tabular-nums">
                          {formatINR(p.sale_price ?? p.base_price)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
