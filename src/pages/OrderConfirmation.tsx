import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Package, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { useCart } from '../contexts/CartContext.tsx';
import { SeoHead } from '../components/common/SeoHead.tsx';
import { SmartImage } from '../components/common/SmartImage.tsx';
import { formatDate, formatINR } from '../lib/format.ts';
import type { Order } from '../types/ecommerce.ts';

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const stripeSessionId = searchParams.get('stripe_session_id');
  const { clearCart } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    const load = async () => {
      try {
        if (stripeSessionId) {
          const verified = await apiFetch<{ order: Order }>(
            `/api/payments/stripe/verify?session_id=${encodeURIComponent(stripeSessionId)}`
          );
          clearCart();
          setOrder(verified.order);
        } else {
          const res = await apiFetch<{ order: Order }>(`/api/orders/track/${encodeURIComponent(orderNumber)}`);
          setOrder(res.order);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load order confirmation.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderNumber, stripeSessionId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-sm text-[#777777]">
        Confirming your order...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-[#171717]">Order Not Found</h1>
        <p className="mt-2 text-sm text-[#777777]">{error}</p>
        <Link to="/shop" className="mt-6 inline-block rounded-full bg-[#171717] px-6 py-3 text-xs font-semibold text-white">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      <SeoHead title={`Order ${order.order_number} Confirmed`} description="Your ATELIER order receipt and tracking summary." />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="rounded-3xl border border-[#E8E8E5] bg-white p-6 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#B8F56A] text-[#171717]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Order Confirmation</p>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#171717]">
                Order #{order.order_number} Confirmed
              </h1>
              <p className="mt-1 text-sm text-[#777777]">
                Placed on {formatDate(order.created_at)} · Status: <span className="capitalize font-medium text-[#171717]">{order.order_status}</span>
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 rounded-2xl bg-[#F2F2EF]/60 p-5 text-xs">
            <div>
              <p className="font-semibold uppercase tracking-wider text-[#777777]">Delivery Address</p>
              <p className="mt-1.5 font-semibold text-[#171717]">{order.shipping_address.full_name}</p>
              <p className="text-[#777777]">
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
              </p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wider text-[#777777]">Payment &amp; Method</p>
              <p className="mt-1.5 font-semibold uppercase text-[#171717]">{order.payment_method}</p>
              <p className="text-[#777777] capitalize">Payment status: {order.payment_status.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="divide-y divide-[#E8E8E5] border-t border-b border-[#E8E8E5]">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-4">
                <div className="h-16 w-14 rounded-xl overflow-hidden bg-[#F2F2EF] shrink-0">
                  <SmartImage src={item.image_url_snapshot} alt={item.product_name_snapshot} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#171717] truncate">{item.product_name_snapshot}</p>
                  <p className="text-xs text-[#777777]">
                    Size {item.selected_size} · {item.selected_color} · Qty {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatINR(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-sm tabular-nums">
            <div className="flex justify-between text-[#777777]"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{formatINR(order.discount)}</span></div>
            )}
            <div className="flex justify-between text-[#777777]"><span>Shipping</span><span>{order.shipping_fee === 0 ? 'Free' : formatINR(order.shipping_fee)}</span></div>
            <div className="flex justify-between text-[#777777]"><span>Taxes</span><span>{formatINR(order.tax_amount)}</span></div>
            <div className="flex justify-between border-t border-[#E8E8E5] pt-3 text-base font-bold text-[#171717]">
              <span>Total</span><span>{formatINR(order.total_amount)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to={`/track-order?order=${encodeURIComponent(order.order_number)}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-[#171717] py-3 text-xs font-semibold text-[#171717]"
            >
              <Package className="h-4 w-4" /> Track Order
            </Link>
            <Link
              to="/shop"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#171717] py-3 text-xs font-semibold text-white"
            >
              Continue Shopping <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
