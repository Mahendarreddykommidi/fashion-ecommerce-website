import React from 'react';
import { Navbar } from '../navigation/Navbar.tsx';
import { Footer } from './Footer.tsx';
import { CartDrawer } from '../cart/CartDrawer.tsx';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#171717] overflow-x-hidden">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
