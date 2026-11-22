import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Search } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { SeoHead } from '../components/common/SeoHead.tsx';
import { formatDate, formatINR } from '../lib/format.ts';
import type { Order } from '../types/ecommerce.ts';

const STATUS_STEPS = ['confirmed', 'packed', 'shipped', 'delivered'];

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (num: string, mail?: string) => {
    if (!num.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const q = mail?.trim() ? `?email=${encodeURIComponent(mail.trim())}` : '';
      const res = await apiFetch<{ order: Order }>(`/api/orders/track/${encodeURIComponent(num.trim())}${q}`);
      setOrder(res.order);
    } catch (err: any) {
      setOrder(null);
      setError(err.message || 'Order not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = searchParams.get('order');
    if (initial) lookup(initial);
  }, []);

  const currentIdx = order ? STATUS_STEPS.indexOf(order.order_status) : -1;

  return (
    <>
      <SeoHead title="Track Order" description="Track the live fulfillment and shipment status of your ATELIER order." />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Fulfillment Status</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#171717]">Track Your Order</h1>
        <p className="mt-2 text-sm text-[#777777]">
          Enter your order number (for example ATL-2026-104200) and billing email to inspect live status and tracking details.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(orderNumber, email);
          }}
          className="mt-6 grid sm:grid-cols-3 gap-3 rounded-2xl border border-[#E8E8E5] bg-white p-4"
        >
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Order Number (ATL-...)"
            className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Order Email (optional)"
            className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#171717] px-5 py-2.5 text-xs font-semibold text-white"
          >
            <Search className="h-3.5 w-3.5" /> {loading ? 'Searching...' : 'Track Order'}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {order && (
          <div className="mt-8 rounded-3xl border border-[#E8E8E5] bg-white p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8E5] pb-4">
              <div>
                <p className="font-mono text-sm font-semibold text-[#171717]">{order.order_number}</p>
                <p className="text-xs text-[#777777]">Placed {formatDate(order.created_at)}</p>
              </div>
              <span className="rounded-full bg-[#B8F56A] px-3.5 py-1 text-xs font-bold uppercase text-[#171717]">
                {order.order_status}
              </span>
            </div>

            {order.order_status !== 'cancelled' && (
              <div className="grid grid-cols-4 gap-2 text-center">
                {STATUS_STEPS.map((st, idx) => (
                  <div key={st} className="space-y-2">
                    <div
                      className={`h-2 rounded-full ${
                        idx <= currentIdx ? 'bg-[#171717]' : 'bg-[#E8E8E5]'
                      }`}
                    />
                    <p className={`text-xs capitalize ${idx <= currentIdx ? 'font-semibold text-[#171717]' : 'text-[#777777]'}`}>
                      {st}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#F2F2EF]/60 p-4 text-xs">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[#777777]" />
                <span>
                  Tracking Number:{' '}
                  <strong className="font-mono text-[#171717]">
                    {order.tracking_number || 'Assigned upon dispatch'}
                  </strong>
                </span>
              </div>
              <span className="font-semibold tabular-nums">Total: {formatINR(order.total_amount)}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
