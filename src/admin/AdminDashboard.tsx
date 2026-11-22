import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Tag,
  MessageSquare,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Shield,
  LogOut,
  Search,
  RefreshCcw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { SeoHead } from '../components/common/SeoHead.tsx';
import { SmartImage } from '../components/common/SmartImage.tsx';
import { formatDate, formatINR } from '../lib/format.ts';
import type {
  Category,
  Coupon,
  Order,
  OrderStatus,
  PaymentGatewayStatus,
  Product,
  Review,
  StoreSettings,
  UserProfile,
} from '../types/ecommerce.ts';

interface OverviewResponse {
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
  };
  statusCounts: Record<string, number>;
  revenueSeries: Array<{ date: string; revenue: number }>;
  recentOrders: Order[];
  bestsellers: Product[];
}

interface AdminCustomer extends UserProfile {
  order_count: number;
  total_spent: number;
  orders: Order[];
}

const ADMIN_TABS = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/categories', label: 'Categories', icon: FolderTree },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/admin/customers', label: 'Customers', icon: Users },
  { path: '/admin/coupons', label: 'Coupons', icon: Tag },
  { path: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminDashboard() {
  const { user, login, claimAdmin, logout } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [adminStatus, setAdminStatus] = useState<{
    hasAdmin: boolean;
    bootstrapAvailable: boolean;
    requiresPasscode: boolean;
  } | null>(null);

  // Auth / Claim form states
  const [authForm, setAuthForm] = useState({ full_name: '', email: '', password: '', passcode: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Admin data states
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [gateways, setGateways] = useState<PaymentGatewayStatus | null>(null);

  // Product modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    description: '',
    fabric_info: '100% Organic Cotton',
    care_info: 'Machine wash cold. Lay flat to dry.',
    category_id: '',
    gender: 'unisex' as 'men' | 'women' | 'unisex',
    brand: 'ATELIER ORIGINALS',
    collection: 'The Everyday Edit',
    base_price: '1999',
    sale_price: '',
    featured: false,
    bestseller: false,
    new_arrival: true,
    images: ['/src/assets/images/prod_oversized_tee_1795358068409.jpg'],
    sizesText: 'S, M, L, XL',
    colorName: 'Chalk White',
    colorHex: '#F4F3EE',
    stock: '25',
  });

  // Category creation state
  const [catForm, setCatForm] = useState({
    name: '',
    subtitle: '',
    description: '',
    image_url: '/src/assets/images/prod_casual_shirt_1795358068564.jpg',
  });

  // Order search/filter/detail
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingDraft, setTrackingDraft] = useState('');

  // Coupon form
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '15',
    minimum_order: '999',
    maximum_discount: '1000',
    expiry_date: '2027-12-31',
    usage_limit: '500',
  });

  useEffect(() => {
    apiFetch<{ hasAdmin: boolean; bootstrapAvailable: boolean; requiresPasscode: boolean }>('/api/auth/admin-status')
      .then(setAdminStatus)
      .catch(() => {});
  }, [user]);

  const loadAllAdminData = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const [ov, pr, ct, or, cu, cp, rv, st] = await Promise.all([
        apiFetch<OverviewResponse>('/api/admin/overview'),
        apiFetch<{ products: Product[] }>('/api/admin/products'),
        apiFetch<{ categories: Category[] }>('/api/categories'),
        apiFetch<{ orders: Order[] }>('/api/admin/orders'),
        apiFetch<{ customers: AdminCustomer[] }>('/api/admin/customers'),
        apiFetch<{ coupons: Coupon[] }>('/api/admin/coupons'),
        apiFetch<{ reviews: Review[] }>('/api/admin/reviews'),
        apiFetch<{ settings: StoreSettings; gateways: PaymentGatewayStatus }>('/api/admin/settings'),
      ]);
      setOverview(ov);
      setProducts(pr.products);
      setCategories(ct.categories);
      setOrders(or.orders);
      setCustomers(cu.customers);
      setCoupons(cp.coupons);
      setReviews(rv.reviews);
      setSettings(st.settings);
      setGateways(st.gateways);
      if (ct.categories.length > 0 && !prodForm.category_id) {
        setProdForm((f) => ({ ...f, category_id: ct.categories[0].id }));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load admin data', 'error');
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, [user]);

  const handleClaimOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      if (adminStatus?.bootstrapAvailable || (adminStatus?.requiresPasscode && authForm.passcode)) {
        await claimAdmin({
          full_name: authForm.full_name || 'ATELIER Admin',
          email: authForm.email,
          password: authForm.password,
          passcode: authForm.passcode || undefined,
        });
        showToast('Administrator access configured and signed in');
      } else {
        const logged = await login(authForm.email, authForm.password);
        if (logged.role !== 'admin') {
          setAuthError('This account does not have administrator privileges.');
          return;
        }
        showToast('Signed in to ATELIER Admin');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (!user || user.role !== 'admin') {
    const showClaimForm = Boolean(adminStatus?.bootstrapAvailable);
    return (
      <>
        <SeoHead title="Admin Access" description="Secure ATELIER store administration portal." />
        <div className="mx-auto max-w-md px-4 py-16">
          <div className="rounded-3xl border border-[#E8E8E5] bg-white p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171717] text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">ATELIER Store Ops</p>
                <h1 className="font-display text-2xl font-bold text-[#171717]">
                  {showClaimForm ? 'Claim First-Run Admin' : 'Admin Sign In'}
                </h1>
              </div>
            </div>

            {showClaimForm ? (
              <p className="text-xs leading-relaxed text-[#777777]">
                No administrator has been configured yet. Create the initial store owner credentials below to lock and activate the admin console.
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-[#777777]">
                Sign in with an authorized administrator account to manage catalog, orders, coupons, and settings.
              </p>
            )}

            {user && user.role !== 'admin' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Currently signed in as customer ({user.email}). Sign out or enter admin credentials below.
              </div>
            )}

            {authError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {authError}
              </div>
            )}

            <form onSubmit={handleClaimOrLogin} className="space-y-4">
              {(showClaimForm || adminStatus?.requiresPasscode) && (
                <div>
                  <label className="block text-xs font-medium mb-1">Admin Full Name</label>
                  <input
                    required={showClaimForm}
                    value={authForm.full_name}
                    onChange={(e) => setAuthForm({ ...authForm, full_name: e.target.value })}
                    placeholder="Store Director"
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1">Admin Email</label>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  placeholder="admin@atelier-store.com"
                  className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={showClaimForm ? 8 : 1}
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder={showClaimForm ? 'Choose 8+ character password' : 'Enter password'}
                  className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                />
              </div>

              {adminStatus?.requiresPasscode && (
                <div>
                  <label className="block text-xs font-medium mb-1">Setup Passcode (Optional for existing admins)</label>
                  <input
                    type="password"
                    value={authForm.passcode}
                    onChange={(e) => setAuthForm({ ...authForm, passcode: e.target.value })}
                    className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full rounded-full bg-[#171717] py-3 text-xs font-semibold uppercase tracking-wider text-white"
              >
                {authSubmitting
                  ? 'Verifying...'
                  : showClaimForm
                    ? 'Claim Admin & Enter Console'
                    : 'Sign In to Admin'}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  const currentTab = location.pathname;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await apiFetch<{ url: string }>('/api/admin/upload', {
          method: 'POST',
          body: JSON.stringify({ dataUrl: reader.result }),
        });
        setProdForm((f) => ({ ...f, images: [...f.images.filter(Boolean), res.url] }));
        showToast('Image uploaded');
      } catch (err: any) {
        showToast(err.message || 'Upload failed', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const openCreateProduct = () => {
    setEditingProductId(null);
    setProdForm({
      name: '',
      description: '',
      fabric_info: '100% Organic Cotton',
      care_info: 'Machine wash cold. Lay flat to dry.',
      category_id: categories[0]?.id || '',
      gender: 'unisex',
      brand: 'ATELIER ORIGINALS',
      collection: 'The Everyday Edit',
      base_price: '1999',
      sale_price: '',
      featured: false,
      bestseller: false,
      new_arrival: true,
      images: ['/src/assets/images/prod_oversized_tee_1795358068409.jpg'],
      sizesText: 'S, M, L, XL',
      colorName: 'Chalk White',
      colorHex: '#F4F3EE',
      stock: '25',
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    const sizes = Array.from(new Set(p.variants.map((v) => v.size))).join(', ');
    const firstVar = p.variants[0];
    setProdForm({
      name: p.name,
      description: p.description,
      fabric_info: p.fabric_info,
      care_info: p.care_info,
      category_id: p.category_id,
      gender: p.gender,
      brand: p.brand,
      collection: p.collection,
      base_price: String(p.base_price),
      sale_price: p.sale_price ? String(p.sale_price) : '',
      featured: p.featured,
      bestseller: p.bestseller,
      new_arrival: p.new_arrival,
      images: p.images.map((i) => i.image_url),
      sizesText: sizes || 'S, M, L',
      colorName: firstVar?.color || 'Neutral',
      colorHex: firstVar?.color_hex || '#171717',
      stock: String(firstVar?.stock_quantity ?? 20),
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const sizes = prodForm.sizesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      name: prodForm.name,
      description: prodForm.description,
      fabric_info: prodForm.fabric_info,
      care_info: prodForm.care_info,
      category_id: prodForm.category_id,
      gender: prodForm.gender,
      brand: prodForm.brand,
      collection: prodForm.collection,
      base_price: Number(prodForm.base_price),
      sale_price: prodForm.sale_price ? Number(prodForm.sale_price) : null,
      featured: prodForm.featured,
      bestseller: prodForm.bestseller,
      new_arrival: prodForm.new_arrival,
      status: 'active',
      images: prodForm.images.filter(Boolean),
      variants: sizes.map((size) => ({
        size,
        color: prodForm.colorName,
        color_hex: prodForm.colorHex,
        stock_quantity: Number(prodForm.stock) || 0,
        price_adjustment: 0,
      })),
    };

    try {
      if (editingProductId) {
        await apiFetch(`/api/admin/products/${editingProductId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast('Product updated');
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Product created');
      }
      setProductModalOpen(false);
      await loadAllAdminData();
    } catch (err: any) {
      showToast(err.message || 'Could not save product', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    showToast('Product removed', 'info');
    await loadAllAdminData();
  };

  const handleUpdateOrderStatus = async (orderId: string, order_status: OrderStatus, tracking_number?: string) => {
    try {
      const res = await apiFetch<{ order: Order }>(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ order_status, tracking_number }),
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      if (selectedOrder?.id === orderId) setSelectedOrder(res.order);
      showToast(`Order ${res.order.order_number} updated`);
      await loadAllAdminData();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    }
  };

  const handleRefundOrder = async (orderId: string) => {
    try {
      const res = await apiFetch<{ order: Order }>(`/api/admin/orders/${orderId}/refund`, { method: 'POST' });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      setSelectedOrder(res.order);
      showToast('Order refunded and inventory restored');
      await loadAllAdminData();
    } catch (err: any) {
      showToast(err.message || 'Refund failed', 'error');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== 'all' && o.order_status !== orderFilter) return false;
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.shipping_address.full_name.toLowerCase().includes(q) ||
        o.shipping_address.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const maxRev = Math.max(1, ...(overview?.revenueSeries.map((r) => r.revenue) || [1]));

  return (
    <>
      <SeoHead title="Admin Dashboard" description="ATELIER Store Administration Console." />

      <div className="min-h-[85vh] bg-[#FAFAF8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8E5] pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">ATELIER Store Console</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#171717]">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadAllAdminData}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E8E5] bg-white px-4 py-2 text-xs font-semibold"
              >
                <RefreshCcw className="h-3.5 w-3.5" /> Refresh
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#171717] px-4 py-2 text-xs font-semibold text-white"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Admin Sidebar */}
            <aside className="lg:col-span-3">
              <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0">
                {ADMIN_TABS.map((t) => {
                  const Icon = t.icon;
                  const active = currentTab === t.path;
                  return (
                    <Link
                      key={t.path}
                      to={t.path}
                      className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-[#171717] text-white'
                          : 'bg-white border border-[#E8E8E5] text-[#171717] hover:bg-[#F2F2EF]'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {t.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* Admin Content */}
            <div className="lg:col-span-9 space-y-6">
              {/* OVERVIEW */}
              {currentTab === '/admin' && overview && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-[#E8E8E5] bg-white p-5">
                      <p className="text-xs text-[#777777]">Total Revenue</p>
                      <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                        {formatINR(overview.metrics.totalRevenue)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#E8E8E5] bg-white p-5">
                      <p className="text-xs text-[#777777]">Total Orders</p>
                      <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                        {overview.metrics.totalOrders}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#E8E8E5] bg-white p-5">
                      <p className="text-xs text-[#777777]">Total Customers</p>
                      <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                        {overview.metrics.totalCustomers}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#E8E8E5] bg-white p-5">
                      <p className="text-xs text-[#777777]">Active Products</p>
                      <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                        {overview.metrics.totalProducts}
                      </p>
                    </div>
                  </div>

                  {/* Revenue Analytics Bar Chart */}
                  <div className="rounded-3xl border border-[#E8E8E5] bg-white p-6">
                    <h2 className="font-display text-lg font-bold text-[#171717] mb-5">
                      7-Day Revenue Analytics
                    </h2>
                    <div className="grid grid-cols-7 gap-3 items-end h-44 pt-4">
                      {overview.revenueSeries.map((pt) => {
                        const heightPct = Math.max(8, Math.round((pt.revenue / maxRev) * 100));
                        return (
                          <div key={pt.date} className="flex flex-col items-center justify-end h-full gap-2">
                            <span className="text-[10px] font-medium text-[#777777] tabular-nums">
                              {pt.revenue > 0 ? formatINR(pt.revenue) : '₹0'}
                            </span>
                            <div className="w-full max-w-[44px] flex-1 flex items-end">
                              <div
                                className="w-full rounded-t-lg bg-[#171717] transition-all"
                                style={{ height: `${heightPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[#777777] font-mono">{pt.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-3xl border border-[#E8E8E5] bg-white p-6">
                      <h3 className="font-display text-lg font-bold mb-4">Recent Orders</h3>
                      {overview.recentOrders.length === 0 ? (
                        <p className="text-xs text-[#777777]">No orders placed yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {overview.recentOrders.slice(0, 5).map((o) => (
                            <div key={o.id} className="flex items-center justify-between text-xs border-b border-[#E8E8E5] pb-2.5">
                              <div>
                                <p className="font-mono font-semibold">{o.order_number}</p>
                                <p className="text-[#777777]">{o.shipping_address.full_name}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold tabular-nums">{formatINR(o.total_amount)}</p>
                                <p className="capitalize text-[#777777]">{o.order_status}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-3xl border border-[#E8E8E5] bg-white p-6">
                      <h3 className="font-display text-lg font-bold mb-4">Best-Selling Catalog Pieces</h3>
                      <div className="space-y-3">
                        {overview.bestsellers.map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-xs border-b border-[#E8E8E5] pb-2.5">
                            <span className="font-medium truncate max-w-[200px]">{p.name}</span>
                            <span className="font-semibold tabular-nums">{formatINR(p.sale_price ?? p.base_price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* PRODUCTS */}
              {currentTab === '/admin/products' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold">Products ({products.length})</h2>
                    <button
                      type="button"
                      onClick={openCreateProduct}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#171717] px-5 py-2.5 text-xs font-semibold text-white"
                    >
                      <Plus className="h-4 w-4" /> Add Product
                    </button>
                  </div>

                  <div className="rounded-3xl border border-[#E8E8E5] bg-white overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E8E8E5] text-[#777777] uppercase">
                        <tr>
                          <th className="p-4">Product</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Price</th>
                          <th className="p-4">Stock</th>
                          <th className="p-4">Flags</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E5]">
                        {products.map((p) => {
                          const totalStock = p.variants.reduce((s, v) => s + v.stock_quantity, 0);
                          return (
                            <tr key={p.id} className="hover:bg-[#FAFAF8]">
                              <td className="p-4 flex items-center gap-3">
                                <div className="h-12 w-10 rounded-lg overflow-hidden bg-[#F2F2EF] shrink-0">
                                  <SmartImage src={p.images[0]?.image_url} alt={p.name} className="h-full w-full object-cover" />
                                </div>
                                <div>
                                  <p className="font-semibold text-[#171717]">{p.name}</p>
                                  <p className="text-[11px] text-[#777777]">{p.brand}</p>
                                </div>
                              </td>
                              <td className="p-4 text-[#777777]">{p.category_name}</td>
                              <td className="p-4 font-semibold tabular-nums">
                                {formatINR(p.sale_price ?? p.base_price)}
                                {p.sale_price && (
                                  <span className="ml-1.5 text-[11px] text-[#777777] line-through">
                                    {formatINR(p.base_price)}
                                  </span>
                                )}
                              </td>
                              <td className="p-4 tabular-nums">{totalStock}</td>
                              <td className="p-4 text-[11px] text-[#777777]">
                                {[p.featured && 'Featured', p.bestseller && 'Bestseller', p.new_arrival && 'New']
                                  .filter(Boolean)
                                  .join(' · ') || 'Standard'}
                              </td>
                              <td className="p-4 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => openEditProduct(p)}
                                  aria-label={`Edit ${p.name}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#E8E8E5] px-2.5 py-1 hover:border-[#171717]"
                                >
                                  <Edit3 className="h-3 w-3" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(p.id)}
                                  aria-label={`Delete ${p.name}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CATEGORIES */}
              {currentTab === '/admin/categories' && (
                <div className="space-y-6">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await apiFetch('/api/admin/categories', {
                          method: 'POST',
                          body: JSON.stringify(catForm),
                        });
                        setCatForm({ ...catForm, name: '', subtitle: '', description: '' });
                        showToast('Category added');
                        await loadAllAdminData();
                      } catch (err: any) {
                        showToast(err.message, 'error');
                      }
                    }}
                    className="rounded-3xl border border-[#E8E8E5] bg-white p-6 grid sm:grid-cols-2 gap-4"
                  >
                    <h2 className="sm:col-span-2 font-display text-lg font-bold">Add Category</h2>
                    <input
                      required
                      placeholder="Category Name"
                      value={catForm.name}
                      onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                    />
                    <input
                      placeholder="Subtitle"
                      value={catForm.subtitle}
                      onChange={(e) => setCatForm({ ...catForm, subtitle: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                    />
                    <input
                      placeholder="Image URL"
                      value={catForm.image_url}
                      onChange={(e) => setCatForm({ ...catForm, image_url: e.target.value })}
                      className="sm:col-span-2 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                    />
                    <button type="submit" className="sm:col-span-2 w-fit rounded-full bg-[#171717] px-6 py-2.5 text-xs font-semibold text-white">
                      Create Category
                    </button>
                  </form>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {categories.map((c) => (
                      <div key={c.id} className="rounded-2xl border border-[#E8E8E5] bg-white p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 rounded-xl overflow-hidden bg-[#F2F2EF]">
                            <SmartImage src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{c.name}</p>
                            <p className="text-xs text-[#777777]">{c.subtitle}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await apiFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
                              showToast('Category deleted', 'info');
                              await loadAllAdminData();
                            } catch (err: any) {
                              showToast(err.message, 'error');
                            }
                          }}
                          className="text-red-600 p-2 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ORDERS */}
              {currentTab === '/admin/orders' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777777]" />
                      <input
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        placeholder="Search order # or customer..."
                        className="w-full rounded-xl border border-[#E8E8E5] bg-white pl-9 pr-3 py-2 text-xs"
                      />
                    </div>
                    <select
                      value={orderFilter}
                      onChange={(e) => setOrderFilter(e.target.value)}
                      className="rounded-xl border border-[#E8E8E5] bg-white px-3 py-2 text-xs"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="packed">Packed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="rounded-3xl border border-[#E8E8E5] bg-white overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E8E8E5] text-[#777777] uppercase">
                        <tr>
                          <th className="p-4">Order</th>
                          <th className="p-4">Customer</th>
                          <th className="p-4">Total</th>
                          <th className="p-4">Payment</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Manage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E5]">
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-[#777777]">
                              No orders match this view.
                            </td>
                          </tr>
                        ) : (
                          filteredOrders.map((o) => (
                            <tr key={o.id}>
                              <td className="p-4 font-mono font-semibold">{o.order_number}</td>
                              <td className="p-4">
                                <p className="font-medium">{o.shipping_address.full_name}</p>
                                <p className="text-[11px] text-[#777777]">{formatDate(o.created_at)}</p>
                              </td>
                              <td className="p-4 font-semibold tabular-nums">{formatINR(o.total_amount)}</td>
                              <td className="p-4 uppercase">{o.payment_method} ({o.payment_status})</td>
                              <td className="p-4 capitalize font-medium">{o.order_status}</td>
                              <td className="p-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrder(o);
                                    setTrackingDraft(o.tracking_number || '');
                                  }}
                                  className="rounded-lg border border-[#E8E8E5] px-3 py-1 font-semibold hover:border-[#171717]"
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {selectedOrder && (
                    <div className="rounded-3xl border border-[#171717] bg-white p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-lg font-bold">
                          Manage {selectedOrder.order_number}
                        </h3>
                        <button type="button" onClick={() => setSelectedOrder(null)} className="text-xs underline">
                          Close
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <label className="block font-medium mb-1">Order Status</label>
                          <select
                            value={selectedOrder.order_status}
                            onChange={(e) =>
                              handleUpdateOrderStatus(
                                selectedOrder.id,
                                e.target.value as OrderStatus,
                                trackingDraft || undefined
                              )
                            }
                            className="w-full rounded-xl border border-[#E8E8E5] px-3 py-2"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="packed">Packed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-medium mb-1">Tracking Number</label>
                          <input
                            value={trackingDraft}
                            onChange={(e) => setTrackingDraft(e.target.value)}
                            placeholder="AWB / Tracking ID"
                            className="w-full rounded-xl border border-[#E8E8E5] px-3 py-2 font-mono"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateOrderStatus(selectedOrder.id, selectedOrder.order_status, trackingDraft)
                            }
                            className="rounded-xl bg-[#171717] px-4 py-2 font-semibold text-white"
                          >
                            Save Tracking
                          </button>
                          {selectedOrder.payment_status === 'paid' && (
                            <button
                              type="button"
                              onClick={() => handleRefundOrder(selectedOrder.id)}
                              className="rounded-xl border border-red-200 px-3 py-2 font-semibold text-red-600"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CUSTOMERS */}
              {currentTab === '/admin/customers' && (
                <div className="rounded-3xl border border-[#E8E8E5] bg-white overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#E8E8E5] text-[#777777] uppercase">
                      <tr>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Phone</th>
                        <th className="p-4">Orders</th>
                        <th className="p-4">Lifetime Spend</th>
                        <th className="p-4">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E5]">
                      {customers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-[#777777]">
                            No registered customers yet.
                          </td>
                        </tr>
                      ) : (
                        customers.map((c) => (
                          <tr key={c.id}>
                            <td className="p-4">
                              <p className="font-semibold">{c.full_name}</p>
                              <p className="text-[#777777]">{c.email}</p>
                            </td>
                            <td className="p-4">{c.phone || '—'}</td>
                            <td className="p-4 tabular-nums">{c.order_count}</td>
                            <td className="p-4 font-semibold tabular-nums">{formatINR(c.total_spent)}</td>
                            <td className="p-4 text-[#777777]">{formatDate(c.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* COUPONS */}
              {currentTab === '/admin/coupons' && (
                <div className="space-y-6">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await apiFetch('/api/admin/coupons', {
                          method: 'POST',
                          body: JSON.stringify({
                            code: couponForm.code,
                            discount_type: couponForm.discount_type,
                            discount_value: Number(couponForm.discount_value),
                            minimum_order: Number(couponForm.minimum_order),
                            maximum_discount: couponForm.maximum_discount ? Number(couponForm.maximum_discount) : null,
                            expiry_date: new Date(couponForm.expiry_date).toISOString(),
                            usage_limit: Number(couponForm.usage_limit),
                            is_active: true,
                          }),
                        });
                        setCouponForm({ ...couponForm, code: '' });
                        showToast('Coupon created');
                        await loadAllAdminData();
                      } catch (err: any) {
                        showToast(err.message, 'error');
                      }
                    }}
                    className="rounded-3xl border border-[#E8E8E5] bg-white p-6 grid sm:grid-cols-3 gap-4"
                  >
                    <h2 className="sm:col-span-3 font-display text-lg font-bold">Create Promo Coupon</h2>
                    <input
                      required
                      placeholder="CODE (e.g. WINTER15)"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2 text-sm uppercase"
                    />
                    <select
                      value={couponForm.discount_type}
                      onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value as any })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2 text-sm"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                    <input
                      required
                      type="number"
                      placeholder="Value"
                      value={couponForm.discount_value}
                      onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Min Order (₹)"
                      value={couponForm.minimum_order}
                      onChange={(e) => setCouponForm({ ...couponForm, minimum_order: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max Discount (₹)"
                      value={couponForm.maximum_discount}
                      onChange={(e) => setCouponForm({ ...couponForm, maximum_discount: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2 text-sm"
                    />
                    <input
                      type="date"
                      value={couponForm.expiry_date}
                      onChange={(e) => setCouponForm({ ...couponForm, expiry_date: e.target.value })}
                      className="rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2 text-sm"
                    />
                    <button type="submit" className="sm:col-span-3 w-fit rounded-full bg-[#171717] px-6 py-2.5 text-xs font-semibold text-white">
                      Create Coupon
                    </button>
                  </form>

                  <div className="rounded-3xl border border-[#E8E8E5] bg-white overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E8E8E5] text-[#777777] uppercase">
                        <tr>
                          <th className="p-4">Code</th>
                          <th className="p-4">Discount</th>
                          <th className="p-4">Min Order</th>
                          <th className="p-4">Usage</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E5]">
                        {coupons.map((c) => (
                          <tr key={c.id}>
                            <td className="p-4 font-mono font-bold">{c.code}</td>
                            <td className="p-4 tabular-nums">
                              {c.discount_type === 'percentage' ? `${c.discount_value}%` : formatINR(c.discount_value)}
                            </td>
                            <td className="p-4 tabular-nums">{formatINR(c.minimum_order)}</td>
                            <td className="p-4 tabular-nums">{c.usage_count} / {c.usage_limit}</td>
                            <td className="p-4">{c.is_active ? 'Active' : 'Paused'}</td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/admin/coupons/${c.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ is_active: !c.is_active }),
                                  });
                                  await loadAllAdminData();
                                }}
                                className="rounded-lg border border-[#E8E8E5] px-2.5 py-1"
                              >
                                {c.is_active ? 'Pause' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' });
                                  await loadAllAdminData();
                                }}
                                className="text-red-600 p-1"
                              >
                                <Trash2 className="h-3.5 w-3.5 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* REVIEWS */}
              {currentTab === '/admin/reviews' && (
                <div className="space-y-3">
                  <h2 className="font-display text-xl font-bold">Customer Reviews ({reviews.length})</h2>
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-[#E8E8E5] bg-white p-5 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[#171717]">
                          {r.user_name} · {r.product_name || r.product_id} · {r.rating}★
                        </p>
                        <p className="mt-1 text-sm text-[#777777]">{r.comment}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/reviews/${r.id}`, { method: 'DELETE' });
                          showToast('Review deleted', 'info');
                          await loadAllAdminData();
                        }}
                        className="text-red-600 p-1.5 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* SETTINGS */}
              {currentTab === '/admin/settings' && settings && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await apiFetch('/api/admin/settings', {
                      method: 'PATCH',
                      body: JSON.stringify(settings),
                    });
                    showToast('Store settings saved');
                  }}
                  className="rounded-3xl border border-[#E8E8E5] bg-white p-6 sm:p-8 space-y-5"
                >
                  <h2 className="font-display text-xl font-bold">Store &amp; Checkout Settings</h2>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-xs font-medium mb-1">Store Name</label>
                      <input
                        value={settings.store_name}
                        onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                        className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Free Shipping Threshold (₹)</label>
                      <input
                        type="number"
                        value={settings.free_shipping_threshold}
                        onChange={(e) => setSettings({ ...settings, free_shipping_threshold: Number(e.target.value) })}
                        className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Standard Shipping Fee (₹)</label>
                      <input
                        type="number"
                        value={settings.standard_shipping_fee}
                        onChange={(e) => setSettings({ ...settings, standard_shipping_fee: Number(e.target.value) })}
                        className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Express Shipping Fee (₹)</label>
                      <input
                        type="number"
                        value={settings.express_shipping_fee}
                        onChange={(e) => setSettings({ ...settings, express_shipping_fee: Number(e.target.value) })}
                        className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">GST / Tax Rate (%)</label>
                      <input
                        type="number"
                        value={settings.tax_rate_percent}
                        onChange={(e) => setSettings({ ...settings, tax_rate_percent: Number(e.target.value) })}
                        className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Support Email</label>
                      <input
                        type="email"
                        value={settings.support_email}
                        onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                        className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1">Announcement Bar Copy</label>
                      <input
                        value={settings.announcement_text}
                        onChange={(e) => setSettings({ ...settings, announcement_text: e.target.value })}
                        className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5"
                      />
                    </div>
                  </div>

                  {gateways && (
                    <div className="rounded-2xl bg-[#F2F2EF] p-4 text-xs space-y-1">
                      <p className="font-semibold text-[#171717]">Payment Gateway Configuration</p>
                      <p className="text-[#777777]">
                        Razorpay: {gateways.razorpay_enabled ? 'Configured' : 'Set RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in Secrets'}
                      </p>
                      <p className="text-[#777777]">
                        Stripe: {gateways.stripe_enabled ? 'Configured' : 'Set STRIPE_SECRET_KEY in Secrets'}
                      </p>
                      <p className="text-[#777777]">Cash on Delivery: Active</p>
                    </div>
                  )}

                  <button type="submit" className="rounded-full bg-[#171717] px-6 py-3 text-xs font-semibold text-white">
                    Save Settings
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Create / Edit Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-bold">
                {editingProductId ? 'Edit Product' : 'Create New Product'}
              </h3>
              <button type="button" onClick={() => setProductModalOpen(false)} className="text-xs underline">
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Product Name</label>
                  <input
                    required
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    className="w-full rounded-xl border border-[#E8E8E5] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Brand</label>
                  <input
                    required
                    value={prodForm.brand}
                    onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                    className="w-full rounded-xl border border-[#E8E8E5] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Category</label>
                  <select
                    value={prodForm.category_id}
                    onChange={(e) => setProdForm({ ...prodForm, category_id: e.target.value })}
                    className="w-full rounded-xl border border-[#E8E8E5] px-3 py-2"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Gender</label>
                  <select
                    value={prodForm.gender}
                    onChange={(e) => setProdForm({ ...prodForm, gender: e.target.value as any })}
                    className="w-full rounded-xl border border-[#E8E8E5] px-3 py-2"
                  >
                    <option value="unisex">Unisex</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={prodForm.base_price}
                    onChange={(e) => setProdForm({ ...prodForm, base_price: e.target.value })}
                    className="w-full rounded-xl border border-[#E8E8E5] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Sale Price (₹, optional)</label>
                  <input
                    type="number"
                    value={prodForm.sale_price}
                    onChange={(e) => setProdForm({ ...prodForm, sale_price: e.target.value })}
                    className="w-full rounded-xl border border-[#E8E8E5] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Available Sizes (comma separated)</label>
                  <input
                    required
                    value={prodForm.sizesText}
                    onChange={(e) => setProdForm({ ...prodForm, sizesText: e.target.value })}
                    className="w-full rounded-xl border border-[#E8E8E5] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Color &amp; Stock per Variant</label>
                  <div className="flex gap-2">
                    <input
                      required
                      value={prodForm.colorName}
                      onChange={(e) => setProdForm({ ...prodForm, colorName: e.target.value })}
                      className="flex-1 rounded-xl border border-[#E8E8E5] px-3 py-2"
                    />
                    <input
                      type="number"
                      required
                      value={prodForm.stock}
                      onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })}
                      className="w-20 rounded-xl border border-[#E8E8E5] px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  className="w-full rounded-xl border border-[#E8E8E5] px-3 py-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Product Images</label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E8E8E5] px-3 py-1 text-xs font-semibold hover:border-[#171717]">
                    <Upload className="h-3.5 w-3.5" /> Upload Photo
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                {prodForm.images.map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={url}
                      onChange={(e) => {
                        const next = [...prodForm.images];
                        next[idx] = e.target.value;
                        setProdForm({ ...prodForm, images: next });
                      }}
                      className="flex-1 rounded-xl border border-[#E8E8E5] px-3 py-1.5 text-xs"
                    />
                    {prodForm.images.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setProdForm({ ...prodForm, images: prodForm.images.filter((_, i) => i !== idx) })
                        }
                        className="text-red-600 text-xs px-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-5 text-xs">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={prodForm.featured} onChange={(e) => setProdForm({ ...prodForm, featured: e.target.checked })} />
                  Featured Drop
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={prodForm.new_arrival} onChange={(e) => setProdForm({ ...prodForm, new_arrival: e.target.checked })} />
                  New Arrival
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={prodForm.bestseller} onChange={(e) => setProdForm({ ...prodForm, bestseller: e.target.checked })} />
                  Best Seller
                </label>
              </div>

              <button type="submit" className="w-full rounded-full bg-[#171717] py-3 text-xs font-semibold text-white">
                {editingProductId ? 'Update Product' : 'Publish Product'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
