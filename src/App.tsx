/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from 'react-router-dom';
import { StoreProvider } from './context/StoreContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { ProductDetailsPage } from './pages/ProductDetailsPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage.tsx';
import { TrackOrderPage } from './pages/TrackOrderPage.tsx';
import { AdminPortalPage } from './pages/AdminPortalPage.tsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      // ignore in restricted webviews
    }
  }, [pathname]);
  return null;
}

class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCFBF8] text-[#1C1917] p-6 text-center">
          <h1 className="font-serif-display text-3xl font-semibold mb-2">
            Maa Lakshmi Alankar
          </h1>
          <p className="text-sm text-[#57534E] max-w-md mb-4">
            Unable to initialize storefront view: {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 text-xs font-semibold bg-[#1C1917] text-[#FCFBF8] rounded-xl cursor-pointer"
          >
            Reload Storefront
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminPortalPage />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFBF8] text-[#1C1917]">
      <Navbar />
      <CartDrawer />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<CatalogPage />} />
          <Route path="/category/:slug" element={<CatalogPage />} />
          <Route path="/product/:slug" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route
            path="/order-confirmation/:orderNumber"
            element={<OrderConfirmationPage />}
          />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <PreviewErrorBoundary>
      <StoreProvider>
        <HashRouter>
          <ScrollToTop />
          <AppRoutes />
        </HashRouter>
      </StoreProvider>
    </PreviewErrorBoundary>
  );
}
