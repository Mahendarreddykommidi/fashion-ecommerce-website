import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Lock, Truck, CreditCard, Banknote, AlertCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { SeoHead } from '../components/common/SeoHead.tsx';
import { SmartImage } from '../components/common/SmartImage.tsx';
import { formatINR } from '../lib/format.ts';
import type { Address, Order, PaymentGatewayStatus, PaymentMethod } from '../types/ecommerce.ts';

const checkoutSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Valid email address is required'),
  phone: z.string().trim().min(7, 'Valid mobile number is required').max(20),
  address_line: z.string().trim().min(2, 'House or building is required'),
  street: z.string().trim().min(2, 'Street is required'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  postal_code: z.string().trim().min(4, 'Postal code is required').max(16),
  country: z.string().trim().min(2, 'Country is required'),
  save_address: z.boolean().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function Checkout() {
  const { items, appliedCoupon, clearCart, settings } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [deliveryOption, setDeliveryOption] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [gateways, setGateways] = useState<PaymentGatewayStatus>({
    razorpay_enabled: false,
    stripe_enabled: false,
    cod_enabled: true,
  });
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [totals, setTotals] = useState<{
    subtotal: number;
    discount: number;
    shipping_fee: number;
    tax_amount: number;
    total_amount: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address_line: '',
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      save_address: true,
    },
  });

  useEffect(() => {
    apiFetch<{ gateways: PaymentGatewayStatus }>('/api/settings/public')
      .then((res) => setGateways(res.gateways))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setValue('full_name', user.full_name);
    setValue('email', user.email);
    if (user.phone) setValue('phone', user.phone);
    apiFetch<{ addresses: Address[] }>('/api/account/addresses')
      .then((res) => {
        setSavedAddresses(res.addresses);
        const def = res.addresses.find((a) => a.is_default) || res.addresses[0];
        if (def) applySavedAddress(def);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (items.length === 0) return;
    apiFetch<{
      subtotal: number;
      discount: number;
      shipping_fee: number;
      tax_amount: number;
      total_amount: number;
    }>('/api/checkout/calculate', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map((i) => ({ product_variant_id: i.product_variant_id, quantity: i.quantity })),
        coupon_code: appliedCoupon?.code || null,
        delivery_option: deliveryOption,
      }),
    })
      .then(setTotals)
      .catch(() => {});
  }, [items, appliedCoupon, deliveryOption]);

  const applySavedAddress = (addr: Address) => {
    setValue('full_name', addr.full_name);
    setValue('phone', addr.phone);
    setValue('address_line', addr.address_line);
    setValue('street', addr.street);
    setValue('city', addr.city);
    setValue('state', addr.state);
    setValue('postal_code', addr.postal_code);
    setValue('country', addr.country);
  };

  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const onSubmitOrder = async (values: CheckoutFormValues) => {
    if (items.length === 0) return;
    setSubmitting(true);
    setPaymentError(null);

    try {
      const { order } = await apiFetch<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((i) => ({
            product_variant_id: i.product_variant_id,
            quantity: i.quantity,
          })),
          shipping_address: {
            full_name: values.full_name,
            email: values.email,
            phone: values.phone,
            address_line: values.address_line,
            street: values.street,
            city: values.city,
            state: values.state,
            postal_code: values.postal_code,
            country: values.country,
          },
          save_address: Boolean(values.save_address),
          delivery_option: deliveryOption,
          payment_method: paymentMethod,
          coupon_code: appliedCoupon?.code || null,
        }),
      });

      if (paymentMethod === 'cod') {
        clearCart();
        showToast(`Order ${order.order_number} confirmed!`);
        navigate(`/order-confirmation/${order.order_number}`);
        return;
      }

      if (paymentMethod === 'razorpay') {
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) {
          throw new Error('Could not load Razorpay checkout script.');
        }
        const rzpData = await apiFetch<{
          razorpay_order_id: string;
          amount: number;
          currency: string;
          key_id: string;
        }>('/api/payments/razorpay/order', {
          method: 'POST',
          body: JSON.stringify({ order_number: order.order_number }),
        });

        const rzp = new window.Razorpay({
          key: rzpData.key_id,
          amount: rzpData.amount,
          currency: rzpData.currency,
          name: 'ATELIER',
          description: `Order ${order.order_number}`,
          order_id: rzpData.razorpay_order_id,
          prefill: {
            name: values.full_name,
            email: values.email,
            contact: values.phone,
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await apiFetch('/api/payments/razorpay/verify', {
                method: 'POST',
                body: JSON.stringify({
                  order_number: order.order_number,
                  ...response,
                }),
              });
              clearCart();
              showToast(`Payment verified. Order ${order.order_number} confirmed!`);
              navigate(`/order-confirmation/${order.order_number}`);
            } catch (err: any) {
              setPaymentError(err.message || 'Payment verification failed. Please retry.');
            }
          },
        });
        rzp.open();
        return;
      }

      if (paymentMethod === 'stripe') {
        const stripeSession = await apiFetch<{ url: string }>('/api/payments/stripe/session', {
          method: 'POST',
          body: JSON.stringify({ order_number: order.order_number }),
        });
        window.location.assign(stripeSession.url);
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Unable to process checkout.');
      showToast(err.message || 'Checkout failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-[#171717]">Your bag is empty</h1>
        <p className="mt-2 text-sm text-[#777777]">Add items to your bag before proceeding to checkout.</p>
        <Link
          to="/shop"
          className="mt-6 inline-block rounded-full bg-[#171717] px-6 py-3 text-xs font-semibold text-white"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  return (
    <>
      <SeoHead title="Checkout" description="Complete your ATELIER order securely." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8E5] pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Secure Checkout</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[#171717]">Complete Your Order</h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            {[
              { n: 1, label: '1. Details & Address' },
              { n: 2, label: '2. Delivery' },
              { n: 3, label: '3. Payment' },
            ].map((s) => (
              <button
                key={s.n}
                type="button"
                onClick={() => setStep(s.n as 1 | 2 | 3)}
                className={`rounded-full px-3.5 py-1.5 transition-colors ${
                  step === s.n
                    ? 'bg-[#171717] text-white'
                    : step > s.n
                      ? 'bg-[#B8F56A] text-[#171717]'
                      : 'bg-[#F2F2EF] text-[#777777]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {paymentError && (
          <div role="alert" className="mt-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="flex-1">{paymentError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmitOrder)} className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Customer & Address */}
            <div className="rounded-3xl border border-[#E8E8E5] bg-white p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[#171717]">
                  Customer Details &amp; Shipping Address
                </h2>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold underline text-[#777777] hover:text-[#171717]"
                  >
                    Edit
                  </button>
                )}
              </div>

              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#777777]">Saved Addresses</p>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => applySavedAddress(addr)}
                        className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] p-3 text-left text-xs hover:border-[#171717]"
                      >
                        <p className="font-semibold text-[#171717]">{addr.full_name}</p>
                        <p className="text-[#777777] truncate">{addr.address_line}, {addr.city}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Full Name</label>
                  <input
                    {...register('full_name')}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
                  />
                  {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Email Address</label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    {...register('phone')}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">House / Building / Apt</label>
                  <input
                    {...register('address_line')}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
                  />
                  {errors.address_line && <p className="mt-1 text-xs text-red-600">{errors.address_line.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#171717] mb-1">Street &amp; Locality</label>
                  <input
                    {...register('street')}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
                  />
                  {errors.street && <p className="mt-1 text-xs text-red-600">{errors.street.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">City</label>
                  <input
                    {...register('city')}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
                  />
                  {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">State</label>
                  <input
                    {...register('state')}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
                  />
                  {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Postal Code</label>
                  <input
                    {...register('postal_code')}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
                  />
                  {errors.postal_code && <p className="mt-1 text-xs text-red-600">{errors.postal_code.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Country</label>
                  <input
                    {...register('country')}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
                  />
                  {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country.message}</p>}
                </div>
              </div>

              {user && (
                <label className="flex items-center gap-2 text-xs text-[#777777] cursor-pointer">
                  <input type="checkbox" {...register('save_address')} className="accent-[#171717]" />
                  Save this address to my account
                </label>
              )}

              {step === 1 && (
                <button
                  type="button"
                  onClick={async () => {
                    const valid = await trigger([
                      'full_name',
                      'email',
                      'phone',
                      'address_line',
                      'street',
                      'city',
                      'state',
                      'postal_code',
                      'country',
                    ]);
                    if (valid) setStep(2);
                  }}
                  className="rounded-full bg-[#171717] px-6 py-3 text-xs font-semibold text-white"
                >
                  Continue to Delivery
                </button>
              )}
            </div>

            {/* Step 2: Delivery Option */}
            <div className="rounded-3xl border border-[#E8E8E5] bg-white p-6 sm:p-8 space-y-4">
              <h2 className="font-display text-xl font-bold text-[#171717]">Delivery Method</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryOption('standard');
                    setStep(3);
                  }}
                  className={`flex items-start justify-between rounded-2xl border p-4 text-left transition-colors ${
                    deliveryOption === 'standard'
                      ? 'border-[#171717] bg-[#F2F2EF]/60'
                      : 'border-[#E8E8E5] hover:border-[#171717]'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-[#171717] flex items-center gap-1.5">
                      <Truck className="h-4 w-4" /> Standard Delivery
                    </p>
                    <p className="mt-1 text-xs text-[#777777]">3–5 business days</p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums">
                    {(totals?.subtotal || 0) >= settings.free_shipping_threshold
                      ? 'Free'
                      : formatINR(settings.standard_shipping_fee)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeliveryOption('express');
                    setStep(3);
                  }}
                  className={`flex items-start justify-between rounded-2xl border p-4 text-left transition-colors ${
                    deliveryOption === 'express'
                      ? 'border-[#171717] bg-[#F2F2EF]/60'
                      : 'border-[#E8E8E5] hover:border-[#171717]'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-[#171717] flex items-center gap-1.5">
                      <Truck className="h-4 w-4" /> Express Priority
                    </p>
                    <p className="mt-1 text-xs text-[#777777]">1–2 business days</p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums">
                    {formatINR(settings.express_shipping_fee)}
                  </span>
                </button>
              </div>
            </div>

            {/* Step 3: Payment Method */}
            <div className="rounded-3xl border border-[#E8E8E5] bg-white p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[#171717]">Payment Method</h2>
                <span className="inline-flex items-center gap-1 text-xs text-[#777777]">
                  <Lock className="h-3.5 w-3.5" /> Server-verified
                </span>
              </div>

              <div className="space-y-3">
                {/* Cash on Delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${
                    paymentMethod === 'cod' ? 'border-[#171717] bg-[#F2F2EF]/70' : 'border-[#E8E8E5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Banknote className="h-5 w-5 text-[#171717]" />
                    <div>
                      <p className="text-sm font-semibold text-[#171717]">Cash on Delivery (COD)</p>
                      <p className="text-xs text-[#777777]">
                        Pay {totals ? formatINR(totals.total_amount) : ''} via cash or UPI at your doorstep.
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'cod' && <Check className="h-4 w-4 text-[#171717]" />}
                </button>

                {/* Razorpay */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${
                    paymentMethod === 'razorpay' ? 'border-[#171717] bg-[#F2F2EF]/70' : 'border-[#E8E8E5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-[#171717]" />
                    <div>
                      <p className="text-sm font-semibold text-[#171717]">
                        Razorpay (UPI, Cards, Netbanking)
                      </p>
                      <p className="text-xs text-[#777777]">
                        {gateways.razorpay_enabled
                          ? 'Instant HMAC-SHA256 verified Indian payments.'
                          : 'Requires RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in server environment.'}
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'razorpay' && <Check className="h-4 w-4 text-[#171717]" />}
                </button>

                {/* Stripe */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${
                    paymentMethod === 'stripe' ? 'border-[#171717] bg-[#F2F2EF]/70' : 'border-[#E8E8E5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-[#171717]" />
                    <div>
                      <p className="text-sm font-semibold text-[#171717]">
                        Stripe (International Cards)
                      </p>
                      <p className="text-xs text-[#777777]">
                        {gateways.stripe_enabled
                          ? 'Hosted Stripe Checkout with server session verification.'
                          : 'Requires STRIPE_SECRET_KEY in server environment.'}
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'stripe' && <Check className="h-4 w-4 text-[#171717]" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 w-full rounded-full bg-[#171717] py-4 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors"
              >
                {submitting
                  ? 'Processing Order...'
                  : paymentMethod === 'cod'
                    ? `Place COD Order · ${totals ? formatINR(totals.total_amount) : ''}`
                    : `Pay Securely · ${totals ? formatINR(totals.total_amount) : ''}`}
              </button>
            </div>
          </div>

          {/* Right Order Summary */}
          <aside className="lg:col-span-5">
            <div className="sticky top-24 rounded-3xl border border-[#E8E8E5] bg-white p-6 sm:p-8 space-y-5">
              <h2 className="font-display text-xl font-bold text-[#171717]">
                Order Summary ({items.reduce((s, i) => s + i.quantity, 0)} items)
              </h2>

              <ul className="divide-y divide-[#E8E8E5] max-h-80 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li key={item.product_variant_id} className="flex gap-3 py-3">
                    <div className="h-16 w-14 rounded-xl overflow-hidden bg-[#F2F2EF] shrink-0">
                      <SmartImage src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#171717] truncate">{item.product_name}</p>
                      <p className="text-xs text-[#777777]">
                        {item.selected_size} · {item.selected_color} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatINR(item.unit_price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              {totals && (
                <div className="space-y-2 border-t border-[#E8E8E5] pt-4 text-sm tabular-nums">
                  <div className="flex justify-between text-[#777777]">
                    <span>Subtotal</span>
                    <span className="text-[#171717]">{formatINR(totals.subtotal)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span>-{formatINR(totals.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#777777]">
                    <span>Shipping ({deliveryOption})</span>
                    <span className="text-[#171717]">
                      {totals.shipping_fee === 0 ? 'Free' : formatINR(totals.shipping_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#777777]">
                    <span>GST ({settings.tax_rate_percent}%)</span>
                    <span className="text-[#171717]">{formatINR(totals.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E8E8E5] pt-3 text-base font-bold text-[#171717]">
                    <span>Final Payable</span>
                    <span>{formatINR(totals.total_amount)}</span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[#777777] leading-relaxed">
                Shipping to: {getValues('city') ? `${getValues('city')}, ${getValues('postal_code')}` : 'Enter your address on the left'}.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </>
  );
}
