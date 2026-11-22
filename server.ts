import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { createServer as createViteServer } from 'vite';
import { getDb, mutateDb, UPLOADS_DIR, type DatabaseState } from './server/db.ts';
import {
  createSession,
  hashPassword,
  optionalAuth,
  requireAdmin,
  requireAuth,
  sanitizeUser,
  verifyPassword,
  type AuthRequest,
} from './server/auth.ts';
import type { Order, OrderItem, Product, StoreSettings } from './src/types/ecommerce.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '6mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

function getGatewayConfig() {
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || '';
  return {
    razorpay_enabled: Boolean(razorpayKeyId && razorpayKeySecret),
    razorpay_key_id: razorpayKeyId || undefined,
    razorpay_key_secret: razorpayKeySecret,
    stripe_enabled: Boolean(stripeSecretKey),
    stripe_secret_key: stripeSecretKey,
    cod_enabled: true,
  };
}

function resolveProductPricing(product: Product, variantId: string) {
  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) return null;
  const baseUnit = product.sale_price ?? product.base_price;
  const unitPrice = Math.max(0, baseUnit + (variant.price_adjustment || 0));
  const originalPrice = Math.max(unitPrice, product.base_price + (variant.price_adjustment || 0));
  return { variant, unitPrice, originalPrice };
}

function calculateCouponDiscount(
  db: DatabaseState,
  code: string | null | undefined,
  subtotal: number
): { valid: boolean; discount: number; couponCode: string | null; reason?: string } {
  if (!code || !code.trim()) {
    return { valid: true, discount: 0, couponCode: null };
  }
  const normalized = code.trim().toUpperCase();
  const coupon = db.coupons.find((c) => c.code.toUpperCase() === normalized);
  if (!coupon) {
    return { valid: false, discount: 0, couponCode: null, reason: 'Coupon code not found.' };
  }
  if (!coupon.is_active) {
    return { valid: false, discount: 0, couponCode: null, reason: 'This coupon is currently inactive.' };
  }
  if (new Date(coupon.expiry_date).getTime() <= Date.now()) {
    return { valid: false, discount: 0, couponCode: null, reason: 'This coupon has expired.' };
  }
  if (coupon.usage_count >= coupon.usage_limit) {
    return { valid: false, discount: 0, couponCode: null, reason: 'Coupon usage limit reached.' };
  }
  if (subtotal < coupon.minimum_order) {
    return {
      valid: false,
      discount: 0,
      couponCode: null,
      reason: `Minimum order value of ₹${coupon.minimum_order.toLocaleString('en-IN')} required.`,
    };
  }
  let discount =
    coupon.discount_type === 'percentage'
      ? Math.round((subtotal * coupon.discount_value) / 100)
      : coupon.discount_value;
  if (coupon.maximum_discount !== null && coupon.maximum_discount !== undefined) {
    discount = Math.min(discount, coupon.maximum_discount);
  }
  discount = Math.min(discount, subtotal);
  return { valid: true, discount, couponCode: coupon.code };
}

function calculateOrderTotals(
  db: DatabaseState,
  rawItems: Array<{ product_variant_id: string; quantity: number }>,
  couponCode: string | null | undefined,
  deliveryOption: 'standard' | 'express'
) {
  const settings = db.settings;
  let subtotal = 0;
  const resolvedItems: Array<{
    product: Product;
    variantId: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    stockQuantity: number;
  }> = [];

  for (const item of rawItems) {
    let foundProduct: Product | undefined;
    for (const p of db.products) {
      if (p.status === 'active' && p.variants.some((v) => v.id === item.product_variant_id)) {
        foundProduct = p;
        break;
      }
    }
    if (!foundProduct) {
      throw new Error('One or more selected products are no longer available.');
    }
    const pricing = resolveProductPricing(foundProduct, item.product_variant_id);
    if (!pricing) {
      throw new Error('Selected product variant was not found.');
    }
    if (pricing.variant.stock_quantity < item.quantity) {
      throw new Error(
        `Insufficient stock for ${foundProduct.name} (${pricing.variant.size} / ${pricing.variant.color}). Only ${pricing.variant.stock_quantity} left.`
      );
    }
    subtotal += pricing.unitPrice * item.quantity;
    resolvedItems.push({
      product: foundProduct,
      variantId: pricing.variant.id,
      size: pricing.variant.size,
      color: pricing.variant.color,
      quantity: item.quantity,
      unitPrice: pricing.unitPrice,
      stockQuantity: pricing.variant.stock_quantity,
    });
  }

  const couponResult = calculateCouponDiscount(db, couponCode, subtotal);
  if (!couponResult.valid) {
    throw new Error(couponResult.reason || 'Invalid coupon code.');
  }
  const discount = couponResult.discount;
  const discountedSubtotal = Math.max(0, subtotal - discount);

  const qualifiesFreeStandard = discountedSubtotal >= settings.free_shipping_threshold;
  const shippingFee =
    deliveryOption === 'express'
      ? settings.express_shipping_fee
      : qualifiesFreeStandard
        ? 0
        : settings.standard_shipping_fee;

  const taxAmount = Math.round((discountedSubtotal * settings.tax_rate_percent) / 100);
  const totalAmount = discountedSubtotal + shippingFee + taxAmount;

  return {
    resolvedItems,
    subtotal,
    discount,
    couponCode: couponResult.couponCode,
    shippingFee,
    taxAmount,
    totalAmount,
  };
}

// ---------- PUBLIC CATALOG & SETTINGS ----------

app.get('/api/settings/public', (_req, res) => {
  const db = getDb();
  const gw = getGatewayConfig();
  res.json({
    settings: db.settings,
    gateways: {
      razorpay_enabled: gw.razorpay_enabled,
      razorpay_key_id: gw.razorpay_key_id,
      stripe_enabled: gw.stripe_enabled,
      cod_enabled: gw.cod_enabled,
    },
  });
});

app.get('/api/categories', (_req, res) => {
  const db = getDb();
  res.json({ categories: db.categories });
});

app.get('/api/products', (req, res) => {
  const db = getDb();
  const {
    category,
    gender,
    brand,
    collection,
    search,
    size,
    color,
    inStock,
    minPrice,
    maxPrice,
    minDiscount,
    minRating,
    featured,
    bestseller,
    newArrival,
    sort = 'featured',
    page = '1',
    limit = '24',
  } = req.query as Record<string, string | undefined>;

  let list = db.products.filter((p) => p.status === 'active');

  if (category && category !== 'all') {
    const catLower = category.toLowerCase();
    list = list.filter(
      (p) => p.category_slug?.toLowerCase() === catLower || p.category_id === category
    );
  }
  if (gender && gender !== 'all') {
    const g = gender.toLowerCase();
    list = list.filter((p) => p.gender === g || p.gender === 'unisex');
  }
  if (brand && brand !== 'all') {
    const bLower = brand.toLowerCase();
    list = list.filter((p) => p.brand.toLowerCase() === bLower);
  }
  if (collection && collection !== 'all') {
    const cLower = collection.toLowerCase();
    list = list.filter((p) => p.collection.toLowerCase().replace(/\s+/g, '-') === cLower || p.collection.toLowerCase() === cLower);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.category_name || '').toLowerCase().includes(q) ||
        p.collection.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  if (size && size !== 'all') {
    list = list.filter((p) => p.variants.some((v) => v.size === size && v.stock_quantity > 0));
  }
  if (color && color !== 'all') {
    const colLower = color.toLowerCase();
    list = list.filter((p) =>
      p.variants.some((v) => v.color.toLowerCase().includes(colLower))
    );
  }
  if (inStock === 'true') {
    list = list.filter((p) => p.variants.some((v) => v.stock_quantity > 0));
  }
  if (minPrice) {
    const min = Number(minPrice);
    if (!Number.isNaN(min)) {
      list = list.filter((p) => (p.sale_price ?? p.base_price) >= min);
    }
  }
  if (maxPrice) {
    const max = Number(maxPrice);
    if (!Number.isNaN(max)) {
      list = list.filter((p) => (p.sale_price ?? p.base_price) <= max);
    }
  }
  if (minDiscount) {
    const disc = Number(minDiscount);
    if (!Number.isNaN(disc) && disc > 0) {
      list = list.filter((p) => {
        if (!p.sale_price || p.sale_price >= p.base_price) return false;
        const pct = Math.round(((p.base_price - p.sale_price) / p.base_price) * 100);
        return pct >= disc;
      });
    }
  }
  if (minRating) {
    const mr = Number(minRating);
    if (!Number.isNaN(mr)) {
      list = list.filter((p) => p.rating_avg >= mr);
    }
  }
  if (featured === 'true') list = list.filter((p) => p.featured);
  if (bestseller === 'true') list = list.filter((p) => p.bestseller);
  if (newArrival === 'true') list = list.filter((p) => p.new_arrival);

  list = [...list];
  switch (sort) {
    case 'price_asc':
      list.sort((a, b) => (a.sale_price ?? a.base_price) - (b.sale_price ?? b.base_price));
      break;
    case 'price_desc':
      list.sort((a, b) => (b.sale_price ?? b.base_price) - (a.sale_price ?? a.base_price));
      break;
    case 'newest':
      list.sort((a, b) => Number(b.new_arrival) - Number(a.new_arrival) || b.created_at.localeCompare(a.created_at));
      break;
    case 'bestselling':
    case 'popularity':
      list.sort((a, b) => Number(b.bestseller) - Number(a.bestseller) || b.review_count - a.review_count);
      break;
    case 'rating':
      list.sort((a, b) => b.rating_avg - a.rating_avg || b.review_count - a.review_count);
      break;
    default:
      list.sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.bestseller) - Number(a.bestseller));
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 24));
  const total = list.length;
  const start = (pageNum - 1) * limitNum;
  const items = list.slice(start, start + limitNum);

  res.json({
    products: items,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.max(1, Math.ceil(total / limitNum)),
  });
});

app.get('/api/products/:slug', (req, res) => {
  const db = getDb();
  const product = db.products.find(
    (p) => (p.slug === req.params.slug || p.id === req.params.slug) && p.status === 'active'
  );
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  const reviews = db.reviews
    .filter((r) => r.product_id === product.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const related = db.products
    .filter((p) => p.status === 'active' && p.id !== product.id && (p.category_id === product.category_id || p.collection === product.collection))
    .slice(0, 4);
  res.json({ product, reviews, related });
});

app.post('/api/newsletter', async (req, res) => {
  const parsed = z.object({ email: z.string().email('Please enter a valid email address.') }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid email.' });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const result = await mutateDb((db) => {
    const existing = db.newsletter_subscribers.find((s) => s.email === email);
    if (existing) return { alreadySubscribed: true };
    db.newsletter_subscribers.push({
      id: `sub-${crypto.randomUUID()}`,
      email,
      created_at: new Date().toISOString(),
    });
    return { alreadySubscribed: false };
  });
  res.json({
    message: result.alreadySubscribed
      ? 'You are already subscribed to ATELIER updates.'
      : 'Welcome to ATELIER. Use code WELCOME10 for 10% off your first order.',
  });
});

// ---------- AUTHENTICATION & FIRST-RUN ADMIN CLAIM ----------

app.get('/api/auth/admin-status', (_req, res) => {
  const db = getDb();
  const hasEnvPasscode = Boolean(process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim());
  const hasAdmin = db.users.some((u) => u.role === 'admin');
  res.json({
    hasAdmin,
    bootstrapAvailable: !db.admin_bootstrap.claimed && !hasEnvPasscode && !hasAdmin,
    requiresPasscode: hasEnvPasscode,
  });
});

app.post('/api/auth/claim-admin', async (req, res) => {
  const schema = z.object({
    full_name: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
    passcode: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid admin details.' });
  }

  const envPasscode = process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim() || '';
  const db = getDb();

  if (envPasscode) {
    const provided = parsed.data.passcode || '';
    const a = Buffer.from(provided);
    const b = Buffer.from(envPasscode);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ error: 'Invalid admin setup passcode.' });
    }
  } else if (db.admin_bootstrap.claimed || db.users.some((u) => u.role === 'admin')) {
    return res.status(403).json({
      error: 'Admin access has already been claimed. Please sign in with your administrator credentials.',
    });
  }

  const emailLower = parsed.data.email.toLowerCase();
  const user = await mutateDb((state) => {
    let existing = state.users.find((u) => u.email === emailLower);
    const passwordHash = hashPassword(parsed.data.password);
    if (existing) {
      existing.full_name = parsed.data.full_name;
      existing.password_hash = passwordHash;
      existing.role = 'admin';
      existing.email_verified = true;
    } else {
      existing = {
        id: `usr-${crypto.randomUUID()}`,
        full_name: parsed.data.full_name,
        email: emailLower,
        phone: '',
        password_hash: passwordHash,
        role: 'admin',
        email_verified: true,
        created_at: new Date().toISOString(),
      };
      state.users.push(existing);
    }
    state.admin_bootstrap.claimed = true;
    return existing;
  });

  const token = await createSession(user.id);
  res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/register', async (req, res) => {
  const schema = z.object({
    full_name: z.string().trim().min(2, 'Full name is required.').max(80),
    email: z.string().trim().email('Valid email is required.'),
    phone: z.string().trim().max(20).optional().default(''),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data.' });
  }

  const emailLower = parsed.data.email.toLowerCase();
  const db = getDb();
  if (db.users.some((u) => u.email === emailLower)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const newUser = await mutateDb((state) => {
    const user = {
      id: `usr-${crypto.randomUUID()}`,
      full_name: parsed.data.full_name,
      email: emailLower,
      phone: parsed.data.phone,
      password_hash: hashPassword(parsed.data.password),
      role: 'customer' as const,
      email_verified: true,
      created_at: new Date().toISOString(),
    };
    state.users.push(user);
    return user;
  });

  const token = await createSession(newUser.id);
  res.status(201).json({ token, user: sanitizeUser(newUser) });
});

app.post('/api/auth/login', async (req, res) => {
  const schema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please enter a valid email and password.' });
  }
  const emailLower = parsed.data.email.toLowerCase();
  const db = getDb();
  const user = db.users.find((u) => u.email === emailLower);
  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const token = await createSession(user.id);
  res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res) => {
  await mutateDb((db) => {
    db.sessions = db.sessions.filter((s) => s.token !== req.authToken);
  });
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: sanitizeUser(req.authUser!) });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }
  const emailLower = parsed.data.email.toLowerCase();
  const resetToken = await mutateDb((db) => {
    const user = db.users.find((u) => u.email === emailLower);
    if (!user) return null;
    const token = crypto.randomBytes(24).toString('hex');
    db.reset_tokens = db.reset_tokens.filter((r) => r.user_id !== user.id);
    db.reset_tokens.push({
      token,
      user_id: user.id,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    return token;
  });

  res.json({
    message: 'If an account matches that email, password reset instructions have been prepared.',
    preview_reset_token: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
  });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const parsed = z
    .object({
      token: z.string().min(10),
      password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid reset request.' });
  }
  const ok = await mutateDb((db) => {
    const entry = db.reset_tokens.find((t) => t.token === parsed.data.token);
    if (!entry || new Date(entry.expires_at).getTime() <= Date.now()) {
      return false;
    }
    const user = db.users.find((u) => u.id === entry.user_id);
    if (!user) return false;
    user.password_hash = hashPassword(parsed.data.password);
    db.reset_tokens = db.reset_tokens.filter((t) => t.token !== parsed.data.token);
    return true;
  });
  if (!ok) {
    return res.status(400).json({ error: 'Reset token is invalid or expired.' });
  }
  res.json({ message: 'Your password has been updated. You can now sign in.' });
});

// ---------- ACCOUNT: PROFILE & ADDRESSES ----------

app.patch('/api/account/profile', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z
    .object({
      full_name: z.string().trim().min(2).max(80),
      phone: z.string().trim().max(20).optional().default(''),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile data.' });
  }
  const updated = await mutateDb((db) => {
    const user = db.users.find((u) => u.id === req.authUser!.id)!;
    user.full_name = parsed.data.full_name;
    user.phone = parsed.data.phone;
    return sanitizeUser(user);
  });
  res.json({ user: updated });
});

app.get('/api/account/addresses', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const addresses = db.addresses.filter((a) => a.user_id === req.authUser!.id);
  res.json({ addresses });
});

const addressSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  address_line: z.string().trim().min(2).max(160),
  street: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postal_code: z.string().trim().min(4).max(16),
  country: z.string().trim().min(2).max(80).default('India'),
  is_default: z.boolean().optional().default(false),
});

app.post('/api/account/addresses', requireAuth, async (req: AuthRequest, res) => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid address.' });
  }
  const created = await mutateDb((db) => {
    const userAddrs = db.addresses.filter((a) => a.user_id === req.authUser!.id);
    const makeDefault = parsed.data.is_default || userAddrs.length === 0;
    if (makeDefault) {
      for (const a of userAddrs) a.is_default = false;
    }
    const addr = {
      id: `addr-${crypto.randomUUID()}`,
      user_id: req.authUser!.id,
      ...parsed.data,
      is_default: makeDefault,
    };
    db.addresses.push(addr);
    return addr;
  });
  res.status(201).json({ address: created });
});

app.patch('/api/account/addresses/:id', requireAuth, async (req: AuthRequest, res) => {
  const parsed = addressSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid address.' });
  }
  const updated = await mutateDb((db) => {
    const addr = db.addresses.find((a) => a.id === req.params.id && a.user_id === req.authUser!.id);
    if (!addr) return null;
    if (parsed.data.is_default) {
      for (const a of db.addresses) {
        if (a.user_id === req.authUser!.id) a.is_default = false;
      }
    }
    Object.assign(addr, parsed.data);
    return addr;
  });
  if (!updated) return res.status(404).json({ error: 'Address not found.' });
  res.json({ address: updated });
});

app.delete('/api/account/addresses/:id', requireAuth, async (req: AuthRequest, res) => {
  const removed = await mutateDb((db) => {
    const before = db.addresses.length;
    db.addresses = db.addresses.filter(
      (a) => !(a.id === req.params.id && a.user_id === req.authUser!.id)
    );
    return db.addresses.length < before;
  });
  if (!removed) return res.status(404).json({ error: 'Address not found.' });
  res.json({ success: true });
});

// ---------- CART & WISHLIST PERSISTENCE ----------

function buildUserCartResponse(db: DatabaseState, userId: string) {
  const entries = db.cart_items.filter((ci) => ci.user_id === userId);
  const items = entries
    .map((ci) => {
      const product = db.products.find(
        (p) => p.status === 'active' && p.variants.some((v) => v.id === ci.product_variant_id)
      );
      if (!product) return null;
      const pricing = resolveProductPricing(product, ci.product_variant_id);
      if (!pricing) return null;
      return {
        id: ci.id,
        product_id: product.id,
        product_variant_id: pricing.variant.id,
        product_name: product.name,
        product_slug: product.slug,
        brand: product.brand,
        image_url: product.images[0]?.image_url || '',
        selected_size: pricing.variant.size,
        selected_color: pricing.variant.color,
        color_hex: pricing.variant.color_hex,
        unit_price: pricing.unitPrice,
        original_price: pricing.originalPrice,
        quantity: Math.min(ci.quantity, Math.max(1, pricing.variant.stock_quantity)),
        stock_quantity: pricing.variant.stock_quantity,
      };
    })
    .filter(Boolean);
  return items;
}

app.get('/api/cart', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  res.json({ items: buildUserCartResponse(db, req.authUser!.id) });
});

app.post('/api/cart', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z
    .object({
      product_variant_id: z.string().min(1),
      quantity: z.number().int().min(1).max(20),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid cart item.' });
  }
  try {
    const items = await mutateDb((db) => {
      const variant = db.products
        .flatMap((p) => p.variants)
        .find((v) => v.id === parsed.data.product_variant_id);
      if (!variant || variant.stock_quantity < 1) {
        throw new Error('Selected variant is out of stock.');
      }
      const existing = db.cart_items.find(
        (c) => c.user_id === req.authUser!.id && c.product_variant_id === parsed.data.product_variant_id
      );
      if (existing) {
        existing.quantity = Math.min(variant.stock_quantity, existing.quantity + parsed.data.quantity);
      } else {
        db.cart_items.push({
          id: `ci-${crypto.randomUUID()}`,
          user_id: req.authUser!.id,
          product_variant_id: parsed.data.product_variant_id,
          quantity: Math.min(variant.stock_quantity, parsed.data.quantity),
        });
      }
      return buildUserCartResponse(db, req.authUser!.id);
    });
    res.json({ items });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unable to add item to cart.' });
  }
});

app.patch('/api/cart/:variantId', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z.object({ quantity: z.number().int().min(0).max(20) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid quantity.' });
  }
  const items = await mutateDb((db) => {
    if (parsed.data.quantity === 0) {
      db.cart_items = db.cart_items.filter(
        (c) => !(c.user_id === req.authUser!.id && c.product_variant_id === req.params.variantId)
      );
    } else {
      const existing = db.cart_items.find(
        (c) => c.user_id === req.authUser!.id && c.product_variant_id === req.params.variantId
      );
      if (existing) {
        const variant = db.products
          .flatMap((p) => p.variants)
          .find((v) => v.id === req.params.variantId);
        const maxStock = variant ? variant.stock_quantity : parsed.data.quantity;
        existing.quantity = Math.min(maxStock, parsed.data.quantity);
      }
    }
    return buildUserCartResponse(db, req.authUser!.id);
  });
  res.json({ items });
});

app.post('/api/cart/sync', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z
    .object({
      items: z.array(
        z.object({
          product_variant_id: z.string().min(1),
          quantity: z.number().int().min(1).max(20),
        })
      ),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid cart sync payload.' });
  }
  const items = await mutateDb((db) => {
    for (const incoming of parsed.data.items) {
      const variant = db.products
        .flatMap((p) => p.variants)
        .find((v) => v.id === incoming.product_variant_id);
      if (!variant || variant.stock_quantity < 1) continue;
      const existing = db.cart_items.find(
        (c) => c.user_id === req.authUser!.id && c.product_variant_id === incoming.product_variant_id
      );
      if (existing) {
        existing.quantity = Math.min(variant.stock_quantity, Math.max(existing.quantity, incoming.quantity));
      } else {
        db.cart_items.push({
          id: `ci-${crypto.randomUUID()}`,
          user_id: req.authUser!.id,
          product_variant_id: incoming.product_variant_id,
          quantity: Math.min(variant.stock_quantity, incoming.quantity),
        });
      }
    }
    return buildUserCartResponse(db, req.authUser!.id);
  });
  res.json({ items });
});

app.get('/api/wishlist', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const productIds = db.wishlists
    .filter((w) => w.user_id === req.authUser!.id)
    .map((w) => w.product_id);
  const products = db.products.filter((p) => productIds.includes(p.id) && p.status === 'active');
  res.json({ productIds, products });
});

app.post('/api/wishlist/toggle', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z.object({ product_id: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Product ID required.' });
  const result = await mutateDb((db) => {
    const idx = db.wishlists.findIndex(
      (w) => w.user_id === req.authUser!.id && w.product_id === parsed.data.product_id
    );
    let added = false;
    if (idx >= 0) {
      db.wishlists.splice(idx, 1);
    } else {
      db.wishlists.push({
        id: `wl-${crypto.randomUUID()}`,
        user_id: req.authUser!.id,
        product_id: parsed.data.product_id,
        created_at: new Date().toISOString(),
      });
      added = true;
    }
    const productIds = db.wishlists
      .filter((w) => w.user_id === req.authUser!.id)
      .map((w) => w.product_id);
    return { added, productIds };
  });
  res.json(result);
});

app.post('/api/wishlist/sync', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z.object({ product_ids: z.array(z.string()) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid wishlist payload.' });
  const productIds = await mutateDb((db) => {
    for (const pid of parsed.data.product_ids) {
      if (!db.products.some((p) => p.id === pid && p.status === 'active')) continue;
      const exists = db.wishlists.some((w) => w.user_id === req.authUser!.id && w.product_id === pid);
      if (!exists) {
        db.wishlists.push({
          id: `wl-${crypto.randomUUID()}`,
          user_id: req.authUser!.id,
          product_id: pid,
          created_at: new Date().toISOString(),
        });
      }
    }
    return db.wishlists.filter((w) => w.user_id === req.authUser!.id).map((w) => w.product_id);
  });
  res.json({ productIds });
});

// ---------- REVIEWS ----------

app.post('/api/reviews', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z
    .object({
      product_id: z.string().min(1),
      rating: z.number().int().min(1).max(5),
      comment: z.string().trim().min(5, 'Please write at least 5 characters.').max(1000),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid review.' });
  }
  try {
    const review = await mutateDb((db) => {
      const product = db.products.find((p) => p.id === parsed.data.product_id && p.status === 'active');
      if (!product) throw new Error('Product not found.');
      const created = {
        id: `rev-${crypto.randomUUID()}`,
        user_id: req.authUser!.id,
        user_name: req.authUser!.full_name,
        product_id: product.id,
        product_name: product.name,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
        created_at: new Date().toISOString(),
      };
      db.reviews.push(created);
      const allForProd = db.reviews.filter((r) => r.product_id === product.id);
      product.review_count = allForProd.length;
      product.rating_avg = Number(
        (allForProd.reduce((sum, r) => sum + r.rating, 0) / allForProd.length).toFixed(1)
      );
      return created;
    });
    res.status(201).json({ review });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Unable to submit review.' });
  }
});

// ---------- COUPONS & CHECKOUT CALCULATION ----------

app.post('/api/coupons/validate', (req, res) => {
  const parsed = z
    .object({
      code: z.string().trim().min(1),
      subtotal: z.number().min(0),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Coupon code and subtotal are required.' });
  }
  const db = getDb();
  const result = calculateCouponDiscount(db, parsed.data.code, parsed.data.subtotal);
  if (!result.valid) {
    return res.status(400).json({ error: result.reason });
  }
  res.json({
    valid: true,
    code: result.couponCode,
    discount: result.discount,
  });
});

app.post('/api/checkout/calculate', (req, res) => {
  const parsed = z
    .object({
      items: z
        .array(
          z.object({
            product_variant_id: z.string().min(1),
            quantity: z.number().int().min(1).max(20),
          })
        )
        .min(1),
      coupon_code: z.string().nullable().optional(),
      delivery_option: z.enum(['standard', 'express']).default('standard'),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid cart items for calculation.' });
  }
  try {
    const db = getDb();
    const totals = calculateOrderTotals(
      db,
      parsed.data.items,
      parsed.data.coupon_code,
      parsed.data.delivery_option
    );
    res.json({
      subtotal: totals.subtotal,
      discount: totals.discount,
      coupon_code: totals.couponCode,
      shipping_fee: totals.shippingFee,
      tax_amount: totals.taxAmount,
      total_amount: totals.totalAmount,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unable to calculate order total.' });
  }
});

// ---------- ORDERS & SERVER-VERIFIED PAYMENTS ----------

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product_variant_id: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1, 'Cart cannot be empty.'),
  shipping_address: z.object({
    full_name: z.string().trim().min(2, 'Full name is required.'),
    email: z.string().trim().email('Valid email is required.'),
    phone: z.string().trim().min(7, 'Valid mobile number is required.').max(20),
    address_line: z.string().trim().min(2, 'House or building is required.'),
    street: z.string().trim().min(2, 'Street is required.'),
    city: z.string().trim().min(2, 'City is required.'),
    state: z.string().trim().min(2, 'State is required.'),
    postal_code: z.string().trim().min(4, 'Postal code is required.').max(16),
    country: z.string().trim().min(2).default('India'),
  }),
  save_address: z.boolean().optional().default(false),
  delivery_option: z.enum(['standard', 'express']).default('standard'),
  payment_method: z.enum(['cod', 'razorpay', 'stripe']),
  coupon_code: z.string().nullable().optional(),
});

function generateOrderNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `ATL-${new Date().getFullYear()}-${num}`;
}

app.post('/api/orders', optionalAuth, async (req: AuthRequest, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid checkout details.' });
  }

  const gw = getGatewayConfig();
  if (parsed.data.payment_method === 'razorpay' && !gw.razorpay_enabled) {
    return res.status(503).json({
      error: 'Razorpay is not configured on this server (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). Please select Cash on Delivery or configure secrets.',
    });
  }
  if (parsed.data.payment_method === 'stripe' && !gw.stripe_enabled) {
    return res.status(503).json({
      error: 'Stripe is not configured on this server (missing STRIPE_SECRET_KEY). Please select Cash on Delivery or configure secrets.',
    });
  }

  try {
    const order = await mutateDb((db) => {
      const totals = calculateOrderTotals(
        db,
        parsed.data.items,
        parsed.data.coupon_code,
        parsed.data.delivery_option
      );

      const orderId = `ord-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const orderItems: OrderItem[] = totals.resolvedItems.map((ri) => ({
        id: `oi-${crypto.randomUUID()}`,
        order_id: orderId,
        product_id: ri.product.id,
        product_variant_id: ri.variantId,
        product_name_snapshot: ri.product.name,
        product_slug_snapshot: ri.product.slug,
        image_url_snapshot: ri.product.images[0]?.image_url || '',
        selected_size: ri.size,
        selected_color: ri.color,
        quantity: ri.quantity,
        unit_price: ri.unitPrice,
      }));

      const isCod = parsed.data.payment_method === 'cod';
      if (isCod) {
        // Atomic stock deduction and coupon increment for confirmed COD orders
        for (const ri of totals.resolvedItems) {
          const variant = ri.product.variants.find((v) => v.id === ri.variantId)!;
          variant.stock_quantity -= ri.quantity;
        }
        if (totals.couponCode) {
          const c = db.coupons.find((cp) => cp.code === totals.couponCode);
          if (c) c.usage_count += 1;
        }
        if (req.authUser) {
          db.cart_items = db.cart_items.filter((ci) => ci.user_id !== req.authUser!.id);
        }
      }

      if (req.authUser && parsed.data.save_address) {
        const exists = db.addresses.some(
          (a) =>
            a.user_id === req.authUser!.id &&
            a.postal_code === parsed.data.shipping_address.postal_code &&
            a.address_line === parsed.data.shipping_address.address_line
        );
        if (!exists) {
          db.addresses.push({
            id: `addr-${crypto.randomUUID()}`,
            user_id: req.authUser.id,
            full_name: parsed.data.shipping_address.full_name,
            phone: parsed.data.shipping_address.phone,
            address_line: parsed.data.shipping_address.address_line,
            street: parsed.data.shipping_address.street,
            city: parsed.data.shipping_address.city,
            state: parsed.data.shipping_address.state,
            postal_code: parsed.data.shipping_address.postal_code,
            country: parsed.data.shipping_address.country,
            is_default: db.addresses.filter((a) => a.user_id === req.authUser!.id).length === 0,
          });
        }
      }

      const newOrder: Order = {
        id: orderId,
        user_id: req.authUser?.id || null,
        guest_email: req.authUser ? undefined : parsed.data.shipping_address.email.toLowerCase(),
        order_number: generateOrderNumber(),
        subtotal: totals.subtotal,
        discount: totals.discount,
        coupon_code: totals.couponCode,
        shipping_fee: totals.shippingFee,
        delivery_option: parsed.data.delivery_option,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount,
        payment_method: parsed.data.payment_method,
        payment_status: isCod ? 'pending_cod' : 'pending',
        order_status: isCod ? 'confirmed' : 'pending',
        shipping_address: parsed.data.shipping_address,
        tracking_number: null,
        items: orderItems,
        created_at: now,
        updated_at: now,
      };

      db.orders.unshift(newOrder);
      if (isCod) {
        db.payments.push({
          id: `pay-${crypto.randomUUID()}`,
          order_id: newOrder.id,
          provider: 'cod',
          amount: newOrder.total_amount,
          status: 'pending_cod',
          created_at: now,
        });
      }
      return newOrder;
    });

    res.status(201).json({ order });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unable to place order.' });
  }
});

// Razorpay order creation
app.post('/api/payments/razorpay/order', optionalAuth, async (req: AuthRequest, res) => {
  const gw = getGatewayConfig();
  if (!gw.razorpay_enabled) {
    return res.status(503).json({ error: 'Razorpay is not configured on the server.' });
  }
  const parsed = z.object({ order_number: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Order number required.' });

  const db = getDb();
  const order = db.orders.find((o) => o.order_number === parsed.data.order_number);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const authHeader = Buffer.from(`${gw.razorpay_key_id}:${gw.razorpay_key_secret}`).toString('base64');
  const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: order.total_amount * 100,
      currency: 'INR',
      receipt: order.order_number,
    }),
  });
  if (!rzpResp.ok) {
    return res.status(502).json({ error: 'Failed to create Razorpay order.' });
  }
  const rzpOrder = (await rzpResp.json()) as { id: string; amount: number; currency: string };
  await mutateDb((state) => {
    state.payments.push({
      id: `pay-${crypto.randomUUID()}`,
      order_id: order.id,
      provider: 'razorpay',
      provider_order_id: rzpOrder.id,
      amount: order.total_amount,
      status: 'created',
      created_at: new Date().toISOString(),
    });
  });
  res.json({
    razorpay_order_id: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    key_id: gw.razorpay_key_id,
  });
});

// Razorpay server-side HMAC-SHA256 verification
app.post('/api/payments/razorpay/verify', optionalAuth, async (req: AuthRequest, res) => {
  const gw = getGatewayConfig();
  if (!gw.razorpay_enabled) {
    return res.status(503).json({ error: 'Razorpay is not configured on the server.' });
  }
  const parsed = z
    .object({
      order_number: z.string().min(1),
      razorpay_order_id: z.string().min(1),
      razorpay_payment_id: z.string().min(1),
      razorpay_signature: z.string().min(1),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Missing Razorpay verification fields.' });

  const expected = crypto
    .createHmac('sha256', gw.razorpay_key_secret)
    .update(`${parsed.data.razorpay_order_id}|${parsed.data.razorpay_payment_id}`)
    .digest('hex');

  const sigBuf = Buffer.from(parsed.data.razorpay_signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(400).json({ error: 'Payment signature verification failed.' });
  }

  try {
    const order = await mutateDb((db) => {
      const o = db.orders.find((ord) => ord.order_number === parsed.data.order_number);
      if (!o) throw new Error('Order not found.');
      if (o.payment_status === 'paid') return o;

      for (const item of o.items) {
        const prod = db.products.find((p) => p.id === item.product_id);
        const variant = prod?.variants.find((v) => v.id === item.product_variant_id);
        if (!variant || variant.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product_name_snapshot}.`);
        }
        variant.stock_quantity -= item.quantity;
      }
      if (o.coupon_code) {
        const c = db.coupons.find((cp) => cp.code === o.coupon_code);
        if (c) c.usage_count += 1;
      }
      if (o.user_id) {
        db.cart_items = db.cart_items.filter((ci) => ci.user_id !== o.user_id);
      }

      o.payment_status = 'paid';
      o.order_status = 'confirmed';
      o.updated_at = new Date().toISOString();
      db.payments.push({
        id: `pay-${crypto.randomUUID()}`,
        order_id: o.id,
        provider: 'razorpay',
        provider_order_id: parsed.data.razorpay_order_id,
        provider_payment_id: parsed.data.razorpay_payment_id,
        amount: o.total_amount,
        status: 'paid',
        created_at: new Date().toISOString(),
      });
      return o;
    });
    res.json({ order });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Payment verification failed.' });
  }
});

// Razorpay webhook
app.post('/api/webhooks/razorpay', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const signature = req.headers['x-razorpay-signature'];
  if (!secret || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Webhook verification unavailable.' });
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }
  res.json({ received: true });
});

// Stripe Checkout session creation & server-side verification
app.post('/api/payments/stripe/session', optionalAuth, async (req, res) => {
  const gw = getGatewayConfig();
  if (!gw.stripe_enabled) {
    return res.status(503).json({ error: 'Stripe is not configured on the server.' });
  }
  const parsed = z.object({ order_number: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Order number required.' });

  const db = getDb();
  const order = db.orders.find((o) => o.order_number === parsed.data.order_number);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const origin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', `${origin}/order-confirmation/${order.order_number}?stripe_session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${origin}/checkout?retry=${order.order_number}`);
  params.append('line_items[0][price_data][currency]', 'inr');
  params.append('line_items[0][price_data][product_data][name]', `ATELIER Order ${order.order_number}`);
  params.append('line_items[0][price_data][unit_amount]', String(order.total_amount * 100));
  params.append('line_items[0][quantity]', '1');
  params.append('metadata[order_number]', order.order_number);

  const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gw.stripe_secret_key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!stripeResp.ok) {
    return res.status(502).json({ error: 'Failed to initialize Stripe Checkout session.' });
  }
  const session = (await stripeResp.json()) as { id: string; url: string };
  res.json({ sessionId: session.id, url: session.url });
});

app.get('/api/payments/stripe/verify', async (req, res) => {
  const gw = getGatewayConfig();
  const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : '';
  if (!gw.stripe_enabled || !sessionId) {
    return res.status(400).json({ error: 'Stripe verification unavailable.' });
  }
  const stripeResp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${gw.stripe_secret_key}` },
  });
  if (!stripeResp.ok) {
    return res.status(400).json({ error: 'Could not verify Stripe session.' });
  }
  const session = (await stripeResp.json()) as {
    id: string;
    payment_status: string;
    payment_intent?: string;
    metadata?: { order_number?: string };
  };
  if (session.payment_status !== 'paid' || !session.metadata?.order_number) {
    return res.status(400).json({ error: 'Stripe payment has not been completed.' });
  }

  const order = await mutateDb((db) => {
    const o = db.orders.find((ord) => ord.order_number === session.metadata!.order_number);
    if (!o) throw new Error('Order not found.');
    if (o.payment_status !== 'paid') {
      for (const item of o.items) {
        const prod = db.products.find((p) => p.id === item.product_id);
        const variant = prod?.variants.find((v) => v.id === item.product_variant_id);
        if (variant && variant.stock_quantity >= item.quantity) {
          variant.stock_quantity -= item.quantity;
        }
      }
      if (o.coupon_code) {
        const c = db.coupons.find((cp) => cp.code === o.coupon_code);
        if (c) c.usage_count += 1;
      }
      if (o.user_id) {
        db.cart_items = db.cart_items.filter((ci) => ci.user_id !== o.user_id);
      }
      o.payment_status = 'paid';
      o.order_status = 'confirmed';
      o.updated_at = new Date().toISOString();
      db.payments.push({
        id: `pay-${crypto.randomUUID()}`,
        order_id: o.id,
        provider: 'stripe',
        provider_order_id: session.id,
        provider_payment_id: session.payment_intent || session.id,
        amount: o.total_amount,
        status: 'paid',
        created_at: new Date().toISOString(),
      });
    }
    return o;
  });
  res.json({ order });
});

app.get('/api/orders', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const orders = db.orders.filter((o) => o.user_id === req.authUser!.id);
  res.json({ orders });
});

app.get('/api/orders/track/:orderNumber', optionalAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const order = db.orders.find(
    (o) => o.order_number.toLowerCase() === req.params.orderNumber.toLowerCase()
  );
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const emailQuery = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
  const isOwner = req.authUser && (order.user_id === req.authUser.id || req.authUser.role === 'admin');
  const matchesEmail = emailQuery && order.shipping_address.email.toLowerCase() === emailQuery;

  if (!isOwner && !matchesEmail) {
    // Allow viewing confirmation immediately by exact order number only with non-sensitive summary, or require email for guest lookup
    return res.json({
      order: {
        ...order,
        shipping_address: {
          ...order.shipping_address,
          phone: '***',
          address_line: '***',
          street: '***',
        },
      },
    });
  }
  res.json({ order });
});

app.post('/api/orders/:orderNumber/cancel', requireAuth, async (req: AuthRequest, res) => {
  try {
    const order = await mutateDb((db) => {
      const o = db.orders.find(
        (ord) => ord.order_number === req.params.orderNumber && (ord.user_id === req.authUser!.id || req.authUser!.role === 'admin')
      );
      if (!o) throw new Error('Order not found.');
      if (['shipped', 'delivered', 'cancelled'].includes(o.order_status)) {
        throw new Error(`Order cannot be cancelled while ${o.order_status}.`);
      }
      if (o.order_status !== 'pending') {
        for (const item of o.items) {
          const prod = db.products.find((p) => p.id === item.product_id);
          const variant = prod?.variants.find((v) => v.id === item.product_variant_id);
          if (variant) variant.stock_quantity += item.quantity;
        }
      }
      o.order_status = 'cancelled';
      if (o.payment_status === 'paid') o.payment_status = 'refunded';
      o.updated_at = new Date().toISOString();
      return o;
    });
    res.json({ order });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------- ADMIN DASHBOARD & CRUD ROUTES ----------

app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const db = getDb();
  const validOrders = db.orders.filter((o) => o.order_status !== 'cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalOrders = db.orders.length;
  const totalCustomers = db.users.filter((u) => u.role === 'customer').length;
  const totalProducts = db.products.length;

  const statusCounts = db.orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] || 0) + 1;
    return acc;
  }, {});

  // Build 7-day revenue series (with real orders + baseline daily structure)
  const dailyMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dailyMap.set(d, 0);
  }
  for (const o of validOrders) {
    const key = o.created_at.slice(0, 10);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + o.total_amount);
    }
  }
  const revenueSeries = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }));

  const bestsellers = [...db.products]
    .sort((a, b) => Number(b.bestseller) - Number(a.bestseller) || b.review_count - a.review_count)
    .slice(0, 5);

  res.json({
    metrics: {
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
    },
    statusCounts,
    revenueSeries,
    recentOrders: db.orders.slice(0, 8),
    bestsellers,
  });
});

app.get('/api/admin/products', requireAdmin, (_req, res) => {
  const db = getDb();
  res.json({ products: db.products });
});

app.post('/api/admin/upload', requireAdmin, async (req, res) => {
  const parsed = z
    .object({
      dataUrl: z.string().min(20),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid upload payload.' });

  const match = parsed.data.dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return res.status(400).json({ error: 'Only PNG, JPEG, or WEBP images are supported.' });
  }
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 4 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image size must be 4 MB or smaller.' });
  }

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  const target = path.resolve(UPLOADS_DIR, filename);
  if (!target.startsWith(UPLOADS_DIR + path.sep)) {
    return res.status(400).json({ error: 'Invalid upload path.' });
  }
  fs.writeFileSync(target, buffer);
  res.json({ url: `/uploads/${filename}` });
});

const adminProductSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().min(5).max(3000),
  fabric_info: z.string().trim().max(400).optional().default('Organic Cotton Blend'),
  care_info: z.string().trim().max(400).optional().default('Machine wash cold. Lay flat to dry.'),
  category_id: z.string().min(1),
  gender: z.enum(['men', 'women', 'unisex']),
  brand: z.string().trim().min(2).max(80),
  collection: z.string().trim().min(2).max(80).default('The Everyday Edit'),
  base_price: z.number().int().min(1),
  sale_price: z.number().int().min(1).nullable().optional(),
  featured: z.boolean().default(false),
  bestseller: z.boolean().default(false),
  new_arrival: z.boolean().default(false),
  status: z.enum(['active', 'draft', 'archived']).default('active'),
  images: z.array(z.string().min(1)).min(1),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        size: z.string().trim().min(1),
        color: z.string().trim().min(1),
        color_hex: z.string().trim().default('#171717'),
        sku: z.string().trim().optional(),
        stock_quantity: z.number().int().min(0),
        price_adjustment: z.number().int().default(0),
      })
    )
    .min(1),
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const parsed = adminProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product payload.' });
  }
  try {
    const created = await mutateDb((db) => {
      const cat = db.categories.find((c) => c.id === parsed.data.category_id);
      if (!cat) throw new Error('Category not found.');
      const id = `prod-${crypto.randomUUID().slice(0, 8)}`;
      const baseSlug = (parsed.data.slug || parsed.data.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const slug = db.products.some((p) => p.slug === baseSlug)
        ? `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`
        : baseSlug;

      const product: Product = {
        id,
        name: parsed.data.name,
        slug,
        description: parsed.data.description,
        fabric_info: parsed.data.fabric_info,
        care_info: parsed.data.care_info,
        category_id: cat.id,
        category_name: cat.name,
        category_slug: cat.slug,
        gender: parsed.data.gender,
        brand: parsed.data.brand,
        collection: parsed.data.collection,
        base_price: parsed.data.base_price,
        sale_price: parsed.data.sale_price ?? null,
        featured: parsed.data.featured,
        bestseller: parsed.data.bestseller,
        new_arrival: parsed.data.new_arrival,
        status: parsed.data.status,
        rating_avg: 5.0,
        review_count: 0,
        images: parsed.data.images.map((url, idx) => ({
          id: `${id}-img-${idx + 1}`,
          product_id: id,
          image_url: url,
          display_order: idx,
        })),
        variants: parsed.data.variants.map((v, idx) => ({
          id: v.id || `${id}-var-${idx + 1}-${crypto.randomBytes(2).toString('hex')}`,
          product_id: id,
          size: v.size,
          color: v.color,
          color_hex: v.color_hex,
          sku: v.sku || `ATL-${id.slice(-4).toUpperCase()}-${v.size}-${idx + 1}`,
          stock_quantity: v.stock_quantity,
          price_adjustment: v.price_adjustment,
        })),
        created_at: new Date().toISOString(),
      };
      db.products.unshift(product);
      return product;
    });
    res.status(201).json({ product: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unable to create product.' });
  }
});

app.patch('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const parsed = adminProductSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product update.' });
  }
  const updated = await mutateDb((db) => {
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) return null;
    if (parsed.data.category_id) {
      const cat = db.categories.find((c) => c.id === parsed.data.category_id);
      if (cat) {
        product.category_id = cat.id;
        product.category_name = cat.name;
        product.category_slug = cat.slug;
      }
    }
    if (parsed.data.name !== undefined) product.name = parsed.data.name;
    if (parsed.data.description !== undefined) product.description = parsed.data.description;
    if (parsed.data.fabric_info !== undefined) product.fabric_info = parsed.data.fabric_info;
    if (parsed.data.care_info !== undefined) product.care_info = parsed.data.care_info;
    if (parsed.data.gender !== undefined) product.gender = parsed.data.gender;
    if (parsed.data.brand !== undefined) product.brand = parsed.data.brand;
    if (parsed.data.collection !== undefined) product.collection = parsed.data.collection;
    if (parsed.data.base_price !== undefined) product.base_price = parsed.data.base_price;
    if (parsed.data.sale_price !== undefined) product.sale_price = parsed.data.sale_price;
    if (parsed.data.featured !== undefined) product.featured = parsed.data.featured;
    if (parsed.data.bestseller !== undefined) product.bestseller = parsed.data.bestseller;
    if (parsed.data.new_arrival !== undefined) product.new_arrival = parsed.data.new_arrival;
    if (parsed.data.status !== undefined) product.status = parsed.data.status;
    if (parsed.data.images) {
      product.images = parsed.data.images.map((url, idx) => ({
        id: `${product.id}-img-${idx + 1}`,
        product_id: product.id,
        image_url: url,
        display_order: idx,
      }));
    }
    if (parsed.data.variants) {
      product.variants = parsed.data.variants.map((v, idx) => ({
        id: v.id || `${product.id}-var-${idx + 1}-${crypto.randomBytes(2).toString('hex')}`,
        product_id: product.id,
        size: v.size,
        color: v.color,
        color_hex: v.color_hex,
        sku: v.sku || `ATL-${product.id.slice(-4).toUpperCase()}-${v.size}-${idx + 1}`,
        stock_quantity: v.stock_quantity,
        price_adjustment: v.price_adjustment,
      }));
    }
    return product;
  });
  if (!updated) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product: updated });
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const removed = await mutateDb((db) => {
    const before = db.products.length;
    db.products = db.products.filter((p) => p.id !== req.params.id);
    return db.products.length < before;
  });
  if (!removed) return res.status(404).json({ error: 'Product not found.' });
  res.json({ success: true });
});

app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      subtitle: z.string().trim().max(120).optional().default('Curated essentials'),
      description: z.string().trim().max(500).optional().default(''),
      image_url: z.string().min(1),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid category.' });
  const category = await mutateDb((db) => {
    const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const created = {
      id: `cat-${crypto.randomUUID().slice(0, 6)}`,
      name: parsed.data.name,
      slug,
      subtitle: parsed.data.subtitle,
      description: parsed.data.description,
      image_url: parsed.data.image_url,
      created_at: new Date().toISOString(),
    };
    db.categories.push(created);
    return created;
  });
  res.status(201).json({ category });
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  const db = getDb();
  if (db.products.some((p) => p.category_id === req.params.id)) {
    return res.status(400).json({ error: 'Cannot delete a category that still contains products.' });
  }
  await mutateDb((state) => {
    state.categories = state.categories.filter((c) => c.id !== req.params.id);
  });
  res.json({ success: true });
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const db = getDb();
  res.json({ orders: db.orders });
});

app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  const parsed = z
    .object({
      order_status: z.enum(['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']).optional(),
      payment_status: z.enum(['pending', 'pending_cod', 'paid', 'failed', 'refunded']).optional(),
      tracking_number: z.string().trim().nullable().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid order update.' });

  const order = await mutateDb((db) => {
    const o = db.orders.find((ord) => ord.id === req.params.id);
    if (!o) return null;
    if (parsed.data.order_status !== undefined) o.order_status = parsed.data.order_status;
    if (parsed.data.payment_status !== undefined) o.payment_status = parsed.data.payment_status;
    if (parsed.data.tracking_number !== undefined) o.tracking_number = parsed.data.tracking_number;
    o.updated_at = new Date().toISOString();
    return o;
  });
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order });
});

app.post('/api/admin/orders/:id/refund', requireAdmin, async (req, res) => {
  try {
    const order = await mutateDb((db) => {
      const o = db.orders.find((ord) => ord.id === req.params.id);
      if (!o) throw new Error('Order not found.');
      if (o.payment_status !== 'paid') {
        throw new Error('Only paid orders can be refunded.');
      }
      o.payment_status = 'refunded';
      o.order_status = 'cancelled';
      o.updated_at = new Date().toISOString();
      for (const item of o.items) {
        const prod = db.products.find((p) => p.id === item.product_id);
        const variant = prod?.variants.find((v) => v.id === item.product_variant_id);
        if (variant) variant.stock_quantity += item.quantity;
      }
      return o;
    });
    res.json({ order });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/customers', requireAdmin, (_req, res) => {
  const db = getDb();
  const customers = db.users
    .filter((u) => u.role === 'customer')
    .map((u) => {
      const orders = db.orders.filter((o) => o.user_id === u.id);
      const totalSpent = orders
        .filter((o) => o.order_status !== 'cancelled')
        .reduce((sum, o) => sum + o.total_amount, 0);
      return {
        ...sanitizeUser(u),
        order_count: orders.length,
        total_spent: totalSpent,
        orders,
      };
    });
  res.json({ customers });
});

app.get('/api/admin/coupons', requireAdmin, (_req, res) => {
  const db = getDb();
  res.json({ coupons: db.coupons });
});

const couponSchema = z.object({
  code: z.string().trim().min(3).max(30),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().int().min(1),
  minimum_order: z.number().int().min(0).default(0),
  maximum_discount: z.number().int().min(1).nullable().optional(),
  expiry_date: z.string().min(4),
  usage_limit: z.number().int().min(1).default(1000),
  is_active: z.boolean().default(true),
});

app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
  const parsed = couponSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid coupon.' });
  try {
    const coupon = await mutateDb((db) => {
      const code = parsed.data.code.toUpperCase();
      if (db.coupons.some((c) => c.code === code)) {
        throw new Error('Coupon code already exists.');
      }
      const created = {
        id: `coup-${crypto.randomUUID().slice(0, 8)}`,
        code,
        discount_type: parsed.data.discount_type,
        discount_value: parsed.data.discount_value,
        minimum_order: parsed.data.minimum_order,
        maximum_discount: parsed.data.maximum_discount ?? null,
        expiry_date: parsed.data.expiry_date,
        usage_limit: parsed.data.usage_limit,
        usage_count: 0,
        is_active: parsed.data.is_active,
      };
      db.coupons.unshift(created);
      return created;
    });
    res.status(201).json({ coupon });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unable to create coupon.' });
  }
});

app.patch('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
  const parsed = couponSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid coupon update.' });
  const updated = await mutateDb((db) => {
    const c = db.coupons.find((cp) => cp.id === req.params.id);
    if (!c) return null;
    Object.assign(c, parsed.data);
    if (parsed.data.code) c.code = parsed.data.code.toUpperCase();
    return c;
  });
  if (!updated) return res.status(404).json({ error: 'Coupon not found.' });
  res.json({ coupon: updated });
});

app.delete('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
  await mutateDb((db) => {
    db.coupons = db.coupons.filter((c) => c.id !== req.params.id);
  });
  res.json({ success: true });
});

app.get('/api/admin/reviews', requireAdmin, (_req, res) => {
  const db = getDb();
  res.json({ reviews: db.reviews });
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  await mutateDb((db) => {
    const rev = db.reviews.find((r) => r.id === req.params.id);
    db.reviews = db.reviews.filter((r) => r.id !== req.params.id);
    if (rev) {
      const prod = db.products.find((p) => p.id === rev.product_id);
      if (prod) {
        const remaining = db.reviews.filter((r) => r.product_id === prod.id);
        prod.review_count = remaining.length;
        prod.rating_avg =
          remaining.length > 0
            ? Number((remaining.reduce((s, r) => s + r.rating, 0) / remaining.length).toFixed(1))
            : 5.0;
      }
    }
  });
  res.json({ success: true });
});

app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  const db = getDb();
  const gw = getGatewayConfig();
  res.json({
    settings: db.settings,
    gateways: {
      razorpay_enabled: gw.razorpay_enabled,
      stripe_enabled: gw.stripe_enabled,
      cod_enabled: gw.cod_enabled,
    },
  });
});

app.patch('/api/admin/settings', requireAdmin, async (req, res) => {
  const parsed = z
    .object({
      store_name: z.string().trim().min(2).max(60).optional(),
      free_shipping_threshold: z.number().int().min(0).optional(),
      standard_shipping_fee: z.number().int().min(0).optional(),
      express_shipping_fee: z.number().int().min(0).optional(),
      tax_rate_percent: z.number().min(0).max(40).optional(),
      support_email: z.string().trim().email().optional(),
      announcement_text: z.string().trim().min(3).max(160).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid settings update.' });
  const settings: StoreSettings = await mutateDb((db) => {
    Object.assign(db.settings, parsed.data);
    return db.settings;
  });
  res.json({ settings });
});

// ---------- SEO: SITEMAP & ROBOTS ----------

app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const db = getDb();
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const staticPaths = ['/', '/shop', '/men', '/women', '/streetwear', '/new-arrivals', '/best-sellers', '/collections', '/about', '/contact', '/size-guide', '/faq', '/shipping-returns'];
  const productUrls = db.products
    .filter((p) => p.status === 'active')
    .map((p) => `<url><loc>${baseUrl}/product/${p.slug}</loc><changefreq>weekly</changefreq></url>`)
    .join('');
  const staticUrls = staticPaths
    .map((p) => `<url><loc>${baseUrl}${p}</loc><changefreq>daily</changefreq></url>`)
    .join('');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${productUrls}</urlset>`
  );
});

// ---------- VITE / STATIC SPA FALLBACK ----------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ATELIER server running on port ${PORT}`);
  });
}

startServer();
