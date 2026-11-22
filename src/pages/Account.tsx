import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, User, MapPin, Heart, LogOut, Plus, Trash2, Check, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useWishlist } from '../contexts/WishlistContext.tsx';
import { useCart } from '../contexts/CartContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { SeoHead } from '../components/common/SeoHead.tsx';
import { SmartImage } from '../components/common/SmartImage.tsx';
import { formatDate, formatINR } from '../lib/format.ts';
import type { Address, Order } from '../types/ecommerce.ts';

type Tab = 'overview' | 'orders' | 'profile' | 'addresses' | 'wishlist';

export default function Account() {
  const { user, logout, updateUserState } = useAuth();
  const { products: wishlistProducts, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [addrFormOpen, setAddrFormOpen] = useState(false);
  const [newAddr, setNewAddr] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address_line: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/account');
      return;
    }
    setFullName(user.full_name);
    setPhone(user.phone || '');
    apiFetch<{ orders: Order[] }>('/api/orders').then((r) => setOrders(r.orders)).catch(() => {});
    apiFetch<{ addresses: Address[] }>('/api/account/addresses').then((r) => setAddresses(r.addresses)).catch(() => {});
  }, [user, navigate]);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await apiFetch<{ user: typeof user }>('/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: fullName, phone }),
      });
      updateUserState(res.user);
      showToast('Profile updated');
    } catch (err: any) {
      showToast(err.message || 'Could not update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ address: Address }>('/api/account/addresses', {
        method: 'POST',
        body: JSON.stringify(newAddr),
      });
      const updatedList = await apiFetch<{ addresses: Address[] }>('/api/account/addresses');
      setAddresses(updatedList.addresses.length ? updatedList.addresses : [res.address]);
      setAddrFormOpen(false);
      setNewAddr({
        full_name: user.full_name,
        phone: user.phone || '',
        address_line: '',
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        is_default: false,
      });
      showToast('Address saved');
    } catch (err: any) {
      showToast(err.message || 'Could not save address', 'error');
    }
  };

  const handleSetDefault = async (id: string) => {
    await apiFetch(`/api/account/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_default: true }),
    });
    const res = await apiFetch<{ addresses: Address[] }>('/api/account/addresses');
    setAddresses(res.addresses);
    showToast('Default address updated');
  };

  const handleDeleteAddress = async (id: string) => {
    await apiFetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    showToast('Address deleted', 'info');
  };

  const handleCancelOrder = async (orderNumber: string) => {
    try {
      const res = await apiFetch<{ order: Order }>(`/api/orders/${encodeURIComponent(orderNumber)}/cancel`, {
        method: 'POST',
      });
      setOrders((prev) => prev.map((o) => (o.order_number === orderNumber ? res.order : o)));
      showToast(`Order ${orderNumber} cancelled`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Cannot cancel order', 'error');
    }
  };

  return (
    <>
      <SeoHead title="My Account" description="Manage your ATELIER orders, addresses, profile, and wishlist." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8E5] pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Customer Portal</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[#171717]">
              Welcome, {user.full_name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#B8F56A] px-4 py-2 text-xs font-bold text-[#171717]"
              >
                <Shield className="h-3.5 w-3.5" /> Admin Dashboard
              </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
                showToast('Signed out', 'info');
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E8E5] bg-white px-4 py-2 text-xs font-semibold text-[#171717] hover:border-[#171717]"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0">
              {[
                { key: 'overview', label: 'Overview', icon: User },
                { key: 'orders', label: `My Orders (${orders.length})`, icon: Package },
                { key: 'profile', label: 'My Profile', icon: User },
                { key: 'addresses', label: `My Addresses (${addresses.length})`, icon: MapPin },
                { key: 'wishlist', label: `My Wishlist (${wishlistProducts.length})`, icon: Heart },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key as Tab)}
                    className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                      tab === item.key
                        ? 'bg-[#171717] text-white'
                        : 'bg-white border border-[#E8E8E5] text-[#171717] hover:bg-[#F2F2EF]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Tab Panel */}
          <div className="lg:col-span-9">
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-[#E8E8E5] bg-white p-5">
                    <p className="text-xs text-[#777777]">Total Orders</p>
                    <p className="mt-1 font-display text-2xl font-bold tabular-nums">{orders.length}</p>
                  </div>
                  <div className="rounded-2xl border border-[#E8E8E5] bg-white p-5">
                    <p className="text-xs text-[#777777]">Saved Addresses</p>
                    <p className="mt-1 font-display text-2xl font-bold tabular-nums">{addresses.length}</p>
                  </div>
                  <div className="rounded-2xl border border-[#E8E8E5] bg-white p-5">
                    <p className="text-xs text-[#777777]">Wishlist Pieces</p>
                    <p className="mt-1 font-display text-2xl font-bold tabular-nums">{wishlistProducts.length}</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#E8E8E5] bg-white p-6">
                  <h2 className="font-display text-lg font-bold text-[#171717] mb-4">Account Details</h2>
                  <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs text-[#777777]">Name</dt>
                      <dd className="font-medium text-[#171717]">{user.full_name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#777777]">Email</dt>
                      <dd className="font-medium text-[#171717]">{user.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#777777]">Phone</dt>
                      <dd className="font-medium text-[#171717]">{user.phone || 'Not provided'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-3xl border border-[#E8E8E5] bg-white p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg font-bold text-[#171717]">Recent Orders</h2>
                    <button type="button" onClick={() => setTab('orders')} className="text-xs font-semibold underline">
                      View all
                    </button>
                  </div>
                  {orders.length === 0 ? (
                    <p className="text-sm text-[#777777]">You haven't placed an order yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 3).map((o) => (
                        <div key={o.id} className="flex items-center justify-between rounded-2xl border border-[#E8E8E5] p-4 text-sm">
                          <div>
                            <p className="font-mono font-semibold text-[#171717]">{o.order_number}</p>
                            <p className="text-xs text-[#777777]">{formatDate(o.created_at)} · {o.items.length} items</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold tabular-nums">{formatINR(o.total_amount)}</p>
                            <p className="text-xs capitalize text-[#777777]">{o.order_status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="rounded-3xl border border-[#E8E8E5] bg-white p-10 text-center">
                    <p className="text-sm text-[#777777]">No orders found yet.</p>
                    <Link to="/shop" className="mt-4 inline-block rounded-full bg-[#171717] px-6 py-2.5 text-xs font-semibold text-white">
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="rounded-3xl border border-[#E8E8E5] bg-white p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E8E5] pb-4">
                        <div>
                          <p className="font-mono text-sm font-bold text-[#171717]">{order.order_number}</p>
                          <p className="text-xs text-[#777777]">
                            {formatDate(order.created_at)} · Payment: {order.payment_method.toUpperCase()} ({order.payment_status.replace('_', ' ')})
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#F2F2EF] px-3 py-1 text-xs font-semibold capitalize">
                            {order.order_status}
                          </span>
                          <Link
                            to={`/track-order?order=${encodeURIComponent(order.order_number)}`}
                            className="rounded-full border border-[#E8E8E5] px-3 py-1 text-xs font-semibold hover:border-[#171717]"
                          >
                            Track
                          </Link>
                          {!['shipped', 'delivered', 'cancelled'].includes(order.order_status) && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(order.order_number)}
                              className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="text-[#171717]">
                              {item.product_name_snapshot} ({item.selected_size} / {item.selected_color}) × {item.quantity}
                            </span>
                            <span className="font-semibold tabular-nums">{formatINR(item.unit_price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between border-t border-[#E8E8E5] pt-3 text-sm font-bold tabular-nums">
                        <span>Total Paid</span>
                        <span>{formatINR(order.total_amount)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="rounded-3xl border border-[#E8E8E5] bg-white p-6 sm:p-8 space-y-4 max-w-xl">
                <h2 className="font-display text-xl font-bold text-[#171717]">Edit Profile</h2>
                <div>
                  <label className="block text-xs font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#F2F2EF] px-3.5 py-2.5 text-sm text-[#777777]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-full bg-[#171717] px-6 py-3 text-xs font-semibold text-white"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            )}

            {tab === 'addresses' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-display text-xl font-bold">Saved Addresses</h2>
                  <button
                    type="button"
                    onClick={() => setAddrFormOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#171717] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Address
                  </button>
                </div>

                {addrFormOpen && (
                  <form onSubmit={handleAddAddress} className="rounded-3xl border border-[#E8E8E5] bg-white p-6 grid sm:grid-cols-2 gap-4">
                    <input
                      required
                      placeholder="Full Name"
                      value={newAddr.full_name}
                      onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                    />
                    <input
                      required
                      placeholder="Phone"
                      value={newAddr.phone}
                      onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                    />
                    <input
                      required
                      placeholder="House / Building"
                      value={newAddr.address_line}
                      onChange={(e) => setNewAddr({ ...newAddr, address_line: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                    />
                    <input
                      required
                      placeholder="Street"
                      value={newAddr.street}
                      onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                    />
                    <input
                      required
                      placeholder="City"
                      value={newAddr.city}
                      onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                    />
                    <input
                      required
                      placeholder="State"
                      value={newAddr.state}
                      onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                    />
                    <input
                      required
                      placeholder="Postal Code"
                      value={newAddr.postal_code}
                      onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                    />
                    <input
                      required
                      placeholder="Country"
                      value={newAddr.country}
                      onChange={(e) => setNewAddr({ ...newAddr, country: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                    />
                    <div className="sm:col-span-2 flex gap-3">
                      <button type="submit" className="rounded-full bg-[#171717] px-6 py-2.5 text-xs font-semibold text-white">
                        Save Address
                      </button>
                      <button type="button" onClick={() => setAddrFormOpen(false)} className="rounded-full border border-[#E8E8E5] px-5 py-2.5 text-xs">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="rounded-2xl border border-[#E8E8E5] bg-white p-5 flex flex-col justify-between gap-3">
                      <div className="text-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-[#171717]">{addr.full_name}</p>
                          {addr.is_default && (
                            <span className="rounded-md bg-[#B8F56A] px-2 py-0.5 text-[10px] font-bold">Default</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#777777]">{addr.address_line}, {addr.street}</p>
                        <p className="text-xs text-[#777777]">{addr.city}, {addr.state} {addr.postal_code}</p>
                        <p className="text-xs text-[#777777]">{addr.phone}</p>
                      </div>
                      <div className="flex items-center gap-3 pt-2 border-t border-[#E8E8E5] text-xs">
                        {!addr.is_default && (
                          <button type="button" onClick={() => handleSetDefault(addr.id)} className="inline-flex items-center gap-1 font-semibold hover:underline">
                            <Check className="h-3 w-3" /> Set Default
                          </button>
                        )}
                        <button type="button" onClick={() => handleDeleteAddress(addr.id)} className="inline-flex items-center gap-1 text-red-600 hover:underline ml-auto">
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'wishlist' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {wishlistProducts.length === 0 ? (
                  <div className="sm:col-span-3 rounded-3xl border border-[#E8E8E5] bg-white p-10 text-center text-sm text-[#777777]">
                    No saved items in your wishlist.
                  </div>
                ) : (
                  wishlistProducts.map((p) => (
                    <div key={p.id} className="rounded-2xl border border-[#E8E8E5] bg-white overflow-hidden flex flex-col">
                      <Link to={`/product/${p.slug}`} className="aspect-[3/4] bg-[#F2F2EF]">
                        <SmartImage src={p.images[0]?.image_url} alt={p.name} className="h-full w-full object-cover" />
                      </Link>
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-[#171717] truncate">{p.name}</p>
                          <p className="text-xs font-semibold tabular-nums">{formatINR(p.sale_price ?? p.base_price)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const v = p.variants.find((vr) => vr.stock_quantity > 0);
                              if (v) {
                                await addToCart(p, v, 1, true);
                                showToast('Added to bag');
                              }
                            }}
                            className="flex-1 rounded-full bg-[#171717] py-2 text-xs font-semibold text-white"
                          >
                            Add to Bag
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleWishlist(p.id)}
                            className="rounded-full border border-[#E8E8E5] px-3 py-2 text-xs text-[#777777]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
