export type UserRole = 'customer' | 'admin';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  email_verified: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  image_url: string;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  color_hex: string;
  sku: string;
  stock_quantity: number;
  price_adjustment: number;
}

export type GenderTarget = 'men' | 'women' | 'unisex';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  fabric_info: string;
  care_info: string;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  gender: GenderTarget;
  brand: string;
  collection: string;
  base_price: number;
  sale_price: number | null;
  featured: boolean;
  bestseller: boolean;
  new_arrival: boolean;
  status: 'active' | 'draft' | 'archived';
  rating_avg: number;
  review_count: number;
  images: ProductImage[];
  variants: ProductVariant[];
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_variant_id: string;
  product_name: string;
  product_slug: string;
  brand: string;
  image_url: string;
  selected_size: string;
  selected_color: string;
  color_hex: string;
  unit_price: number;
  original_price: number;
  quantity: number;
  stock_quantity: number;
}

export type PaymentMethod = 'razorpay' | 'stripe' | 'cod';
export type PaymentStatus = 'pending' | 'pending_cod' | 'paid' | 'failed' | 'refunded';
export type OrderStatus = 'pending' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_variant_id: string;
  product_name_snapshot: string;
  product_slug_snapshot: string;
  image_url_snapshot: string;
  selected_size: string;
  selected_color: string;
  quantity: number;
  unit_price: number;
}

export interface OrderShippingAddress {
  full_name: string;
  email: string;
  phone: string;
  address_line: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  guest_email?: string;
  order_number: string;
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  shipping_fee: number;
  delivery_option: 'standard' | 'express';
  tax_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  shipping_address: OrderShippingAddress;
  tracking_number: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_order: number;
  maximum_discount: number | null;
  expiry_date: string;
  usage_limit: number;
  usage_count: number;
  is_active: boolean;
}

export interface Review {
  id: string;
  user_id: string;
  user_name: string;
  product_id: string;
  product_name?: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface StoreSettings {
  store_name: string;
  free_shipping_threshold: number;
  standard_shipping_fee: number;
  express_shipping_fee: number;
  tax_rate_percent: number;
  support_email: string;
  announcement_text: string;
}

export interface PaymentGatewayStatus {
  razorpay_enabled: boolean;
  razorpay_key_id?: string;
  stripe_enabled: boolean;
  cod_enabled: boolean;
}
