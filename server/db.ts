import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  Address,
  Category,
  Coupon,
  Order,
  Product,
  Review,
  StoreSettings,
  UserRole,
} from '../src/types/ecommerce.ts';

export interface StoredUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: UserRole;
  email_verified: boolean;
  created_at: string;
}

export interface StoredSession {
  token: string;
  user_id: string;
  expires_at: string;
}

export interface StoredResetToken {
  token: string;
  user_id: string;
  expires_at: string;
}

export interface StoredCartItem {
  id: string;
  user_id: string;
  product_variant_id: string;
  quantity: number;
}

export interface StoredWishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface StoredPayment {
  id: string;
  order_id: string;
  provider: 'razorpay' | 'stripe' | 'cod';
  provider_order_id?: string;
  provider_payment_id?: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface StoredSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface DatabaseState {
  users: StoredUser[];
  sessions: StoredSession[];
  reset_tokens: StoredResetToken[];
  categories: Category[];
  products: Product[];
  addresses: Address[];
  cart_items: StoredCartItem[];
  wishlists: StoredWishlistItem[];
  orders: Order[];
  payments: StoredPayment[];
  coupons: Coupon[];
  reviews: Review[];
  newsletter_subscribers: StoredSubscriber[];
  settings: StoreSettings;
  admin_bootstrap: {
    claimed: boolean;
    passcode_hash: string | null;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'atelier-db.json');

// Use generated assets as reliable, zero-broken local photography
const IMG = {
  heroBlazer: '/src/assets/images/hero_editorial_blazer_1795358277842.jpg',
  heroWomensSummer: '/src/assets/images/hero_womens_summer_1795358279419.jpg',
  streetwear: '/src/assets/images/hero_streetwear_look_1795358068664.jpg',
  oversizedTee: '/src/assets/images/prod_oversized_tee_1795358068409.jpg',
  casualShirt: '/src/assets/images/prod_casual_shirt_1795358068564.jpg',
  relaxedDenim: '/src/assets/images/prod_relaxed_denim_1795358068792.jpg',
  essentialHoodie: '/src/assets/images/prod_essential_hoodie_1795358068572.jpg',
  minimalSneakers: '/src/assets/images/prod_minimal_sneakers_1795358069136.jpg',
  bomberJacket: '/src/assets/images/prod_bomber_jacket_1795358069410.jpg',
  toteBag: '/src/assets/images/prod_tote_bag_1795358068183.jpg',
  croppedCardigan: '/src/assets/images/prod_cropped_cardigan_1795358068162.jpg',
  streetCargo: '/src/assets/images/prod_street_cargo_1795358068722.jpg',
  ribbedKnit: '/src/assets/images/prod_ribbed_knit_top_1795358068774.jpg',
  overshirtJacket: '/src/assets/images/prod_overshirt_jacket_1795358069536.jpg',
  linenResort: '/src/assets/images/prod_linen_resort_set_1795358068845.jpg',
  summerDress: '/src/assets/images/prod_summer_dress_1795358277668.jpg',
  leatherLoafers: '/src/assets/images/prod_leather_loafers_1795358278736.jpg',
  sunglasses: '/src/assets/images/prod_sunglasses_acetate_1795358278746.jpg',
};

function createSeedDatabase(): DatabaseState {
  const now = new Date().toISOString();

  const categories: Category[] = [
    {
      id: 'cat-mens',
      name: "Men's Clothing",
      slug: 'mens-clothing',
      subtitle: 'Tailored silhouettes & everyday layers',
      description: 'Architectural shirting, selvedge denim, and heavyweight cotton essentials engineered for daily rotation.',
      image_url: IMG.casualShirt,
      created_at: now,
    },
    {
      id: 'cat-womens',
      name: "Women's Clothing",
      slug: 'womens-clothing',
      subtitle: 'Refined drape & organic knitwear',
      description: 'Merino knitwear, sculpted tops, and breathable linen silhouettes crafted with quiet proportion.',
      image_url: IMG.heroBlazer,
      created_at: now,
    },
    {
      id: 'cat-streetwear',
      name: 'Streetwear',
      slug: 'streetwear',
      subtitle: 'Heavyweight jersey & utility cuts',
      description: 'Boxy loopback hoodies, articulated cargos, and garment-dyed tees built for modern urban movement.',
      image_url: IMG.streetwear,
      created_at: now,
    },
    {
      id: 'cat-sneakers',
      name: 'Sneakers',
      slug: 'sneakers',
      subtitle: 'Full-grain leather & suede court lows',
      description: 'Minimalist footwear with stitched cupsoles, Italian suede trims, and all-day cushioned footbeds.',
      image_url: IMG.minimalSneakers,
      created_at: now,
    },
    {
      id: 'cat-accessories',
      name: 'Accessories',
      slug: 'accessories',
      subtitle: 'Structured canvas & saddle leather',
      description: 'Heavyweight canvas totes, functional carryalls, and tactile accents designed to age gracefully.',
      image_url: IMG.toteBag,
      created_at: now,
    },
    {
      id: 'cat-summer',
      name: 'Summer Collection',
      slug: 'summer-collection',
      subtitle: 'Breathable Belgian linen & sunlit tones',
      description: 'Airy camp-collar shirting, unlined resort tailoring, and lightweight weaves for warm-weather dressing.',
      image_url: IMG.heroWomensSummer,
      created_at: now,
    },
  ];

  const rawProducts: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    fabric_info: string;
    care_info: string;
    category_id: string;
    gender: 'men' | 'women' | 'unisex';
    brand: string;
    collection: string;
    base_price: number;
    sale_price: number | null;
    featured: boolean;
    bestseller: boolean;
    new_arrival: boolean;
    images: string[];
    sizes: string[];
    colors: Array<{ name: string; hex: string }>;
    stock: number;
    rating: number;
    reviews: number;
  }> = [
    {
      id: 'prod-1',
      name: 'Oversized Cotton T-Shirt',
      slug: 'oversized-cotton-t-shirt',
      description: 'Cut from 280 GSM combed organic cotton jersey with a relaxed drop shoulder, dense ribbed collar, and clean straight hem.',
      fabric_info: '100% GOTS-Certified Organic Cotton · 280 GSM Heavyweight Jersey',
      care_info: 'Machine wash cold inside out. Lay flat to dry. Do not tumble dry.',
      category_id: 'cat-streetwear',
      gender: 'unisex',
      brand: 'ATELIER ORIGINALS',
      collection: 'Minimal Essentials',
      base_price: 1399,
      sale_price: 999,
      featured: true,
      bestseller: true,
      new_arrival: true,
      images: [IMG.oversizedTee, IMG.streetwear],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: [{ name: 'Chalk White', hex: '#F4F3EE' }, { name: 'Washed Charcoal', hex: '#343537' }],
      stock: 42,
      rating: 4.8,
      reviews: 64,
    },
    {
      id: 'prod-2',
      name: 'Premium Casual Shirt',
      slug: 'premium-casual-shirt',
      description: 'Garment-washed European flax linen and organic cotton blend tailored with mother-of-pearl buttons and a relaxed camp drape.',
      fabric_info: '55% Belgian Linen, 45% Combed Organic Cotton',
      care_info: 'Gentle cold wash. Steam while slightly damp for a natural drape.',
      category_id: 'cat-mens',
      gender: 'men',
      brand: 'FORM STUDIO',
      collection: 'The Everyday Edit',
      base_price: 2399,
      sale_price: 1799,
      featured: true,
      bestseller: true,
      new_arrival: false,
      images: [IMG.casualShirt, IMG.linenResort],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'Sage Stone', hex: '#8F9689' }, { name: 'Warm Ivory', hex: '#EDEAE0' }],
      stock: 28,
      rating: 4.9,
      reviews: 41,
    },
    {
      id: 'prod-3',
      name: 'Relaxed Fit Denim',
      slug: 'relaxed-fit-denim',
      description: '13.5 oz Japanese selvedge denim woven on vintage shuttle looms with a mid-rise, room through the thigh, and subtle taper.',
      fabric_info: '100% Organic Cotton Japanese Selvedge Denim · 13.5 oz',
      care_info: 'Wash sparingly in cold water. Hang dry away from direct heat.',
      category_id: 'cat-womens',
      gender: 'unisex',
      brand: 'ATELIER ORIGINALS',
      collection: 'Contemporary Classics',
      base_price: 3199,
      sale_price: 2499,
      featured: true,
      bestseller: true,
      new_arrival: false,
      images: [IMG.relaxedDenim, IMG.oversizedTee],
      sizes: ['28', '30', '32', '34', '36'],
      colors: [{ name: 'Vintage Indigo', hex: '#2F4663' }, { name: 'Washed Slate', hex: '#4B525A' }],
      stock: 30,
      rating: 4.7,
      reviews: 52,
    },
    {
      id: 'prod-4',
      name: 'Essential Hoodie',
      slug: 'essential-hoodie',
      description: 'Boxy silhouette constructed from 440 GSM French terry loopback cotton with double-lined hood and tonal flatlock stitching.',
      fabric_info: '100% Loopback Cotton French Terry · 440 GSM',
      care_info: 'Cold gentle cycle. Dry flat to preserve shoulder structure.',
      category_id: 'cat-streetwear',
      gender: 'unisex',
      brand: 'ESSENTIALS',
      collection: 'Urban Streetwear',
      base_price: 2799,
      sale_price: 1999,
      featured: true,
      bestseller: true,
      new_arrival: true,
      images: [IMG.essentialHoodie, IMG.streetCargo],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'Charcoal Wash', hex: '#2E2F32' }, { name: 'Oatmeal', hex: '#DDD8CD' }],
      stock: 36,
      rating: 4.9,
      reviews: 89,
    },
    {
      id: 'prod-5',
      name: "Women's Summer Dress",
      slug: 'womens-summer-dress',
      description: 'Effortless A-line silhouette cut from breathable linen-viscose with crisp architectural pleats and concealed side pockets.',
      fabric_info: '65% European Linen, 35% EcoVero Viscose',
      care_info: 'Hand wash cold or delicate cycle. Light steam.',
      category_id: 'cat-womens',
      gender: 'women',
      brand: 'EVERYDAY EDIT',
      collection: 'Summer Breeze',
      base_price: 2999,
      sale_price: 2299,
      featured: true,
      bestseller: false,
      new_arrival: true,
      images: [IMG.summerDress, IMG.heroWomensSummer],
      sizes: ['XS', 'S', 'M', 'L'],
      colors: [{ name: 'Warm Cream', hex: '#EFECE3' }, { name: 'Espresso', hex: '#3D2E27' }],
      stock: 22,
      rating: 4.8,
      reviews: 33,
    },
    {
      id: 'prod-6',
      name: 'Minimal Sneakers',
      slug: 'minimal-sneakers',
      description: 'Hand-lasted low-top court sneakers combining full-grain calfskin leather, brushed sand suede panels, and Margom rubber soles.',
      fabric_info: 'Full-Grain Italian Calfskin & Suede · Natural Rubber Cupsole',
      care_info: 'Wipe leather with damp cloth. Brush suede gently with soft crepe brush.',
      category_id: 'cat-sneakers',
      gender: 'unisex',
      brand: 'FORM STUDIO',
      collection: 'Minimal Essentials',
      base_price: 3999,
      sale_price: 2999,
      featured: true,
      bestseller: true,
      new_arrival: true,
      images: [IMG.minimalSneakers, IMG.oversizedTee],
      sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'],
      colors: [{ name: 'Chalk & Sand', hex: '#EDE9DF' }, { name: 'Bone White', hex: '#F6F5F0' }],
      stock: 25,
      rating: 4.9,
      reviews: 77,
    },
    {
      id: 'prod-7',
      name: 'Classic Bomber Jacket',
      slug: 'classic-bomber-jacket',
      description: 'Water-repellent Japanese nylon-cotton twill bomber with matte two-way gunmetal zip, articulated sleeves, and ribbed trims.',
      fabric_info: '62% Recycled Nylon, 38% Pima Cotton Twill · Cupro Lining',
      care_info: 'Spot clean or specialist dry clean only.',
      category_id: 'cat-mens',
      gender: 'unisex',
      brand: 'URBAN CULTURE',
      collection: 'Contemporary Classics',
      base_price: 4499,
      sale_price: 3499,
      featured: true,
      bestseller: true,
      new_arrival: false,
      images: [IMG.bomberJacket, IMG.overshirtJacket],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'Olive Noir', hex: '#2E322B' }, { name: 'Sandstone', hex: '#C7B8A1' }],
      stock: 18,
      rating: 4.8,
      reviews: 45,
    },
    {
      id: 'prod-8',
      name: 'Everyday Tote Bag',
      slug: 'everyday-tote-bag',
      description: '24 oz waxed natural cotton canvas paired with vegetable-tanned bridle leather straps, solid brass rivets, and a padded 16" laptop sleeve.',
      fabric_info: '24 oz Organic Cotton Canvas · Vegetable-Tanned Full-Grain Leather',
      care_info: 'Brush off dust. Condition leather straps annually with neutral balm.',
      category_id: 'cat-accessories',
      gender: 'unisex',
      brand: 'ATELIER ORIGINALS',
      collection: 'The Everyday Edit',
      base_price: 1299,
      sale_price: 899,
      featured: true,
      bestseller: true,
      new_arrival: false,
      images: [IMG.toteBag, IMG.minimalSneakers],
      sizes: ['One Size'],
      colors: [{ name: 'Ecru & Cognac', hex: '#C9B89E' }, { name: 'Charcoal Canvas', hex: '#3A3A3A' }],
      stock: 50,
      rating: 4.9,
      reviews: 112,
    },
    {
      id: 'prod-9',
      name: 'Merino Cropped Cardigan',
      slug: 'merino-cropped-cardigan',
      description: 'Fine-gauge 100% Australian merino wool cardigan finished with natural horn buttons and softly ribbed cuffs.',
      fabric_info: '100% Extra-Fine Merino Wool · 12-Gauge Knit',
      care_info: 'Hand wash cold with wool detergent. Reshape and dry flat.',
      category_id: 'cat-womens',
      gender: 'women',
      brand: 'EVERYDAY EDIT',
      collection: 'Contemporary Classics',
      base_price: 3299,
      sale_price: 2699,
      featured: false,
      bestseller: true,
      new_arrival: true,
      images: [IMG.croppedCardigan, IMG.ribbedKnit],
      sizes: ['XS', 'S', 'M', 'L'],
      colors: [{ name: 'Ivory Cream', hex: '#F3F0E6' }, { name: 'Stone Taupe', hex: '#B4ACA0' }],
      stock: 20,
      rating: 4.7,
      reviews: 29,
    },
    {
      id: 'prod-10',
      name: 'Articulated Utility Cargo',
      slug: 'articulated-utility-cargo',
      description: 'Technical cotton ripstop cargos featuring articulated knee darts, concealed gusset pockets, and adjustable drawcord hems.',
      fabric_info: '98% Organic Cotton Ripstop, 2% Elastane',
      care_info: 'Machine wash cold. Line dry.',
      category_id: 'cat-streetwear',
      gender: 'men',
      brand: 'URBAN CULTURE',
      collection: 'Urban Streetwear',
      base_price: 3499,
      sale_price: 2799,
      featured: false,
      bestseller: false,
      new_arrival: true,
      images: [IMG.streetCargo, IMG.streetwear],
      sizes: ['28', '30', '32', '34', '36'],
      colors: [{ name: 'Slate Olive', hex: '#6F7568' }, { name: 'Graphite', hex: '#37393B' }],
      stock: 26,
      rating: 4.6,
      reviews: 37,
    },
    {
      id: 'prod-11',
      name: 'Sculpted Ribbed Knit Top',
      slug: 'sculpted-ribbed-knit-top',
      description: 'Sleeveless high-neck halter top knitted in compact organic cotton rib for a clean, body-skimming contour.',
      fabric_info: '94% Organic Cotton, 6% Elastane Compact Rib',
      care_info: 'Gentle cold wash in mesh bag. Dry flat.',
      category_id: 'cat-womens',
      gender: 'women',
      brand: 'FORM STUDIO',
      collection: 'Minimal Essentials',
      base_price: 1499,
      sale_price: 1199,
      featured: false,
      bestseller: false,
      new_arrival: true,
      images: [IMG.ribbedKnit, IMG.croppedCardigan],
      sizes: ['XS', 'S', 'M', 'L'],
      colors: [{ name: 'Espresso', hex: '#3F2D24' }, { name: 'Warm Sand', hex: '#D6CAB8' }],
      stock: 34,
      rating: 4.8,
      reviews: 24,
    },
    {
      id: 'prod-12',
      name: 'Brushed Twill Overshirt',
      slug: 'brushed-twill-overshirt',
      description: 'Transitional layering overshirt cut from heavyweight brushed cotton twill with twin chest flap pockets and corozo buttons.',
      fabric_info: '100% Heavyweight Brushed Organic Cotton Twill · 340 GSM',
      care_info: 'Machine wash cold. Warm iron if needed.',
      category_id: 'cat-mens',
      gender: 'men',
      brand: 'ATELIER ORIGINALS',
      collection: 'The Everyday Edit',
      base_price: 2999,
      sale_price: 2399,
      featured: false,
      bestseller: true,
      new_arrival: false,
      images: [IMG.overshirtJacket, IMG.casualShirt],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'Sand Beige', hex: '#C6B497' }, { name: 'Charcoal', hex: '#383838' }],
      stock: 24,
      rating: 4.8,
      reviews: 48,
    },
    {
      id: 'prod-13',
      name: 'Linen Camp Resort Shirt',
      slug: 'linen-camp-resort-shirt',
      description: 'Airy open-collar resort shirt spun from pre-washed Normandy linen for effortless drape on warm coastal evenings.',
      fabric_info: '100% Pre-Washed European Linen',
      care_info: 'Cold gentle wash. Air dry on hanger.',
      category_id: 'cat-summer',
      gender: 'men',
      brand: 'EVERYDAY EDIT',
      collection: 'Summer Breeze',
      base_price: 2199,
      sale_price: 1699,
      featured: false,
      bestseller: false,
      new_arrival: true,
      images: [IMG.linenResort, IMG.casualShirt],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'Natural Ivory', hex: '#EAE5D7' }, { name: 'Sage Mist', hex: '#98A092' }],
      stock: 31,
      rating: 4.7,
      reviews: 19,
    },
    {
      id: 'prod-14',
      name: 'Heavyweight Boxy Tee',
      slug: 'heavyweight-boxy-tee',
      description: 'Garment-dyed charcoal streetwear tee with dropped shoulders and high-density dry-hand cotton finish.',
      fabric_info: '100% Combed Dry-Hand Cotton · 300 GSM',
      care_info: 'Machine wash cold with similar colors.',
      category_id: 'cat-streetwear',
      gender: 'unisex',
      brand: 'URBAN CULTURE',
      collection: 'Urban Streetwear',
      base_price: 1299,
      sale_price: null,
      featured: false,
      bestseller: true,
      new_arrival: false,
      images: [IMG.streetwear, IMG.oversizedTee],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'Washed Onyx', hex: '#2D2F30' }, { name: 'Bone', hex: '#ECEAE2' }],
      stock: 40,
      rating: 4.7,
      reviews: 55,
    },
    {
      id: 'prod-15',
      name: 'Drawstring Linen Trousers',
      slug: 'drawstring-linen-trousers',
      description: 'Relaxed tapered linen trousers featuring a discreet internal drawstring, single front pleat, and breathable cotton pocketing.',
      fabric_info: '100% Belgian Flax Linen',
      care_info: 'Cold gentle wash. Line dry.',
      category_id: 'cat-summer',
      gender: 'men',
      brand: 'FORM STUDIO',
      collection: 'Summer Breeze',
      base_price: 2599,
      sale_price: 2199,
      featured: false,
      bestseller: false,
      new_arrival: true,
      images: [IMG.linenResort, IMG.overshirtJacket],
      sizes: ['28', '30', '32', '34'],
      colors: [{ name: 'Oat Cream', hex: '#E6E0D0' }, { name: 'Slate', hex: '#5A5E60' }],
      stock: 27,
      rating: 4.8,
      reviews: 21,
    },
    {
      id: 'prod-16',
      name: 'Pleated Wide-Leg Trousers',
      slug: 'pleated-wide-leg-trousers',
      description: 'Double-pleated tailored trousers crafted from fluid organic linen-wool blend with an elongated clean drape.',
      fabric_info: '60% Organic Linen, 40% Traceable Merino Wool',
      care_info: 'Dry clean or delicate cold wool wash.',
      category_id: 'cat-womens',
      gender: 'women',
      brand: 'FORM STUDIO',
      collection: 'Contemporary Classics',
      base_price: 3499,
      sale_price: 2899,
      featured: false,
      bestseller: true,
      new_arrival: false,
      images: [IMG.heroBlazer, IMG.croppedCardigan],
      sizes: ['XS', 'S', 'M', 'L'],
      colors: [{ name: 'Warm Oatmeal', hex: '#D8CFC0' }, { name: 'Ivory', hex: '#F3EFE6' }],
      stock: 19,
      rating: 4.9,
      reviews: 31,
    },
    {
      id: 'prod-17',
      name: 'Calfskin Penny Loafers',
      slug: 'calfskin-penny-loafers',
      description: 'Hand-welted espresso calfskin penny loafers with Goodyear leather soles and cushioned anatomical footbeds.',
      fabric_info: 'Full-Grain Italian Calfskin Leather · Blake-Stitched Sole',
      care_info: 'Brush and condition with neutral shoe cream after wear.',
      category_id: 'cat-sneakers',
      gender: 'unisex',
      brand: 'ATELIER ORIGINALS',
      collection: 'Contemporary Classics',
      base_price: 4999,
      sale_price: 3899,
      featured: false,
      bestseller: true,
      new_arrival: true,
      images: [IMG.leatherLoafers, IMG.minimalSneakers],
      sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'],
      colors: [{ name: 'Espresso Black', hex: '#231D1A' }],
      stock: 21,
      rating: 4.9,
      reviews: 38,
    },
    {
      id: 'prod-18',
      name: 'Tortoiseshell Acetate Sunglasses',
      slug: 'tortoiseshell-acetate-sunglasses',
      description: 'Hand-carved Italian cellulose acetate frames fitted with Carl Zeiss UV400 tinted lenses and five-barrel hinges.',
      fabric_info: 'Mazzucchelli Bio-Acetate · CR-39 100% UV400 Lenses',
      care_info: 'Store in structured case. Clean with microfiber lens cloth.',
      category_id: 'cat-accessories',
      gender: 'unisex',
      brand: 'FORM STUDIO',
      collection: 'Summer Breeze',
      base_price: 2499,
      sale_price: 1899,
      featured: false,
      bestseller: false,
      new_arrival: true,
      images: [IMG.sunglasses, IMG.toteBag],
      sizes: ['One Size'],
      colors: [{ name: 'Warm Tortoise', hex: '#7A4B2A' }],
      stock: 26,
      rating: 4.9,
      reviews: 27,
    },
    {
      id: 'prod-19',
      name: 'Loopback Zip Sweatshirt',
      slug: 'loopback-zip-sweatshirt',
      description: 'Clean-line half-zip pullover engineered in midweight loopback terry with tonal YKK Excella hardware.',
      fabric_info: '100% Organic Loopback Cotton · 400 GSM',
      care_info: 'Cold gentle wash. Lay flat to dry.',
      category_id: 'cat-streetwear',
      gender: 'men',
      brand: 'ESSENTIALS',
      collection: 'Urban Streetwear',
      base_price: 2499,
      sale_price: 1899,
      featured: false,
      bestseller: false,
      new_arrival: false,
      images: [IMG.essentialHoodie, IMG.bomberJacket],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'Deep Charcoal', hex: '#2D2E30' }],
      stock: 29,
      rating: 4.6,
      reviews: 18,
    },
    {
      id: 'prod-20',
      name: 'Selvedge Relaxed Straight Jean',
      slug: 'selvedge-relaxed-straight-jean',
      description: 'Classic straight-leg silhouette in stone-washed organic denim with reinforced copper rivets and chain-stitched hems.',
      fabric_info: '100% Organic Cotton Denim · 13 oz',
      care_info: 'Machine wash cold inside out.',
      category_id: 'cat-mens',
      gender: 'men',
      brand: 'URBAN CULTURE',
      collection: 'Contemporary Classics',
      base_price: 2999,
      sale_price: 2399,
      featured: false,
      bestseller: false,
      new_arrival: false,
      images: [IMG.relaxedDenim, IMG.casualShirt],
      sizes: ['28', '30', '32', '34', '36'],
      colors: [{ name: 'Mid Indigo', hex: '#385478' }],
      stock: 25,
      rating: 4.7,
      reviews: 34,
    },
    {
      id: 'prod-21',
      name: 'Atelier Wool Overshirt',
      slug: 'atelier-wool-overshirt',
      description: 'Unstructured tailored overshirt cut from recycled Italian wool-twill for sharp transitional layering.',
      fabric_info: '70% Recycled Virgin Wool, 30% Recycled Polyamide',
      care_info: 'Dry clean only.',
      category_id: 'cat-mens',
      gender: 'men',
      brand: 'FORM STUDIO',
      collection: 'Contemporary Classics',
      base_price: 3899,
      sale_price: 3199,
      featured: false,
      bestseller: false,
      new_arrival: true,
      images: [IMG.overshirtJacket, IMG.bomberJacket],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'Camel Twill', hex: '#C2AD8D' }],
      stock: 15,
      rating: 4.9,
      reviews: 14,
    },
    {
      id: 'prod-22',
      name: 'Summer Breeze Linen Set',
      slug: 'summer-breeze-linen-set',
      description: 'Two-piece coordinated resort shirt and pleated drawstring trousers tailored from breathable ivory flax.',
      fabric_info: '100% European Long-Staple Linen',
      care_info: 'Machine wash cold delicate. Steam while damp.',
      category_id: 'cat-summer',
      gender: 'unisex',
      brand: 'EVERYDAY EDIT',
      collection: 'Summer Breeze',
      base_price: 4299,
      sale_price: 3499,
      featured: false,
      bestseller: true,
      new_arrival: true,
      images: [IMG.linenResort, IMG.oversizedTee],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: [{ name: 'Ivory Linen', hex: '#EBE6D8' }],
      stock: 20,
      rating: 4.9,
      reviews: 26,
    },
  ];

  const catMap = new Map(categories.map((c) => [c.id, c]));

  const products: Product[] = rawProducts.map((p) => {
    const cat = catMap.get(p.category_id)!;
    const images = p.images.map((url, idx) => ({
      id: `${p.id}-img-${idx + 1}`,
      product_id: p.id,
      image_url: url,
      display_order: idx,
    }));
    const variants = p.sizes.flatMap((size) =>
      p.colors.map((color) => ({
        id: `${p.id}-${size.toLowerCase().replace(/\s+/g, '')}-${color.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        product_id: p.id,
        size,
        color: color.name,
        color_hex: color.hex,
        sku: `ATL-${p.id.replace('prod-', '').padStart(3, '0')}-${size.replace(/\s+/g, '')}-${color.name.slice(0, 3).toUpperCase()}`,
        stock_quantity: Math.max(4, Math.floor(p.stock / (p.sizes.length * p.colors.length)) + 6),
        price_adjustment: 0,
      }))
    );

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      fabric_info: p.fabric_info,
      care_info: p.care_info,
      category_id: p.category_id,
      category_name: cat.name,
      category_slug: cat.slug,
      gender: p.gender,
      brand: p.brand,
      collection: p.collection,
      base_price: p.base_price,
      sale_price: p.sale_price,
      featured: p.featured,
      bestseller: p.bestseller,
      new_arrival: p.new_arrival,
      status: 'active',
      rating_avg: p.rating,
      review_count: p.reviews,
      images,
      variants,
      created_at: now,
    };
  });

  const coupons: Coupon[] = [
    {
      id: 'coup-welcome10',
      code: 'WELCOME10',
      discount_type: 'percentage',
      discount_value: 10,
      minimum_order: 999,
      maximum_discount: 1000,
      expiry_date: '2027-12-31T23:59:59.000Z',
      usage_limit: 5000,
      usage_count: 142,
      is_active: true,
    },
    {
      id: 'coup-atelier20',
      code: 'ATELIER20',
      discount_type: 'percentage',
      discount_value: 20,
      minimum_order: 2499,
      maximum_discount: 1500,
      expiry_date: '2027-12-31T23:59:59.000Z',
      usage_limit: 2000,
      usage_count: 89,
      is_active: true,
    },
    {
      id: 'coup-firstorder',
      code: 'FIRSTORDER',
      discount_type: 'fixed',
      discount_value: 400,
      minimum_order: 1499,
      maximum_discount: 400,
      expiry_date: '2027-12-31T23:59:59.000Z',
      usage_limit: 3000,
      usage_count: 215,
      is_active: true,
    },
  ];

  const reviews: Review[] = [
    {
      id: 'rev-1',
      user_id: 'seed-cust-1',
      user_name: 'Aarav Mehta',
      product_id: 'prod-1',
      product_name: 'Oversized Cotton T-Shirt',
      rating: 5,
      comment: 'The 280 GSM cotton drape feels substantial without ever feeling stiff. Collar holds its shape cleanly after multiple washes.',
      created_at: '2026-10-14T10:20:00.000Z',
    },
    {
      id: 'rev-2',
      user_id: 'seed-cust-2',
      user_name: 'Diya Kapoor',
      product_id: 'prod-5',
      product_name: "Women's Summer Dress",
      rating: 5,
      comment: 'Effortless cut and genuinely breathable linen. The hidden pockets make it my go-to daytime piece.',
      created_at: '2026-10-22T14:15:00.000Z',
    },
    {
      id: 'rev-3',
      user_id: 'seed-cust-3',
      user_name: 'Rohan Nair',
      product_id: 'prod-6',
      product_name: 'Minimal Sneakers',
      rating: 5,
      comment: 'Zero break-in time. The suede heel trim and off-white leather pair effortlessly with tailored trousers and denim.',
      created_at: '2026-11-02T09:40:00.000Z',
    },
    {
      id: 'rev-4',
      user_id: 'seed-cust-4',
      user_name: 'Ananya Verma',
      product_id: 'prod-8',
      product_name: 'Everyday Tote Bag',
      rating: 5,
      comment: 'Structured enough to stand on its own on my studio floor and comfortably carries my 16-inch laptop plus sketchbook.',
      created_at: '2026-11-10T17:05:00.000Z',
    },
  ];

  return {
    users: [],
    sessions: [],
    reset_tokens: [],
    categories,
    products,
    addresses: [],
    cart_items: [],
    wishlists: [],
    orders: [],
    payments: [],
    coupons,
    reviews,
    newsletter_subscribers: [],
    settings: {
      store_name: 'ATELIER',
      free_shipping_threshold: 1999,
      standard_shipping_fee: 149,
      express_shipping_fee: 299,
      tax_rate_percent: 12,
      support_email: 'concierge@atelier-store.com',
      announcement_text: 'NEW SEASON COLLECTION IS HERE · FREE SHIPPING ON ORDERS ABOVE ₹1,999',
    },
    admin_bootstrap: {
      claimed: false,
      passcode_hash: null,
    },
  };
}

let cachedDb: DatabaseState | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function ensureStorageDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function getDb(): DatabaseState {
  if (cachedDb) return cachedDb;
  ensureStorageDirs();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as DatabaseState;
      cachedDb = parsed;
      return cachedDb;
    } catch {
      // Fallback to fresh seed if corrupted
    }
  }
  cachedDb = createSeedDatabase();
  fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), 'utf8');
  return cachedDb;
}

export async function mutateDb<T>(mutator: (db: DatabaseState) => T | Promise<T>): Promise<T> {
  let result!: T;
  const next = writeQueue.then(async () => {
    const db = getDb();
    result = await mutator(db);
    ensureStorageDirs();
    const tmpFile = `${DB_FILE}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
  });
  writeQueue = next.catch(() => {});
  await next;
  return result;
}
