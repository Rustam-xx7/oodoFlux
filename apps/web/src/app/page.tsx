'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';

type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';
type ActiveTab =
  | 'models'
  | 'admin-dashboard'
  | 'admin-products'
  | 'admin-plans'
  | 'admin-subscriptions'
  | 'admin-invoices'
  | 'admin-payments'
  | 'admin-taxes'
  | 'staff-quotes'
  | 'staff-customers'
  | 'customer-portal';

export default function SubscriptionManagementSystem() {
  // Authentication & Active Role State
  const [currentRole, setCurrentRole] = useState<UserRole>('CUSTOMER');
  const [activeTab, setActiveTab] = useState<ActiveTab>('models');
  const [authToken, setAuthToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals & Action States
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Form Inputs
  const [productForm, setProductForm] = useState({ name: '', sku: '', salesPrice: 4999, costPrice: 2000, description: '' });
  const [planForm, setPlanForm] = useState({ productId: '', name: '', code: '', billingFrequency: 'MONTHLY', price: 1999, minimumQuantity: 1, isPauseAllowed: true, isRenewalAllowed: true });
  const [paymentForm, setPaymentForm] = useState({ invoiceId: '', amount: 1000, paymentMethod: 'BANK_TRANSFER', referenceNote: '' });
  const [customerForm, setCustomerForm] = useState({ companyName: '', contactName: '', email: '', phone: '', billingAddressLine1: '', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001' });
  const [quoteForm, setQuoteForm] = useState({ customerId: '', productId: '', planId: '', quantity: 1, validDays: 15 });

  // Format currency in INR
  const formatINR = (minorUnits: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format((minorUnits || 0) / 100);
  };

  // Helper notification banner
  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // Login handler
  const loginAs = async (email: string, role: UserRole) => {
    setLoading(true);
    const res = await fetchApi<{ accessToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, pass: 'Password@123' }),
    });

    if (res.success && res.data) {
      setAuthToken(res.data.accessToken);
      setCurrentUser(res.data.user);
      setCurrentRole(role);
      notify(`Logged in as ${role} (${res.data.user.email})`);
      if (role === 'ADMIN') setActiveTab('admin-dashboard');
      else if (role === 'STAFF') setActiveTab('staff-quotes');
      else setActiveTab('models');
    } else {
      notify(res.error || 'Failed to authenticate', 'error');
    }
    setLoading(false);
  };

  // Refresh all core data
  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, planRes, subRes, invRes, payRes, custRes, quoteRes, taxRes, discRes, repRes] =
        await Promise.all([
          fetchApi('/products'),
          fetchApi('/plans'),
          fetchApi('/subscriptions', {}, authToken),
          fetchApi('/invoices', {}, authToken),
          fetchApi('/payments', {}, authToken),
          fetchApi('/customers', {}, authToken),
          fetchApi('/quotations', {}, authToken),
          fetchApi('/taxes'),
          fetchApi('/discounts'),
          fetchApi('/reports/overview', {}, authToken),
        ]);

      if (prodRes.data) setProducts(prodRes.data);
      if (planRes.data) setPlans(planRes.data);
      if (subRes.data) setSubscriptions(subRes.data);
      if (invRes.data) setInvoices(invRes.data);
      if (payRes.data) setPayments(payRes.data);
      if (custRes.data) setCustomers(custRes.data);
      if (quoteRes.data) setQuotations(quoteRes.data);
      if (taxRes.data) setTaxes(taxRes.data);
      if (discRes.data) setDiscounts(discRes.data);
      if (repRes.data) setOverview(repRes.data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Default sign in as Admin to hydrate initial data, or fallback
    loginAs('admin@oodoflux.com', 'ADMIN');
  }, []);

  useEffect(() => {
    loadData();
  }, [authToken]);

  // Handle Client Subscription
  const handleClientSubscribe = async (planId: string) => {
    if (!customers || customers.length === 0) {
      notify('No customer profile found. Please register or select customer.', 'error');
      return;
    }
    const targetCustomer = customers[0].id;
    setLoading(true);
    const res = await fetchApi(
      '/subscriptions',
      {
        method: 'POST',
        body: JSON.stringify({ customerId: targetCustomer, planId }),
      },
      authToken,
    );
    if (res.success) {
      notify('Subscription activated successfully!');
      loadData();
      setActiveTab('customer-portal');
    } else {
      notify(res.error || 'Failed to subscribe', 'error');
    }
    setLoading(false);
  };

  // Subscription Lifecycle Handlers (Pause, Resume, Renew, Close)
  const handleSubAction = async (id: string, action: 'pause' | 'resume' | 'renew' | 'close') => {
    setLoading(true);
    const res = await fetchApi(`/subscriptions/${id}/${action}`, { method: 'POST' }, authToken);
    if (res.success) {
      notify(`Subscription ${action}d successfully!`);
      loadData();
    } else {
      notify(res.error || `Failed to ${action} subscription`, 'error');
    }
    setLoading(false);
  };

  // Trigger Recurring Billing
  const handleTriggerBilling = async () => {
    setLoading(true);
    const res = await fetchApi('/invoices/generate-due', { method: 'POST' }, authToken);
    if (res.success) {
      notify(res.message || 'Billing cycle executed!');
      loadData();
    } else {
      notify(res.error || 'Failed to trigger billing', 'error');
    }
    setLoading(false);
  };

  // Record Manual Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetchApi(
      '/payments',
      {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: paymentForm.invoiceId,
          amount: Math.round(paymentForm.amount * 100), // convert rupees to paise
          paymentMethod: paymentForm.paymentMethod,
          referenceNote: paymentForm.referenceNote,
        }),
      },
      authToken,
    );

    if (res.success) {
      notify('Payment recorded and invoice balance updated!');
      setShowPaymentModal(false);
      loadData();
    } else {
      notify(res.error || 'Failed to record payment', 'error');
    }
    setLoading(false);
  };

  // Create Product (Admin)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetchApi(
      '/products',
      {
        method: 'POST',
        body: JSON.stringify({
          ...productForm,
          salesPrice: Math.round(productForm.salesPrice * 100),
          costPrice: Math.round(productForm.costPrice * 100),
        }),
      },
      authToken,
    );

    if (res.success) {
      notify('Product catalog item created!');
      setShowProductModal(false);
      loadData();
    } else {
      notify(res.error || 'Failed to create product', 'error');
    }
    setLoading(false);
  };

  // Create Plan (Admin)
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetchApi(
      '/plans',
      {
        method: 'POST',
        body: JSON.stringify({
          ...planForm,
          price: Math.round(planForm.price * 100),
        }),
      },
      authToken,
    );

    if (res.success) {
      notify('Subscription plan tier created!');
      setShowPlanModal(false);
      loadData();
    } else {
      notify(res.error || 'Failed to create plan', 'error');
    }
    setLoading(false);
  };

  // Create Customer (Staff / Admin)
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetchApi(
      '/customers',
      {
        method: 'POST',
        body: JSON.stringify(customerForm),
      },
      authToken,
    );

    if (res.success) {
      notify('Customer onboarded successfully!');
      setShowCustomerModal(false);
      loadData();
    } else {
      notify(res.error || 'Failed to create customer', 'error');
    }
    setLoading(false);
  };

  // Convert Quotation
  const handleConvertQuote = async (id: string) => {
    setLoading(true);
    const res = await fetchApi(`/quotations/${id}/convert`, { method: 'POST' }, authToken);
    if (res.success) {
      notify('Quotation converted into active subscription!');
      loadData();
    } else {
      notify(res.error || 'Conversion failed', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30">
      {/* Top Application Header */}
      <header className="glass-panel sticky top-0 z-50 px-6 py-3.5 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="font-extrabold text-white text-lg tracking-wider">SMS</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white text-base leading-tight">
                  Subscription Management System
                </h1>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v1.0 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">Recurring Billing &bull; Product Catalog &bull; Analytics</p>
            </div>
          </div>

          {/* Quick Role Switcher */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/10 text-xs">
            <span className="text-slate-400 font-medium px-2 hidden sm:inline">Role:</span>
            <button
              onClick={() => loginAs('admin@oodoflux.com', 'ADMIN')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                currentRole === 'ADMIN'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👑 Admin (Full Access)
            </button>
            <button
              onClick={() => loginAs('staff@oodoflux.com', 'STAFF')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                currentRole === 'STAFF'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💼 Staff (Ops)
            </button>
            <button
              onClick={() => loginAs('customer@acme.com', 'CUSTOMER')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                currentRole === 'CUSTOMER'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👤 Client Portal
            </button>
          </div>
        </div>
      </header>

      {/* Global Toast Notification */}
      {message && (
        <div
          className={`max-w-7xl mx-auto px-6 mt-4 w-full transition-all animate-bounce`}
        >
          <div
            className={`p-3.5 rounded-xl text-sm font-medium border flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs opacity-75 hover:opacity-100 cursor-pointer">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Secondary Navigation Sub-Bar */}
      <nav className="glass-panel px-6 py-2 border-b border-white/5 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs">
          {/* Client Tab */}
          <button
            onClick={() => setActiveTab('models')}
            className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'models'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ✨ Subscription Models (Client Catalog)
          </button>

          {/* Customer Portal Tab */}
          <button
            onClick={() => setActiveTab('customer-portal')}
            className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'customer-portal'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👤 My Subscriptions & Invoices
          </button>

          {/* Admin Tabs */}
          {(currentRole === 'ADMIN' || currentRole === 'STAFF') && (
            <>
              <div className="h-4 w-px bg-white/10 mx-1" />
              <button
                onClick={() => setActiveTab('admin-dashboard')}
                className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-dashboard'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📊 Analytics Overview
              </button>
              <button
                onClick={() => setActiveTab('admin-subscriptions')}
                className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-subscriptions'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔄 All Subscriptions ({subscriptions.length})
              </button>
              <button
                onClick={() => setActiveTab('admin-invoices')}
                className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-invoices'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🧾 Invoices & Billing ({invoices.length})
              </button>
              <button
                onClick={() => setActiveTab('admin-payments')}
                className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-payments'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                💳 Payments Ledger
              </button>
              <button
                onClick={() => setActiveTab('staff-customers')}
                className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'staff-customers'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                👥 Customers ({customers.length})
              </button>
              <button
                onClick={() => setActiveTab('staff-quotes')}
                className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'staff-quotes'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📑 Quotations ({quotations.length})
              </button>
              <button
                onClick={() => setActiveTab('admin-products')}
                className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-products'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚙️ Products & Variants
              </button>
              <button
                onClick={() => setActiveTab('admin-plans')}
                className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-plans'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📐 Plans Configuration
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Main Dynamic Workspace Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 space-y-8">
        {/* ========================================================================= */}
        {/* VIEW 1: SUBSCRIPTION MODELS & PRICING TIERS (CLIENT VIEW)                  */}
        {/* ========================================================================= */}
        {activeTab === 'models' && (
          <section className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <Badge variant="info">Enterprise Subscription Tiers</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-300">
                Choose the Ideal Subscription Model
              </h2>
              <p className="text-slate-400 text-sm">
                Transparent recurring plans with zero hidden fees. Built for scalable enterprise growth.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`flex flex-col justify-between border ${
                    plan.billingFrequency === 'YEARLY'
                      ? 'border-indigo-500/40 bg-gradient-to-b from-indigo-950/20 to-slate-900/60'
                      : 'border-white/10'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-indigo-400 font-semibold">
                        {plan.code}
                      </span>
                      {plan.billingFrequency === 'YEARLY' && (
                        <Badge variant="warning">Best Value Annual</Badge>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-white">
                        {formatINR(plan.price)}
                      </span>
                      <span className="text-xs text-slate-400 lowercase">
                        / {plan.billingFrequency}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      Product: <strong className="text-slate-200">{plan.product?.name}</strong>
                    </p>

                    <div className="border-t border-white/5 pt-4 space-y-2.5 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span>Billing Cadence: {plan.billingFrequency} recurring</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span>Pause permitted: {plan.isPauseAllowed ? 'Yes (Flexible)' : 'No'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span>Renewal guaranteed: {plan.isRenewalAllowed ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span>Min Commitment: {plan.minimumQuantity} license</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleClientSubscribe(plan.id)}
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs tracking-wide uppercase transition-all shadow-lg shadow-indigo-500/25 cursor-pointer disabled:opacity-50"
                    >
                      Subscribe To This Plan
                    </button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Catalog Products & Variants Overview */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
              <h3 className="text-lg font-bold text-white">Configurable Product Add-ons & Variants</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {products.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm">{p.name}</span>
                      <span className="text-xs text-emerald-400 font-mono">{formatINR(p.salesPrice)}</span>
                    </div>
                    <p className="text-xs text-slate-400">{p.description || 'Enterprise catalog module'}</p>
                    {p.variants && p.variants.length > 0 && (
                      <div className="pt-2 text-[11px] text-slate-400 border-t border-white/5 space-y-1">
                        <span className="text-indigo-400 font-medium">Available Add-ons:</span>
                        {p.variants.map((v: any) => (
                          <div key={v.id} className="flex justify-between">
                            <span>+ {v.name}</span>
                            <span className="text-slate-300">+{formatINR(v.additionalPrice)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: ADMIN KPI DASHBOARD & REVENUE ANALYTICS                            */}
        {/* ========================================================================= */}
        {activeTab === 'admin-dashboard' && (
          <section className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Financial & Recurring Analytics</h2>
                <p className="text-xs text-slate-400">Live transaction metrics, collected revenue, and outstanding balance summary</p>
              </div>
              <button
                onClick={handleTriggerBilling}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                ⚡ Trigger Recurring Billing Engine
              </button>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <span className="text-xs text-slate-400 font-medium">Active Subscriptions</span>
                <p className="text-3xl font-extrabold text-white mt-2">
                  {overview?.kpis?.activeSubscriptions ?? subscriptions.filter(s => s.status === 'ACTIVE').length}
                </p>
                <span className="text-[11px] text-emerald-400 mt-1 inline-block">● Auto-renewing recurring contracts</span>
              </Card>

              <Card>
                <span className="text-xs text-slate-400 font-medium">Total Revenue Collected</span>
                <p className="text-3xl font-extrabold text-emerald-400 mt-2">
                  {formatINR(overview?.kpis?.totalRevenueCollected ?? 0)}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 inline-block">Realized cash flow</span>
              </Card>

              <Card>
                <span className="text-xs text-slate-400 font-medium">Total Outstanding Balance</span>
                <p className="text-3xl font-extrabold text-amber-400 mt-2">
                  {formatINR(overview?.kpis?.totalOutstanding ?? 0)}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 inline-block">Pending invoice settlements</span>
              </Card>

              <Card>
                <span className="text-xs text-slate-400 font-medium">Overdue Invoices</span>
                <p className="text-3xl font-extrabold text-rose-400 mt-2">
                  {overview?.kpis?.overdueCount ?? 0}
                </p>
                <span className="text-[11px] text-rose-400/80 mt-1 inline-block">
                  Amount: {formatINR(overview?.kpis?.overdueAmount ?? 0)}
                </span>
              </Card>
            </div>

            {/* Active Subscriptions Quick Table */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
              <h3 className="text-base font-bold text-white">Recent Active Subscriptions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-slate-400 font-medium uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5">Subscription #</th>
                      <th className="py-2.5">Customer</th>
                      <th className="py-2.5">Plan</th>
                      <th className="py-2.5">Total Amount</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5">Next Billing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {subscriptions.slice(0, 5).map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 font-mono font-medium text-indigo-300">{s.subscriptionNumber}</td>
                        <td className="py-3 text-white">{s.customer?.companyName || s.customer?.contactName}</td>
                        <td className="py-3 text-slate-300">{s.plan?.name}</td>
                        <td className="py-3 font-mono text-slate-200">{formatINR(s.totalAmount)}</td>
                        <td className="py-3">
                          <Badge variant={s.status === 'ACTIVE' ? 'success' : s.status === 'PAUSED' ? 'warning' : 'neutral'}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-slate-400">{s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: ADMIN SUBSCRIPTIONS MANAGER                                        */}
        {/* ========================================================================= */}
        {activeTab === 'admin-subscriptions' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Subscription Lifecycle Manager</h2>
                <p className="text-xs text-slate-400">Admin controls: pause, resume, renew, and terminate subscriptions</p>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-slate-400 font-medium uppercase text-[10px]">
                  <tr>
                    <th className="py-3">Subscription</th>
                    <th className="py-3">Customer</th>
                    <th className="py-3">Plan & Frequency</th>
                    <th className="py-3">Amount</th>
                    <th className="py-3">Status</th>
                    <th className="py-3 text-right">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono text-indigo-300 font-medium">{s.subscriptionNumber}</td>
                      <td className="py-3 text-white font-medium">{s.customer?.companyName || s.customer?.contactName}</td>
                      <td className="py-3 text-slate-300">{s.plan?.name} ({s.plan?.billingFrequency})</td>
                      <td className="py-3 font-mono">{formatINR(s.totalAmount)}</td>
                      <td className="py-3">
                        <Badge variant={s.status === 'ACTIVE' ? 'success' : s.status === 'PAUSED' ? 'warning' : 'neutral'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right space-x-1.5">
                        {s.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleSubAction(s.id, 'pause')}
                            className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-medium cursor-pointer"
                          >
                            Pause
                          </button>
                        )}
                        {s.status === 'PAUSED' && (
                          <button
                            onClick={() => handleSubAction(s.id, 'resume')}
                            className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-medium cursor-pointer"
                          >
                            Resume
                          </button>
                        )}
                        {s.status !== 'CLOSED' && (
                          <>
                            <button
                              onClick={() => handleSubAction(s.id, 'renew')}
                              className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-medium cursor-pointer"
                            >
                              Renew +1Y
                            </button>
                            <button
                              onClick={() => handleSubAction(s.id, 'close')}
                              className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-medium cursor-pointer"
                            >
                              Close
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: INVOICES & BILLING ENGINE                                          */}
        {/* ========================================================================= */}
        {activeTab === 'admin-invoices' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Invoice Center & Settlements</h2>
                <p className="text-xs text-slate-400">Snapshot invoices, balance tracking, and manual payment allocations</p>
              </div>
              <button
                onClick={handleTriggerBilling}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/25"
              >
                ⚡ Run Recurring Billing Engine
              </button>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-slate-400 font-medium uppercase text-[10px]">
                  <tr>
                    <th className="py-3">Invoice #</th>
                    <th className="py-3">Customer</th>
                    <th className="py-3">Total Amount</th>
                    <th className="py-3">Paid Amount</th>
                    <th className="py-3">Balance Due</th>
                    <th className="py-3">Payment Status</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono font-medium text-indigo-300">{inv.invoiceNumber}</td>
                      <td className="py-3 text-white font-medium">{inv.customer?.companyName || inv.customer?.contactName}</td>
                      <td className="py-3 font-mono">{formatINR(inv.totalAmount)}</td>
                      <td className="py-3 font-mono text-emerald-400">{formatINR(inv.paidAmount)}</td>
                      <td className="py-3 font-mono text-amber-400 font-semibold">{formatINR(inv.outstandingBalance)}</td>
                      <td className="py-3">
                        <Badge
                          variant={
                            inv.paymentStatus === 'PAID'
                              ? 'success'
                              : inv.paymentStatus === 'PARTIALLY_PAID'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {inv.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {inv.outstandingBalance > 0 && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentForm({
                                invoiceId: inv.id,
                                amount: inv.outstandingBalance / 100,
                                paymentMethod: 'BANK_TRANSFER',
                                referenceNote: `Settlement for ${inv.invoiceNumber}`,
                              });
                              setShowPaymentModal(true);
                            }}
                            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer text-xs"
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: PAYMENTS LEDGER                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'admin-payments' && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Payment Ledger & Transactions</h2>
            <div className="glass-panel rounded-2xl p-6 border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-slate-400 font-medium uppercase text-[10px]">
                  <tr>
                    <th className="py-3">Payment #</th>
                    <th className="py-3">Invoice Ref</th>
                    <th className="py-3">Amount</th>
                    <th className="py-3">Method</th>
                    <th className="py-3">Reference / UTR</th>
                    <th className="py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono font-medium text-emerald-400">{p.paymentNumber}</td>
                      <td className="py-3 font-mono text-indigo-300">{p.invoice?.invoiceNumber}</td>
                      <td className="py-3 font-mono font-bold text-white">{formatINR(p.amount)}</td>
                      <td className="py-3 uppercase text-[11px] text-slate-300">{p.paymentMethod}</td>
                      <td className="py-3 text-slate-400">{p.referenceNote || 'N/A'}</td>
                      <td className="py-3 text-slate-400">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 6: PRODUCTS & VARIANTS CONFIGURATION (ADMIN CAN UPDATE EVERYTHING)    */}
        {/* ========================================================================= */}
        {activeTab === 'admin-products' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Product Catalog & Variant Add-ons</h2>
                <p className="text-xs text-slate-400">Configure base products, pricing, and variant modifiers</p>
              </div>
              <button
                onClick={() => setShowProductModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                + Add New Product
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {products.map((p) => (
                <Card key={p.id} className="border border-white/10 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase text-indigo-400 font-semibold">{p.sku}</span>
                      <h3 className="text-lg font-bold text-white mt-1">{p.name}</h3>
                    </div>
                    <Badge variant="success">{p.productType}</Badge>
                  </div>

                  <p className="text-xs text-slate-400">{p.description}</p>

                  <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-white/5 font-mono text-xs">
                    <div>
                      <span className="text-slate-400">Sales Price:</span>{' '}
                      <strong className="text-emerald-400">{formatINR(p.salesPrice)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Cost:</span>{' '}
                      <span className="text-slate-300">{formatINR(p.costPrice)}</span>
                    </div>
                  </div>

                  {p.variants && p.variants.length > 0 && (
                    <div className="pt-2 text-xs space-y-1.5 border-t border-white/5">
                      <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                        Variant Modifiers:
                      </span>
                      {p.variants.map((v: any) => (
                        <div key={v.id} className="flex justify-between text-slate-400 text-xs py-1">
                          <span>{v.name}</span>
                          <span className="font-mono text-indigo-300">+{formatINR(v.additionalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 7: PLANS MANAGER (ADMIN CAN CONFIGURE PRICING & CADENCE)              */}
        {/* ========================================================================= */}
        {activeTab === 'admin-plans' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Subscription Plans Configuration</h2>
                <p className="text-xs text-slate-400">Configure recurring cadences, pricing tiers, and renewal rules</p>
              </div>
              <button
                onClick={() => {
                  if (products.length > 0) setPlanForm({ ...planForm, productId: products[0].id });
                  setShowPlanModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                + Create New Plan
              </button>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-slate-400 font-medium uppercase text-[10px]">
                  <tr>
                    <th className="py-3">Code</th>
                    <th className="py-3">Plan Name</th>
                    <th className="py-3">Frequency</th>
                    <th className="py-3">Recurring Price</th>
                    <th className="py-3">Pause Allowed</th>
                    <th className="py-3">Renewal Allowed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {plans.map((pl) => (
                    <tr key={pl.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono font-medium text-indigo-300">{pl.code}</td>
                      <td className="py-3 font-medium text-white">{pl.name}</td>
                      <td className="py-3 uppercase text-[11px] text-slate-300">{pl.billingFrequency}</td>
                      <td className="py-3 font-mono font-bold text-emerald-400">{formatINR(pl.price)}</td>
                      <td className="py-3">{pl.isPauseAllowed ? '✅ Yes' : '❌ No'}</td>
                      <td className="py-3">{pl.isRenewalAllowed ? '✅ Yes' : '❌ No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 8: CUSTOMERS MANAGEMENT (STAFF / ADMIN)                               */}
        {/* ========================================================================= */}
        {activeTab === 'staff-customers' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Customer Account Directory</h2>
                <p className="text-xs text-slate-400">Onboard customer accounts and manage billing profiles</p>
              </div>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                + Onboard New Customer
              </button>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-slate-400 font-medium uppercase text-[10px]">
                  <tr>
                    <th className="py-3">Customer ID</th>
                    <th className="py-3">Company Name</th>
                    <th className="py-3">Contact</th>
                    <th className="py-3">Email</th>
                    <th className="py-3">City / Country</th>
                    <th className="py-3">Subscriptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono text-indigo-300 font-medium">{c.customerNumber}</td>
                      <td className="py-3 font-semibold text-white">{c.companyName || 'Individual'}</td>
                      <td className="py-3 text-slate-300">{c.contactName}</td>
                      <td className="py-3 text-slate-400">{c.email}</td>
                      <td className="py-3 text-slate-400">{c.city}, {c.country}</td>
                      <td className="py-3">
                        <Badge variant="info">{c.subscriptions?.length || 0} active</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 9: QUOTATION MANAGEMENT (STAFF / ADMIN)                               */}
        {/* ========================================================================= */}
        {activeTab === 'staff-quotes' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Commercial Quotations</h2>
                <p className="text-xs text-slate-400">Prepare quotes from templates and convert to active subscriptions</p>
              </div>
              <button
                onClick={() => {
                  if (customers.length > 0 && products.length > 0) {
                    setQuoteForm({
                      ...quoteForm,
                      customerId: customers[0].id,
                      productId: products[0].id,
                      planId: plans[0]?.id || '',
                    });
                  }
                  setShowQuoteModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                + Prepare Quotation
              </button>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-slate-400 font-medium uppercase text-[10px]">
                  <tr>
                    <th className="py-3">Quote #</th>
                    <th className="py-3">Customer</th>
                    <th className="py-3">Valid Until</th>
                    <th className="py-3">Total Amount</th>
                    <th className="py-3">Status</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono font-medium text-indigo-300">{q.quotationNumber}</td>
                      <td className="py-3 font-medium text-white">{q.customer?.companyName || q.customer?.contactName}</td>
                      <td className="py-3 text-slate-400">{new Date(q.validUntil).toLocaleDateString()}</td>
                      <td className="py-3 font-mono font-bold text-emerald-400">{formatINR(q.totalAmount)}</td>
                      <td className="py-3">
                        <Badge variant={q.status === 'CONVERTED' ? 'success' : 'warning'}>{q.status}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        {q.status !== 'CONVERTED' && (
                          <button
                            onClick={() => handleConvertQuote(q.id)}
                            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer text-xs"
                          >
                            Convert to Subscription
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 10: CUSTOMER SELF-SERVICE PORTAL (CLIENT VIEW)                        */}
        {/* ========================================================================= */}
        {activeTab === 'customer-portal' && (
          <section className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Client Self-Service Portal</h2>
                <p className="text-xs text-slate-400">
                  Welcome, <strong className="text-indigo-300">{currentUser?.email || 'Valued Customer'}</strong>. View your active subscriptions and invoices.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('models')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs cursor-pointer"
              >
                + Browse New Subscription Plans
              </button>
            </div>

            {/* My Subscriptions List */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">My Active Subscriptions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subscriptions.map((sub) => (
                  <Card key={sub.id} className="border border-white/10 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-indigo-400 text-xs font-semibold">{sub.subscriptionNumber}</span>
                        <h4 className="text-lg font-bold text-white mt-1">{sub.plan?.name}</h4>
                      </div>
                      <Badge variant={sub.status === 'ACTIVE' ? 'success' : sub.status === 'PAUSED' ? 'warning' : 'neutral'}>
                        {sub.status}
                      </Badge>
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Recurring:</span>
                        <span className="text-emerald-400 font-bold">{formatINR(sub.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Next Scheduled Invoice:</span>
                        <span className="text-slate-200">
                          {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Contract End Date:</span>
                        <span className="text-slate-200">{new Date(sub.expiryDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      {sub.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleSubAction(sub.id, 'pause')}
                          className="flex-1 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-medium text-xs cursor-pointer"
                        >
                          Pause Plan
                        </button>
                      )}
                      {sub.status === 'PAUSED' && (
                        <button
                          onClick={() => handleSubAction(sub.id, 'resume')}
                          className="flex-1 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-medium text-xs cursor-pointer"
                        >
                          Resume Plan
                        </button>
                      )}
                      <button
                        onClick={() => handleSubAction(sub.id, 'close')}
                        className="py-2 px-3 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-medium text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* My Invoices Table */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
              <h3 className="text-base font-bold text-white">My Invoices & Payment Receipts</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-slate-400 font-medium uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5">Invoice #</th>
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Total Amount</th>
                      <th className="py-2.5">Paid</th>
                      <th className="py-2.5">Outstanding Balance</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 font-mono font-medium text-indigo-300">{inv.invoiceNumber}</td>
                        <td className="py-3 text-slate-400">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                        <td className="py-3 font-mono">{formatINR(inv.totalAmount)}</td>
                        <td className="py-3 font-mono text-emerald-400">{formatINR(inv.paidAmount)}</td>
                        <td className="py-3 font-mono font-bold text-amber-400">{formatINR(inv.outstandingBalance)}</td>
                        <td className="py-3">
                          <Badge variant={inv.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                            {inv.paymentStatus}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-indigo-400 hover:underline cursor-pointer">
                            Download Receipt ↗
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: RECORD MANUAL PAYMENT                                               */}
      {/* ========================================================================= */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Record Payment for {selectedInvoice.invoiceNumber}</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Outstanding Balance</label>
                <input
                  type="text"
                  disabled
                  value={formatINR(selectedInvoice.outstandingBalance)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-amber-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Payment Amount (INR ₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-white"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
                  <option value="CREDIT_CARD_MANUAL">Credit Card Manual Entry</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online Gateway</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-98237498"
                  value={paymentForm.referenceNote}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNote: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer shadow-lg shadow-indigo-500/25"
                >
                  Confirm & Settle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE PRODUCT (ADMIN CAN UPDATE EVERYTHING)                        */}
      {/* ========================================================================= */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Add Product to Catalog</h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud ERP Suite"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">SKU Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ERP-CLOUD-01"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Sales Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.salesPrice}
                    onChange={(e) => setProductForm({ ...productForm, salesPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE PLAN (ADMIN CAN UPDATE EVERYTHING)                           */}
      {/* ========================================================================= */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Create Subscription Plan Tier</h3>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Associate with Product</label>
                <select
                  value={planForm.productId}
                  onChange={(e) => setPlanForm({ ...planForm, productId: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growth Monthly Tier"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Plan Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PLAN-GROWTH-MO"
                  value={planForm.code}
                  onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Billing Frequency</label>
                  <select
                    value={planForm.billingFrequency}
                    onChange={(e) => setPlanForm({ ...planForm, billingFrequency: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Recurring Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={planForm.isPauseAllowed}
                    onChange={(e) => setPlanForm({ ...planForm, isPauseAllowed: e.target.checked })}
                  />
                  <span>Pause Allowed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={planForm.isRenewalAllowed}
                    onChange={(e) => setPlanForm({ ...planForm, isRenewalAllowed: e.target.checked })}
                  />
                  <span>Renewal Allowed</span>
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ONBOARD NEW CUSTOMER                                                */}
      {/* ========================================================================= */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Onboard New Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stark Industries"
                  value={customerForm.companyName}
                  onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tony Stark"
                  value={customerForm.contactName}
                  onChange={(e) => setCustomerForm({ ...customerForm, contactName: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="tony@stark.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Billing Address</label>
                <input
                  type="text"
                  required
                  placeholder="Stark Tower, 5th Avenue"
                  value={customerForm.billingAddressLine1}
                  onChange={(e) => setCustomerForm({ ...customerForm, billingAddressLine1: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREPARE QUOTATION                                                  */}
      {/* ========================================================================= */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Prepare Commercial Quotation</h3>
              <button onClick={() => setShowQuoteModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                const res = await fetchApi(
                  '/quotations',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      customerId: quoteForm.customerId,
                      validDays: quoteForm.validDays,
                      items: [
                        {
                          productId: quoteForm.productId,
                          planId: quoteForm.planId || undefined,
                          quantity: quoteForm.quantity,
                          taxRateBasisPoints: 1800,
                        },
                      ],
                    }),
                  },
                  authToken,
                );
                if (res.success) {
                  notify('Quotation prepared successfully!');
                  setShowQuoteModal(false);
                  loadData();
                } else {
                  notify(res.error || 'Failed to prepare quote', 'error');
                }
                setLoading(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="text-slate-400 block mb-1">Select Customer</label>
                <select
                  value={quoteForm.customerId}
                  onChange={(e) => setQuoteForm({ ...quoteForm, customerId: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || c.contactName} ({c.customerNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Select Product Offering</label>
                <select
                  value={quoteForm.productId}
                  onChange={(e) => setQuoteForm({ ...quoteForm, productId: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {formatINR(p.salesPrice)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Select Recurring Plan (Optional)</label>
                <select
                  value={quoteForm.planId}
                  onChange={(e) => setQuoteForm({ ...quoteForm, planId: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                >
                  <option value="">-- No recurring plan (One-time) --</option>
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} ({formatINR(pl.price)} / {pl.billingFrequency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quoteForm.quantity}
                    onChange={(e) => setQuoteForm({ ...quoteForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quoteForm.validDays}
                    onChange={(e) => setQuoteForm({ ...quoteForm, validDays: parseInt(e.target.value) || 15 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                >
                  Generate Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="glass-panel px-6 py-4 border-t border-white/10 text-center text-xs text-slate-500">
        <p>
          Subscription Management System &bull; Active Role:{' '}
          <span className="text-indigo-400 font-bold uppercase">{currentRole}</span> &bull; All 8 Phases Implemented &bull; 2026
        </p>
      </footer>
    </div>
  );
}
