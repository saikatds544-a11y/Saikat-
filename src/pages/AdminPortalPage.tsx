import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Image as ImageIcon,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Search,
  Edit3,
  Trash2,
  Upload,
  ExternalLink,
  Check,
  X,
  Phone,
} from 'lucide-react';
import type {
  AdminDashboardStats,
  Category,
  Order,
  OrderStatus,
  Product,
  SiteSettings,
} from '../types/store.ts';
import { useStore } from '../context/StoreContext.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { LuxuryImage } from '../components/LuxuryImage.tsx';
import { formatBDT, getEffectivePrice } from '../lib/formatters.ts';
import { AdminProductModal } from './admin/AdminProductModal.tsx';

type AdminTab =
  | 'overview'
  | 'orders'
  | 'products'
  | 'categories'
  | 'banners'
  | 'settings';

const ADMIN_TOKEN_KEY = 'mla_admin_session_token_v1';

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

function safeGetSession(key: string): string {
  try {
    return sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function safeSetSession(key: string, val: string): void {
  try {
    sessionStorage.setItem(key, val);
  } catch {
    // ignore in restricted iframe mode
  }
}

function safeRemoveSession(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore in restricted iframe mode
  }
}

export function AdminPortalPage() {
  const { refreshStorefront, settings: liveSettings } = useStore();

  const [token, setToken] = useState<string>(() => safeGetSession(ADMIN_TOKEN_KEY));
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [authChecking, setAuthChecking] = useState<boolean>(Boolean(token));

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard Data
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(liveSettings);
  const [statusBanner, setStatusBanner] = useState<string>('');

  // Order filters & detail modal
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Product filters & modal
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDeleteProdId, setConfirmDeleteProdId] = useState<string | null>(null);

  // Category form
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catNameBn, setCatNameBn] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImage, setCatImage] = useState('');
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);

  // Password update form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(''), 3500);
  };

  const loadDashboard = useCallback(
    async (activeToken: string) => {
      try {
        const res = await fetch('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (res.status === 401) {
          safeRemoveSession(ADMIN_TOKEN_KEY);
          setToken('');
          return;
        }
        const data = await res.json();
        if (res.ok) {
          setStats(data.stats);
          setOrders(data.orders || []);
          setProducts(data.products || []);
          setCategories(data.categories || []);
          if (data.settings) setSettingsForm(data.settings);
        }
      } catch (err) {
        console.error('Admin load error:', err);
      }
    },
    []
  );

  useEffect(() => {
    document.title = `Admin Dashboard – ${liveSettings.websiteName}`;
  }, [liveSettings.websiteName]);

  useEffect(() => {
    if (!token) {
      setAuthChecking(false);
      return;
    }
    fetch('/api/admin/session', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setAdminEmail(data.email || '');
          return loadDashboard(token);
        } else {
          safeRemoveSession(ADMIN_TOKEN_KEY);
          setToken('');
        }
      })
      .catch(() => {
        safeRemoveSession(ADMIN_TOKEN_KEY);
        setToken('');
      })
      .finally(() => setAuthChecking(false));
  }, [token, loadDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Invalid credentials.');
      }
      safeSetSession(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      setAdminEmail(data.email || loginEmail.trim());
      setLoginPassword('');
      await loadDashboard(data.token);
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    safeRemoveSession(ADMIN_TOKEN_KEY);
    setToken('');
    setAdminEmail('');
  };

  const handleOrderStatusUpdate = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await loadDashboard(token);
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
        }
        showToast(`Order status updated to ${nextStatus}.`);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConfirmDeleteProdId(null);
        await Promise.all([loadDashboard(token), refreshStorefront()]);
        showToast('Jewellery product deleted.');
      }
    } catch {
      // ignore
    }
  };

  const handleUploadSettingAsset = async (
    file: File,
    field: keyof SiteSettings
  ) => {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileName: file.name, dataUrl }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setSettingsForm((prev) => ({ ...prev, [field]: data.url }));
        showToast('Image uploaded. Click Save Changes to publish.');
      }
    } catch {
      showToast('Image upload failed.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settingsForm),
      });
      if (res.ok) {
        await Promise.all([loadDashboard(token), refreshStorefront()]);
        showToast('Website settings & content published live.');
      }
    } catch {
      showToast('Failed to save settings.');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const url = editingCatId
      ? `/api/admin/categories/${encodeURIComponent(editingCatId)}`
      : '/api/admin/categories';
    const method = editingCatId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: catName.trim(),
        nameBn: catNameBn.trim() || catName.trim(),
        description: catDesc.trim(),
        image: catImage.trim(),
      }),
    });

    if (res.ok) {
      setEditingCatId(null);
      setCatName('');
      setCatNameBn('');
      setCatDesc('');
      setCatImage('');
      await Promise.all([loadDashboard(token), refreshStorefront()]);
      showToast(editingCatId ? 'Category updated.' : 'Category created.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setConfirmDeleteCatId(null);
      await Promise.all([loadDashboard(token), refreshStorefront()]);
      showToast('Category deleted.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    const res = await fetch('/api/admin/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: adminEmail,
        currentPassword,
        newPassword,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMessage('Admin password updated successfully.');
    } else {
      setPasswordMessage(data.error || 'Could not update password.');
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter !== 'All' && o.status !== orderStatusFilter) {
        return false;
      }
      if (orderSearch.trim()) {
        const q = orderSearch.trim().toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.mobileNumber.toLowerCase().includes(q) ||
          o.district.toLowerCase().includes(q) ||
          o.upazila.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (productCategoryFilter !== 'all' && p.category !== productCategoryFilter) {
        return false;
      }
      if (productSearch.trim()) {
        const q = productSearch.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.productCode.toLowerCase().includes(q) ||
          (p.nameBn && p.nameBn.includes(productSearch.trim()))
        );
      }
      return true;
    });
  }, [products, productCategoryFilter, productSearch]);

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF8] text-sm text-[#78716C]">
        Verifying private admin session...
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PROTECTED PRIVATE ADMIN LOGIN SCREEN
  // ---------------------------------------------------------------------------
  if (!token) {
    return (
      <div className="min-h-screen bg-[#171412] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#FCFBF8] border border-[#EAE2D3] rounded-2xl p-7 sm:p-9 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <BrandLogo />
            </div>
            <h1 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
              Private Admin Portal
            </h1>
            <p className="text-xs text-[#78716C]">
              Restricted strictly to authorized Maa Lakshmi Alankar store administrators.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@maalakshmialankar.com"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 px-5 text-sm font-semibold text-[#FCFBF8] bg-[#1C1917] hover:bg-[#9A7024] rounded-xl transition-colors cursor-pointer"
            >
              {loggingIn ? 'Authenticating...' : 'Sign In to Admin Dashboard'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#EAE2D3] text-center">
            <Link
              to="/"
              className="text-xs font-medium text-[#78716C] hover:text-[#1C1917]"
            >
              ← Return to Public Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED ADMIN DASHBOARD
  // ---------------------------------------------------------------------------
  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'orders',
      label: `Orders (${orders.length})`,
      icon: <ShoppingCart className="w-4 h-4" />,
    },
    {
      id: 'products',
      label: `Products (${products.length})`,
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: <FolderTree className="w-4 h-4" />,
    },
    {
      id: 'banners',
      label: 'Banners & Home',
      icon: <ImageIcon className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings, Pixel & SEO',
      icon: <SettingsIcon className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-[#171412] text-[#E7E0D3] shrink-0">
        <div className="px-6 py-5 border-b border-[#2D261F] [&_span]:text-[#FCFBF8]">
          <BrandLogo compact />
          <p className="text-[11px] text-[#9C9283] mt-1 truncate">{adminEmail}</p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-colors cursor-pointer ${
                activeTab === item.id
                  ? 'bg-[#B58938] text-[#171412]'
                  : 'text-[#C8BFA8] hover:bg-[#26211B] hover:text-white'
              }`}
            >
              {item.icon}
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#2D261F] space-y-2">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-[#E7E0D3] border border-[#3B3229] hover:border-[#B58938] rounded-lg"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live Website</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-red-300 hover:bg-red-950/50 rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Admin Header & Scrollable Tab Bar */}
      <div className="lg:hidden bg-[#171412] text-[#FCFBF8] sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2D261F]">
          <div className="[&_span]:text-[#FCFBF8]">
            <BrandLogo compact />
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="px-2.5 py-1.5 text-xs border border-[#3E352B] rounded-lg text-[#E5C580]"
            >
              Store
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-red-300 rounded-lg"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'bg-[#B58938] text-[#171412]'
                  : 'text-[#C8BFA8]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
        {statusBanner && (
          <div className="p-3.5 rounded-xl bg-[#1C1917] text-[#F5EFE6] text-xs sm:text-sm font-medium flex items-center justify-between shadow-md">
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner('')}
              className="text-[#A8A29E] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="font-serif-display text-3xl font-semibold text-[#1C1917]">
                  Store Performance Overview
                </h1>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Real-time Cash on Delivery orders, confirmed sales, and jewellery inventory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setProductModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#1C1917] text-[#FCFBF8] hover:bg-[#9A7024] rounded-xl cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Jewellery</span>
              </button>
            </div>

            {/* 5 Core KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white border border-[#EAE2D3] rounded-xl p-4">
                <p className="text-xs text-[#78716C]">Total Orders</p>
                <p className="text-2xl font-semibold text-[#1C1917] font-tabular mt-1">
                  {stats.totalOrders}
                </p>
              </div>
              <div className="bg-white border border-[#EAE2D3] rounded-xl p-4">
                <p className="text-xs text-[#78716C]">Pending Orders</p>
                <p className="text-2xl font-semibold text-[#9A7024] font-tabular mt-1">
                  {stats.pendingOrders}
                </p>
              </div>
              <div className="bg-white border border-[#EAE2D3] rounded-xl p-4">
                <p className="text-xs text-[#78716C]">Confirmed Orders</p>
                <p className="text-2xl font-semibold text-[#1C1917] font-tabular mt-1">
                  {stats.confirmedOrders}
                </p>
              </div>
              <div className="bg-white border border-[#EAE2D3] rounded-xl p-4">
                <p className="text-xs text-[#78716C]">Delivered Orders</p>
                <p className="text-2xl font-semibold text-emerald-800 font-tabular mt-1">
                  {stats.deliveredOrders}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-[#1C1917] text-[#FCFBF8] rounded-xl p-4">
                <p className="text-xs text-[#C8BFA8]">Total Sales (BDT)</p>
                <p className="text-xl font-semibold text-[#E5C580] font-tabular mt-1">
                  {formatBDT(stats.totalSales, 'en')}
                </p>
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white border border-[#EAE2D3] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#EAE2D3] flex items-center justify-between">
                <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                  Recent Customer Orders
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-medium text-[#9A7024] hover:underline cursor-pointer"
                >
                  Manage All Orders →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#FCFBF8] text-xs text-[#78716C] border-b border-[#F0E9DC]">
                    <tr>
                      <th className="px-5 py-3 font-medium">Order ID</th>
                      <th className="px-5 py-3 font-medium">Customer</th>
                      <th className="px-5 py-3 font-medium">District</th>
                      <th className="px-5 py-3 font-medium">Total</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EDE2]">
                    {orders.slice(0, 6).map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#FCF9F3]">
                        <td className="px-5 py-3.5 font-mono text-xs font-medium text-[#1C1917]">
                          {ord.orderNumber}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-[#1C1917]">{ord.customerName}</p>
                          <p className="text-xs text-[#78716C] font-tabular">{ord.mobileNumber}</p>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#44403C]">
                          {ord.upazila}, {ord.district}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-[#1C1917] font-tabular">
                          {formatBDT(ord.totalAmount, 'en')}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-[#8C6823]">
                          {ord.status}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                          {ord.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleOrderStatusUpdate(ord.id, 'Confirmed')}
                              className="px-2.5 py-1 text-xs font-medium bg-[#1C1917] text-white rounded-md hover:bg-[#9A7024] cursor-pointer"
                            >
                              Confirm
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(ord);
                              setActiveTab('orders');
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-[#F5EFE6] text-[#1C1917] rounded-md hover:bg-[#EAE0D0] cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. ORDER MANAGEMENT TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif-display text-3xl font-semibold text-[#1C1917]">
                Order Management
              </h1>
              <p className="text-xs text-[#78716C] mt-0.5">
                Inspect customer delivery addresses, phone numbers, ordered jewellery, and update COD order statuses.
              </p>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by Order ID, customer name, phone, or district..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
                />
              </div>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-4 py-2.5 text-sm bg-white border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              >
                <option value="All">All Statuses ({orders.length})</option>
                {ALL_ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Orders List (Mobile-friendly Cards + Full Details) */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="p-10 bg-white border border-[#EAE2D3] rounded-2xl text-center text-sm text-[#78716C]">
                  No orders matched your current search or status filter.
                </div>
              ) : (
                filteredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white border border-[#EAE2D3] rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2ECE1]">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-semibold text-[#1C1917]">
                            {ord.orderNumber}
                          </span>
                          <span className="text-xs text-[#78716C]">·</span>
                          <span className="text-xs text-[#78716C]">
                            {new Date(ord.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#1C1917] mt-1">
                          {ord.customerName} ·{' '}
                          <a
                            href={`tel:${ord.mobileNumber}`}
                            className="inline-flex items-center gap-1 text-[#9A7024] hover:underline font-tabular"
                          >
                            <Phone className="w-3 h-3" />
                            {ord.mobileNumber}
                          </a>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={ord.status}
                          onChange={(e) =>
                            handleOrderStatusUpdate(ord.id, e.target.value as OrderStatus)
                          }
                          className="px-3 py-1.5 text-xs font-semibold bg-[#FCFBF8] border border-[#D8C9AE] rounded-lg text-[#1C1917] focus:outline-none focus:border-[#9A7024]"
                        >
                          {ALL_ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        {ord.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => handleOrderStatusUpdate(ord.id, 'Confirmed')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </button>
                        )}
                        {ord.status !== 'Cancelled' && ord.status !== 'Delivered' && (
                          <button
                            type="button"
                            onClick={() => handleOrderStatusUpdate(ord.id, 'Cancelled')}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs sm:text-sm">
                      <div className="md:col-span-5 space-y-1">
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-[#78716C]">
                          Full Delivery Address
                        </p>
                        <p className="font-medium text-[#1C1917]">
                          {ord.upazila}, {ord.district}
                        </p>
                        <p className="text-[#44403C]">{ord.fullAddress}</p>
                        {ord.orderNotes && (
                          <p className="text-xs text-[#8C6823] pt-1">Note: {ord.orderNotes}</p>
                        )}
                      </div>

                      <div className="md:col-span-5 space-y-2">
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-[#78716C]">
                          Ordered Products ({ord.items.length})
                        </p>
                        {ord.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2">
                            <span className="text-[#1C1917] truncate">
                              {item.quantity}× {item.name} ({item.variation})
                            </span>
                            <span className="font-tabular font-medium text-[#1C1917] shrink-0">
                              {formatBDT(item.lineTotal, 'en')}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="md:col-span-2 md:text-right flex md:flex-col justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#78716C]">
                            Grand Total (COD)
                          </p>
                          <p className="text-base font-semibold text-[#9A7024] font-tabular mt-0.5">
                            {formatBDT(ord.totalAmount, 'en')}
                          </p>
                          <p className="text-[11px] text-[#78716C] font-tabular">
                            Delivery: {formatBDT(ord.deliveryCharge, 'en')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. PRODUCT MANAGEMENT TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="font-serif-display text-3xl font-semibold text-[#1C1917]">
                  Product Catalogue Management
                </h1>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Add new jewellery products, upload images, edit BDT prices, discounts, variations, and stock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setProductModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#1C1917] text-[#FCFBF8] hover:bg-[#9A7024] rounded-xl cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Product</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product name or code..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
                />
              </div>
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="px-4 py-2.5 text-sm bg-white border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white border border-[#EAE2D3] rounded-2xl p-4 flex gap-4 items-center"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F6F1E7] shrink-0">
                    <LuxuryImage
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#8C6823] font-mono">
                      {prod.productCode} · {prod.category}
                    </p>
                    <h3 className="font-serif-display text-lg font-semibold text-[#1C1917] truncate">
                      {prod.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs mt-1 font-tabular">
                      <span className="font-semibold text-[#1C1917]">
                        {formatBDT(getEffectivePrice(prod), 'en')}
                      </span>
                      {prod.discountPrice && prod.discountPrice < prod.regularPrice && (
                        <span className="line-through text-[#A8A29E]">
                          {formatBDT(prod.regularPrice, 'en')}
                        </span>
                      )}
                      <span>·</span>
                      <span
                        className={
                          prod.stockQuantity > 0 ? 'text-emerald-800' : 'text-red-700'
                        }
                      >
                        Stock: {prod.stockQuantity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(prod);
                          setProductModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-[#F5EFE6] hover:bg-[#1C1917] hover:text-white text-[#1C1917] rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      {confirmDeleteProdId === prod.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="px-2.5 py-1 text-xs font-medium bg-red-700 text-white rounded-lg cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteProdId(null)}
                            className="px-2 py-1 text-xs text-[#57534E] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteProdId(prod.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. CATEGORIES MANAGEMENT TAB */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif-display text-3xl font-semibold text-[#1C1917]">
                Jewellery Categories
              </h1>
              <p className="text-xs text-[#78716C] mt-0.5">
                Create or update storefront jewellery departments in English and Bengali.
              </p>
            </div>

            <form
              onSubmit={handleSaveCategory}
              className="bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-4"
            >
              <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                {editingCatId ? 'Edit Category' : 'Add New Category'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Category Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g., Anklets & Payel"
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Category Name (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={catNameBn}
                    onChange={(e) => setCatNameBn(e.target.value)}
                    placeholder="যেমন: নূপুর ও পায়েল"
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Short description shown on category header..."
                  className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold bg-[#1C1917] text-[#FCFBF8] hover:bg-[#9A7024] rounded-xl cursor-pointer"
                >
                  {editingCatId ? 'Save Category Changes' : 'Add Category'}
                </button>
                {editingCatId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatId(null);
                      setCatName('');
                      setCatNameBn('');
                      setCatDesc('');
                      setCatImage('');
                    }}
                    className="px-4 py-2.5 text-xs font-medium bg-[#F5EFE6] text-[#1C1917] rounded-xl cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white border border-[#EAE2D3] rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-serif-display text-lg font-semibold text-[#1C1917]">
                      {cat.name} · {cat.nameBn}
                    </h3>
                    <p className="text-xs text-[#78716C] font-mono">
                      /category/{cat.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setCatName(cat.name);
                        setCatNameBn(cat.nameBn);
                        setCatDesc(cat.description);
                        setCatImage(cat.image);
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-[#F5EFE6] text-[#1C1917] rounded-lg cursor-pointer"
                    >
                      Edit
                    </button>
                    {confirmDeleteCatId === cat.id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-700 text-white rounded-lg cursor-pointer"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCatId(cat.id)}
                        className="px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. BANNERS & HOMEPAGE CONTENT TAB */}
        {activeTab === 'banners' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-serif-display text-3xl font-semibold text-[#1C1917]">
                  Banners & Homepage Content
                </h1>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Customize the hero campaign, promotional announcement bar, and special offer banner without editing code.
                </p>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold bg-[#1C1917] text-[#FCFBF8] hover:bg-[#9A7024] rounded-xl cursor-pointer"
              >
                Save Changes
              </button>
            </div>

            {/* Announcement Bar */}
            <div className="bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                  Top Announcement Bar
                </h2>
                <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.announcementEnabled}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        announcementEnabled: e.target.checked,
                      })
                    }
                    className="accent-[#9A7024]"
                  />
                  <span>Show Announcement</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Announcement (English)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.announcementText}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, announcementText: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Announcement (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.announcementTextBn}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        announcementTextBn: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Hero Banner */}
            <div className="bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-4">
              <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                Hero Banner Section
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Hero Title (English)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.heroTitle}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, heroTitle: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Hero Title (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.heroTitleBn}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, heroTitleBn: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Hero Subtitle (English)
                  </label>
                  <textarea
                    rows={3}
                    value={settingsForm.heroSubtitle}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Hero Subtitle (বাংলা)
                  </label>
                  <textarea
                    rows={3}
                    value={settingsForm.heroSubtitleBn}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, heroSubtitleBn: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="w-36 h-24 rounded-xl overflow-hidden border border-[#DFD5C3] bg-[#F6F1E7]">
                  <LuxuryImage
                    src={settingsForm.heroBannerImage}
                    alt="Hero preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#F5EFE6] hover:bg-[#1C1917] hover:text-white text-[#1C1917] rounded-xl cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Upload New Hero Photography</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUploadSettingAsset(f, 'heroBannerImage');
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Special Offer Banner */}
            <div className="bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-4">
              <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                Special Offer & Bridal Vault Banner
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Offer Kicker Text
                  </label>
                  <input
                    type="text"
                    value={settingsForm.specialOfferBadge}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        specialOfferBadge: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Offer Title (English)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.specialOfferTitle}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        specialOfferTitle: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Offer Title (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.specialOfferTitleBn}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        specialOfferTitleBn: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-36 h-24 rounded-xl overflow-hidden border border-[#DFD5C3] bg-[#F6F1E7]">
                  <LuxuryImage
                    src={settingsForm.specialOfferBannerImage}
                    alt="Special offer preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#F5EFE6] hover:bg-[#1C1917] hover:text-white text-[#1C1917] rounded-xl cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Upload Offer Banner Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUploadSettingAsset(f, 'specialOfferBannerImage');
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </form>
        )}

        {/* 6. WEBSITE SETTINGS, LOGO, DELIVERY, META PIXEL, GA4 & SEO */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-serif-display text-3xl font-semibold text-[#1C1917]">
                    Website Settings, Pixel, GA4 & SEO
                  </h1>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Configure official Maa Lakshmi Alankar logo, delivery charges, Meta Pixel, Google Analytics 4, and SEO.
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-semibold bg-[#1C1917] text-[#FCFBF8] hover:bg-[#9A7024] rounded-xl cursor-pointer"
                >
                  Save All Settings
                </button>
              </div>

              {/* Brand Identity & Official Logo Upload */}
              <div className="bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-4">
                <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                  Brand Identity & Official Logo
                </h2>
                <div className="flex flex-wrap items-center gap-4 pb-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#1C1917] text-[#FCFBF8] hover:bg-[#9A7024] rounded-xl cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Upload Official Maa Lakshmi Alankar Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUploadSettingAsset(f, 'logoUrl');
                      }}
                      className="hidden"
                    />
                  </label>
                  {settingsForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, logoUrl: '' })}
                      className="px-3 py-2 text-xs text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      Remove Custom Logo Image
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Website Name (English)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.websiteName}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, websiteName: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Website Name (বাংলা)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.websiteNameBn}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          websiteNameBn: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Charges */}
              <div className="bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-4">
                <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                  Bangladesh Delivery Charges (BDT ৳)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Inside Dhaka (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settingsForm.insideDhakaDelivery}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          insideDhakaDelivery: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm font-tabular border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Outside Dhaka / 63 Districts (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settingsForm.outsideDhakaDelivery}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          outsideDhakaDelivery: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm font-tabular border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Free Delivery Minimum Order (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settingsForm.freeDeliveryThreshold}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          freeDeliveryThreshold: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm font-tabular border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Contact & Social Links */}
              <div className="bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-4">
                <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                  Contact Details & Social Media
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Contact Mobile Number
                    </label>
                    <input
                      type="text"
                      value={settingsForm.contactPhone}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, contactPhone: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={settingsForm.contactEmail}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, contactEmail: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Showroom Address (English)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.showroomAddress}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          showroomAddress: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Facebook Page URL
                    </label>
                    <input
                      type="url"
                      value={settingsForm.facebookUrl}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, facebookUrl: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Instagram URL
                    </label>
                    <input
                      type="url"
                      value={settingsForm.instagramUrl}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, instagramUrl: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Meta Facebook Pixel & Google Analytics 4 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                      Meta Facebook Pixel
                    </h2>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsForm.metaPixelEnabled}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            metaPixelEnabled: e.target.checked,
                          })
                        }
                        className="accent-[#9A7024]"
                      />
                      <span>Enable Pixel</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Meta Pixel ID
                    </label>
                    <input
                      type="text"
                      value={settingsForm.metaPixelId}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, metaPixelId: e.target.value })
                      }
                      placeholder="e.g., 109482716503829"
                      className="w-full px-3.5 py-2 text-sm font-mono border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                  <p className="text-xs text-[#78716C]">
                    Automatically tracks PageView, ViewContent, Search, AddToCart, InitiateCheckout, and Purchase (BDT) + relays server-side Meta Conversions API events when META_CAPI_ACCESS_TOKEN is configured in server environment.
                  </p>
                </div>

                <div className="bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                      Google Analytics 4
                    </h2>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsForm.ga4Enabled}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            ga4Enabled: e.target.checked,
                          })
                        }
                        className="accent-[#9A7024]"
                      />
                      <span>Enable GA4</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      GA4 Measurement ID
                    </label>
                    <input
                      type="text"
                      value={settingsForm.ga4MeasurementId}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          ga4MeasurementId: e.target.value,
                        })
                      }
                      placeholder="G-XXXXXXXXXX"
                      className="w-full px-3.5 py-2 text-sm font-mono border border-[#DFD5C3] rounded-xl"
                    />
                  </div>
                  <p className="text-xs text-[#78716C]">
                    Tracks page_view, view_item, search, add_to_cart, begin_checkout, and purchase e-commerce revenue in BDT.
                  </p>
                </div>
              </div>

              {/* SEO Metadata */}
              <div className="bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-4">
                <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                  Search Engine Optimization (SEO)
                </h2>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Homepage Meta Title
                  </label>
                  <input
                    type="text"
                    value={settingsForm.seoMetaTitle}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, seoMetaTitle: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={settingsForm.seoMetaDescription}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        seoMetaDescription: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    SEO Keywords
                  </label>
                  <input
                    type="text"
                    value={settingsForm.seoKeywords}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, seoKeywords: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
              </div>
            </form>

            {/* Change Admin Password */}
            <form
              onSubmit={handleUpdatePassword}
              className="bg-white border border-[#EAE2D3] rounded-2xl p-6 space-y-4"
            >
              <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                Admin Password & Security
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    New Password (min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold bg-[#1C1917] text-[#FCFBF8] hover:bg-[#9A7024] rounded-xl cursor-pointer"
              >
                Update Admin Password
              </button>
              {passwordMessage && (
                <p className="text-xs font-medium text-[#8C6823]">{passwordMessage}</p>
              )}
            </form>
          </div>
        )}
      </main>

      {/* Add/Edit Product Modal */}
      {productModalOpen && (
        <AdminProductModal
          initialProduct={editingProduct}
          categories={categories}
          adminToken={token}
          onClose={() => {
            setProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSaved={async () => {
            await Promise.all([loadDashboard(token), refreshStorefront()]);
            showToast(
              editingProduct
                ? 'Product updated and published to storefront.'
                : 'New jewellery product published live on storefront.'
            );
          }}
        />
      )}
    </div>
  );
}
