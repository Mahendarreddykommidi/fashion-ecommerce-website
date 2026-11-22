import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { CartProvider } from './contexts/CartContext.tsx';
import { WishlistProvider } from './contexts/WishlistContext.tsx';
import { ToastProvider } from './contexts/ToastContext.tsx';
import { Layout } from './components/layout/Layout.tsx';
import Home from './pages/Home.tsx';
import Shop from './pages/Shop.tsx';
import ProductDetails from './pages/ProductDetails.tsx';
import Cart from './pages/Cart.tsx';
import Wishlist from './pages/Wishlist.tsx';
import Checkout from './pages/Checkout.tsx';
import OrderConfirmation from './pages/OrderConfirmation.tsx';
import TrackOrder from './pages/TrackOrder.tsx';
import Account from './pages/Account.tsx';
import { ForgotPassword, Login, Register } from './pages/AuthPages.tsx';
import {
  About,
  Collections,
  Contact,
  FaqPage,
  PolicyPage,
  SizeGuidePage,
} from './pages/InfoPages.tsx';
import AdminDashboard from './admin/AdminDashboard.tsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ScrollToTop />
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route
                    path="/men"
                    element={
                      <Shop
                        presetGender="men"
                        pageTitle="Men's Collection"
                        pageSubtitle="Tailored shirting, selvedge denim, outerwear, and everyday essentials."
                      />
                    }
                  />
                  <Route
                    path="/women"
                    element={
                      <Shop
                        presetGender="women"
                        pageTitle="Women's Collection"
                        pageSubtitle="Refined silhouettes, breathable linen dresses, and fine merino knitwear."
                      />
                    }
                  />
                  <Route
                    path="/streetwear"
                    element={
                      <Shop
                        presetCategory="streetwear"
                        pageTitle="Urban Streetwear"
                        pageSubtitle="Heavyweight French terry hoodies, articulated cargos, and boxy tees."
                      />
                    }
                  />
                  <Route
                    path="/new-arrivals"
                    element={
                      <Shop
                        presetNewArrival
                        pageTitle="New Arrivals"
                        pageSubtitle="Fresh seasonal drops crafted in organic cotton, European flax, and calfskin."
                      />
                    }
                  />
                  <Route
                    path="/best-sellers"
                    element={
                      <Shop
                        presetBestseller
                        pageTitle="Best Sellers"
                        pageSubtitle="Our highest-rated wardrobe anchors worn on repeat."
                      />
                    }
                  />
                  <Route path="/collections" element={<Collections />} />
                  <Route path="/product/:slug" element={<ProductDetails />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
                  <Route path="/track-order" element={<TrackOrder />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/size-guide" element={<SizeGuidePage />} />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/shipping-returns" element={<PolicyPage kind="shipping" />} />
                  <Route path="/privacy-policy" element={<PolicyPage kind="privacy" />} />
                  <Route path="/terms" element={<PolicyPage kind="terms" />} />

                  {/* Admin Suite */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/products" element={<AdminDashboard />} />
                  <Route path="/admin/categories" element={<AdminDashboard />} />
                  <Route path="/admin/orders" element={<AdminDashboard />} />
                  <Route path="/admin/customers" element={<AdminDashboard />} />
                  <Route path="/admin/coupons" element={<AdminDashboard />} />
                  <Route path="/admin/reviews" element={<AdminDashboard />} />
                  <Route path="/admin/settings" element={<AdminDashboard />} />

                  <Route path="*" element={<Shop pageTitle="Explore ATELIER" />} />
                </Routes>
              </Layout>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
