import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Instagram, Facebook, Youtube, Bookmark } from 'lucide-react';
import { apiFetch } from '../../lib/api.ts';
import { useToast } from '../../contexts/ToastContext.tsx';

export function Footer() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      showToast(res.message, 'success');
      setEmail('');
    } catch (err: any) {
      showToast(err.message || 'Please enter a valid email address.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer id="newsletter" className="border-t border-[#E8E8E5] bg-[#F2F2EF] text-[#171717]">
      {/* Newsletter Band */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16 border-b border-[#E8E8E5]">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              GET ON THE LIST
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-[#777777] max-w-md">
              Discover new collections, exclusive offers, and the latest fashion updates.
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="lg:col-span-6 flex flex-col sm:flex-row gap-3">
            <label htmlFor="footer-newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 rounded-full border border-[#E8E8E5] bg-white px-5 py-3.5 text-sm text-[#171717] placeholder:text-[#777777] focus:border-[#171717] focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#171717] px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2b2b2b] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              {submitting ? 'Subscribing...' : 'Subscribe'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer Links */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <Link to="/" className="font-display text-xl font-bold tracking-[0.14em] text-[#171717]">
              ATELIER
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-[#777777] max-w-xs">
              Modern fashion essentials crafted with organic fibers, architectural fits, and timeless restraint.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://instagram.com"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E8E5] bg-white text-[#171717] hover:border-[#171717]"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://facebook.com"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E8E5] bg-white text-[#171717] hover:border-[#171717]"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://pinterest.com"
                rel="noopener noreferrer"
                aria-label="Pinterest"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E8E5] bg-white text-[#171717] hover:border-[#171717]"
              >
                <Bookmark className="h-4 w-4" />
              </a>
              <a
                href="https://youtube.com"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E8E5] bg-white text-[#171717] hover:border-[#171717]"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-4">SHOP</p>
            <ul className="space-y-2.5 text-sm text-[#777777]">
              <li><Link to="/men" className="hover:text-[#171717]">Men</Link></li>
              <li><Link to="/women" className="hover:text-[#171717]">Women</Link></li>
              <li><Link to="/new-arrivals" className="hover:text-[#171717]">New Arrivals</Link></li>
              <li><Link to="/best-sellers" className="hover:text-[#171717]">Best Sellers</Link></li>
              <li><Link to="/collections" className="hover:text-[#171717]">Collections</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-4">HELP</p>
            <ul className="space-y-2.5 text-sm text-[#777777]">
              <li><Link to="/contact" className="hover:text-[#171717]">Contact Us</Link></li>
              <li><Link to="/shipping-returns" className="hover:text-[#171717]">Shipping Information</Link></li>
              <li><Link to="/shipping-returns" className="hover:text-[#171717]">Returns &amp; Exchanges</Link></li>
              <li><Link to="/size-guide" className="hover:text-[#171717]">Size Guide</Link></li>
              <li><Link to="/faq" className="hover:text-[#171717]">FAQs</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-4">ABOUT</p>
            <ul className="space-y-2.5 text-sm text-[#777777]">
              <li><Link to="/about" className="hover:text-[#171717]">Our Story</Link></li>
              <li><Link to="/about#sustainability" className="hover:text-[#171717]">Sustainability</Link></li>
              <li><Link to="/track-order" className="hover:text-[#171717]">Track Order</Link></li>
              <li><Link to="/admin" className="hover:text-[#171717]">Store Admin</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-4">LEGAL</p>
            <ul className="space-y-2.5 text-sm text-[#777777]">
              <li><Link to="/privacy-policy" className="hover:text-[#171717]">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#171717]">Terms &amp; Conditions</Link></li>
              <li><Link to="/shipping-returns" className="hover:text-[#171717]">Refund Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E8E8E5] pt-8 text-xs text-[#777777]">
          <p>© {new Date().getFullYear()} ATELIER Studio Pvt. Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-[#171717]">
            <span>Razorpay</span>
            <span aria-hidden="true">·</span>
            <span>UPI</span>
            <span aria-hidden="true">·</span>
            <span>Stripe</span>
            <span aria-hidden="true">·</span>
            <span>Visa / Mastercard</span>
            <span aria-hidden="true">·</span>
            <span>Cash on Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
