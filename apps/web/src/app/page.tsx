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
    <div className="min-h-screen bg-[#FFFFFF] text-[#334155] flex flex-col justify-between selection:bg-[#EEF2FF] selection:text-[#4F46E5]">
      {/* Top Application Header */}
      <header className="bg-[#FFFFFF] border-b border-[#E2E8F0] sticky top-0 z-50 px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center shadow-sm">
              <span className="font-extrabold text-white text-base tracking-wider">SMS</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-[#0F172A] text-base leading-tight">
                  Subscription Management System
                </h1>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono rounded bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-medium">
                  v1.0 Enterprise
                </span>
              </div>
              <p className="text-xs text-[#64748B]">Recurring Billing &bull; Product Catalog &bull; Financial Analytics</p>
            </div>
          </div>

          {/* Quick Role Switcher */}
          <div className="flex items-center gap-1.5 bg-[#F8FAFC] p-1.5 rounded-xl border border-[#E2E8F0] text-xs">
            <span className="text-[#64748B] font-medium px-2 hidden sm:inline">Role:</span>
            <button
              onClick={() => loginAs('admin@oodoflux.com', 'ADMIN')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentRole === 'ADMIN'
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
            >
              👑 Admin (Full Access)
            </button>
            <button
              onClick={() => loginAs('staff@oodoflux.com', 'STAFF')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentRole === 'STAFF'
                  ? 'bg-[#4338CA] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
            >
              💼 Staff (Ops)
            </button>
            <button
              onClick={() => loginAs('customer@acme.com', 'CUSTOMER')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentRole === 'CUSTOMER'
                  ? 'bg-[#059669] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
            >
              👤 Client Portal
            </button>
          </div>
        </div>
      </header>

      {/* Global Toast Notification */}
      {message && (
        <div className="max-w-7xl mx-auto px-6 mt-4 w-full transition-all">
          <div
            className={`p-3.5 rounded-xl text-sm font-medium border shadow-xs flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'
                : 'bg-[#FEE2E2] border-[#FECACA] text-[#DC2626]'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs font-bold opacity-75 hover:opacity-100 cursor-pointer">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Secondary Navigation Sub-Bar */}
      <nav className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-2 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs">
          {/* Client Tab */}
          <button
            onClick={() => setActiveTab('models')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'models'
                ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-semibold shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            ✨ Subscription Models (Client Catalog)
          </button>

          {/* Customer Portal Tab */}
          <button
            onClick={() => setActiveTab('customer-portal')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'customer-portal'
                ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-semibold shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            👤 My Subscriptions & Invoices
          </button>

          {/* Admin Tabs */}
          {(currentRole === 'ADMIN' || currentRole === 'STAFF') && (
            <>
              <div className="h-4 w-px bg-[#E2E8F0] mx-1" />
              <button
                onClick={() => setActiveTab('admin-dashboard')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-dashboard'
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-semibold shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                📊 Analytics Overview
              </button>
              <button
                onClick={() => setActiveTab('admin-subscriptions')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-subscriptions'
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-semibold shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                🔄 All Subscriptions ({subscriptions.length})
              </button>
              <button
                onClick={() => setActiveTab('admin-invoices')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-invoices'
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-semibold shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                🧾 Invoices & Billing ({invoices.length})
              </button>
              <button
                onClick={() => setActiveTab('admin-payments')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-payments'
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-semibold shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                💳 Payments Ledger
              </button>
              <button
                onClick={() => setActiveTab('staff-customers')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'staff-customers'
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-semibold shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                👥 Customers ({customers.length})
              </button>
              <button
                onClick={() => setActiveTab('staff-quotes')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'staff-quotes'
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-semibold shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                📑 Quotations ({quotations.length})
              </button>
              <button
                onClick={() => setActiveTab('admin-products')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-products'
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-semibold shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                ⚙️ Products & Variants
              </button>
              <button
                onClick={() => setActiveTab('admin-plans')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin-plans'
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-semibold shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                📐 Plans Configuration
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Main Dynamic Workspace Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 space-y-8 bg-[#FFFFFF]">
        {/* ========================================================================= */}
        {/* VIEW 1: SUBSCRIPTION MODELS & PRICING TIERS (CLIENT VIEW)                  */}
        {/* ========================================================================= */}
        {activeTab === 'models' && (
          <section className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <Badge variant="brand">Enterprise Subscription Tiers</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Choose the Ideal Subscription Model
              </h2>
              <p className="text-[#64748B] text-sm">
                Transparent recurring plans with zero hidden fees. Built for scalable enterprise growth.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`flex flex-col justify-between border ${
                    plan.billingFrequency === 'YEARLY'
                      ? 'border-[#4F46E5] ring-2 ring-[#EEF2FF] shadow-md'
                      : 'border-[#E2E8F0]'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-[#4F46E5] font-semibold">
                        {plan.code}
                      </span>
                      {plan.billingFrequency === 'YEARLY' && (
                        <Badge variant="paused">Best Value Annual</Badge>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-[#0F172A]">{plan.name}</h3>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
                        {formatINR(plan.price)}
                      </span>
                      <span className="text-xs text-[#64748B] lowercase">
                        / {plan.billingFrequency}
                      </span>
                    </div>

                    <p className="text-xs text-[#64748B]">
                      Product: <strong className="text-[#0F172A] font-semibold">{plan.product?.name}</strong>
                    </p>

                    <div className="border-t border-[#E2E8F0] pt-4 space-y-2.5 text-xs text-[#334155]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#059669] font-bold">✓</span>
                        <span>Billing Cadence: {plan.billingFrequency} recurring</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#059669] font-bold">✓</span>
                        <span>Pause permitted: {plan.isPauseAllowed ? 'Yes (Flexible)' : 'No'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#059669] font-bold">✓</span>
                        <span>Renewal guaranteed: {plan.isRenewalAllowed ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#059669] font-bold">✓</span>
                        <span>Min Commitment: {plan.minimumQuantity} license</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleClientSubscribe(plan.id)}
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs tracking-wide uppercase transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      Subscribe To This Plan
                    </button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Catalog Products & Variants Overview */}
            <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#E2E8F0] space-y-4">
              <h3 className="text-lg font-bold text-[#0F172A]">Configurable Product Add-ons & Variants</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {products.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0F172A] text-sm">{p.name}</span>
                      <span className="text-xs text-[#059669] font-mono font-bold">{formatINR(p.salesPrice)}</span>
                    </div>
                    <p className="text-xs text-[#64748B]">{p.description || 'Enterprise catalog module'}</p>
                    {p.variants && p.variants.length > 0 && (
                      <div className="pt-2 text-[11px] text-[#64748B] border-t border-[#E2E8F0] space-y-1">
                        <span className="text-[#4F46E5] font-semibold">Available Add-ons:</span>
                        {p.variants.map((v: any) => (
                          <div key={v.id} className="flex justify-between">
                            <span>+ {v.name}</span>
                            <span className="text-[#0F172A] font-medium font-mono">+{formatINR(v.additionalPrice)}</span>
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
                <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Financial & Recurring Analytics</h2>
                <p className="text-xs text-[#64748B]">Live transaction metrics, collected revenue, and outstanding balance summary</p>
              </div>
              <button
                onClick={handleTriggerBilling}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                ⚡ Trigger Recurring Billing Engine
              </button>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <span className="text-xs text-[#64748B] font-medium">Active Subscriptions</span>
                <p className="text-3xl font-extrabold text-[#0F172A] mt-2">
                  {overview?.kpis?.activeSubscriptions ?? subscriptions.filter(s => s.status === 'ACTIVE').length}
                </p>
                <span className="text-[11px] text-[#059669] font-medium mt-1 inline-block">● Auto-renewing recurring contracts</span>
              </Card>

              <Card>
                <span className="text-xs text-[#64748B] font-medium">Total Revenue Collected</span>
                <p className="text-3xl font-extrabold text-[#059669] mt-2">
                  {formatINR(overview?.kpis?.totalRevenueCollected ?? 0)}
                </p>
                <span className="text-[11px] text-[#64748B] mt-1 inline-block">Realized cash flow</span>
              </Card>

              <Card>
                <span className="text-xs text-[#64748B] font-medium">Total Outstanding Balance</span>
                <p className="text-3xl font-extrabold text-[#D97706] mt-2">
                  {formatINR(overview?.kpis?.totalOutstanding ?? 0)}
                </p>
                <span className="text-[11px] text-[#64748B] mt-1 inline-block">Pending invoice settlements</span>
              </Card>

              <Card>
                <span className="text-xs text-[#64748B] font-medium">Overdue Invoices</span>
                <p className="text-3xl font-extrabold text-[#DC2626] mt-2">
                  {overview?.kpis?.overdueCount ?? 0}
                </p>
                <span className="text-[11px] text-[#DC2626] font-medium mt-1 inline-block">
                  Amount: {formatINR(overview?.kpis?.overdueAmount ?? 0)}
                </span>
              </Card>
            </div>

            {/* Active Subscriptions Quick Table */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#0F172A]">Recent Active Subscriptions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Subscription #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Next Billing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {subscriptions.slice(0, 5).map((s) => (
                      <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-[#4F46E5]">{s.subscriptionNumber}</td>
                        <td className="py-3 px-3 text-[#0F172A] font-medium">{s.customer?.companyName || s.customer?.contactName}</td>
                        <td className="py-3 px-3 text-[#334155]">{s.plan?.name}</td>
                        <td className="py-3 px-3 font-mono font-semibold text-[#0F172A]">{formatINR(s.totalAmount)}</td>
                        <td className="py-3 px-3">
                          <Badge variant={s.status === 'ACTIVE' ? 'active' : s.status === 'PAUSED' ? 'paused' : 'neutral'}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-[#64748B]">{s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : 'N/A'}</td>
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
                <h2 className="text-2xl font-bold text-[#0F172A]">Subscription Lifecycle Manager</h2>
                <p className="text-xs text-[#64748B]">Admin controls: pause, resume, renew, and terminate subscriptions</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Subscription</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Plan & Frequency</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-3 font-mono text-[#4F46E5] font-semibold">{s.subscriptionNumber}</td>
                      <td className="py-3 px-3 text-[#0F172A] font-medium">{s.customer?.companyName || s.customer?.contactName}</td>
                      <td className="py-3 px-3 text-[#334155]">{s.plan?.name} ({s.plan?.billingFrequency})</td>
                      <td className="py-3 px-3 font-mono font-semibold text-[#0F172A]">{formatINR(s.totalAmount)}</td>
                      <td className="py-3 px-3">
                        <Badge variant={s.status === 'ACTIVE' ? 'active' : s.status === 'PAUSED' ? 'paused' : 'neutral'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        {s.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleSubAction(s.id, 'pause')}
                            className="px-2.5 py-1 rounded-md bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A] border border-[#FDE68A] font-semibold cursor-pointer text-xs"
                          >
                            Pause
                          </button>
                        )}
                        {s.status === 'PAUSED' && (
                          <button
                            onClick={() => handleSubAction(s.id, 'resume')}
                            className="px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#059669] hover:bg-[#A7F3D0] border border-[#A7F3D0] font-semibold cursor-pointer text-xs"
                          >
                            Resume
                          </button>
                        )}
                        {s.status !== 'CLOSED' && (
                          <>
                            <button
                              onClick={() => handleSubAction(s.id, 'renew')}
                              className="px-2.5 py-1 rounded-md bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF] border border-[#C7D2FE] font-semibold cursor-pointer text-xs"
                            >
                              Renew +1Y
                            </button>
                            <button
                              onClick={() => handleSubAction(s.id, 'close')}
                              className="px-2.5 py-1 rounded-md bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA] border border-[#FECACA] font-semibold cursor-pointer text-xs"
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
                <h2 className="text-2xl font-bold text-[#0F172A]">Invoice Center & Settlements</h2>
                <p className="text-xs text-[#64748B]">Snapshot invoices, balance tracking, and manual payment allocations</p>
              </div>
              <button
                onClick={handleTriggerBilling}
                className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                ⚡ Run Recurring Billing Engine
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Total Amount</th>
                    <th className="py-3 px-3">Paid Amount</th>
                    <th className="py-3 px-3">Balance Due</th>
                    <th className="py-3 px-3">Payment Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-[#4F46E5]">{inv.invoiceNumber}</td>
                      <td className="py-3 px-3 text-[#0F172A] font-medium">{inv.customer?.companyName || inv.customer?.contactName}</td>
                      <td className="py-3 px-3 font-mono text-[#0F172A]">{formatINR(inv.totalAmount)}</td>
                      <td className="py-3 px-3 font-mono text-[#059669] font-medium">{formatINR(inv.paidAmount)}</td>
                      <td className="py-3 px-3 font-mono text-[#D97706] font-bold">{formatINR(inv.outstandingBalance)}</td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            inv.paymentStatus === 'PAID'
                              ? 'active'
                              : inv.paymentStatus === 'PARTIALLY_PAID'
                              ? 'paused'
                              : 'overdue'
                          }
                        >
                          {inv.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
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
                            className="px-3 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium cursor-pointer text-xs shadow-2xs"
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
            <h2 className="text-2xl font-bold text-[#0F172A]">Payment Ledger & Transactions</h2>
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Payment #</th>
                    <th className="py-3 px-3">Invoice Ref</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Reference / UTR</th>
                    <th className="py-3 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-[#059669]">{p.paymentNumber}</td>
                      <td className="py-3 px-3 font-mono text-[#4F46E5]">{p.invoice?.invoiceNumber}</td>
                      <td className="py-3 px-3 font-mono font-bold text-[#0F172A]">{formatINR(p.amount)}</td>
                      <td className="py-3 px-3 uppercase text-[11px] text-[#334155]">{p.paymentMethod}</td>
                      <td className="py-3 px-3 text-[#64748B]">{p.referenceNote || 'N/A'}</td>
                      <td className="py-3 px-3 text-[#64748B]">{new Date(p.paymentDate).toLocaleDateString()}</td>
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
                <h2 className="text-2xl font-bold text-[#0F172A]">Product Catalog & Variant Add-ons</h2>
                <p className="text-xs text-[#64748B]">Configure base products, pricing, and variant modifiers</p>
              </div>
              <button
                onClick={() => setShowProductModal(true)}
                className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                + Add New Product
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {products.map((p) => (
                <Card key={p.id} className="border border-[#E2E8F0] space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase text-[#4F46E5] font-semibold">{p.sku}</span>
                      <h3 className="text-lg font-bold text-[#0F172A] mt-1">{p.name}</h3>
                    </div>
                    <Badge variant="active">{p.productType}</Badge>
                  </div>

                  <p className="text-xs text-[#64748B]">{p.description}</p>

                  <div className="flex justify-between items-center bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] font-mono text-xs">
                    <div>
                      <span className="text-[#64748B]">Sales Price:</span>{' '}
                      <strong className="text-[#059669]">{formatINR(p.salesPrice)}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Cost:</span>{' '}
                      <span className="text-[#334155]">{formatINR(p.costPrice)}</span>
                    </div>
                  </div>

                  {p.variants && p.variants.length > 0 && (
                    <div className="pt-2 text-xs space-y-1.5 border-t border-[#E2E8F0]">
                      <span className="font-semibold text-[#0F172A] text-[11px] uppercase tracking-wider">
                        Variant Modifiers:
                      </span>
                      {p.variants.map((v: any) => (
                        <div key={v.id} className="flex justify-between text-[#64748B] text-xs py-1">
                          <span>{v.name}</span>
                          <span className="font-mono text-[#4F46E5] font-semibold">+{formatINR(v.additionalPrice)}</span>
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
                <h2 className="text-2xl font-bold text-[#0F172A]">Subscription Plans Configuration</h2>
                <p className="text-xs text-[#64748B]">Configure recurring cadences, pricing tiers, and renewal rules</p>
              </div>
              <button
                onClick={() => {
                  if (products.length > 0) setPlanForm({ ...planForm, productId: products[0].id });
                  setShowPlanModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                + Create New Plan
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">Plan Name</th>
                    <th className="py-3 px-3">Frequency</th>
                    <th className="py-3 px-3">Recurring Price</th>
                    <th className="py-3 px-3">Pause Allowed</th>
                    <th className="py-3 px-3">Renewal Allowed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {plans.map((pl) => (
                    <tr key={pl.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-[#4F46E5]">{pl.code}</td>
                      <td className="py-3 px-3 font-semibold text-[#0F172A]">{pl.name}</td>
                      <td className="py-3 px-3 uppercase text-[11px] text-[#334155]">{pl.billingFrequency}</td>
                      <td className="py-3 px-3 font-mono font-bold text-[#059669]">{formatINR(pl.price)}</td>
                      <td className="py-3 px-3">{pl.isPauseAllowed ? '✅ Yes' : '❌ No'}</td>
                      <td className="py-3 px-3">{pl.isRenewalAllowed ? '✅ Yes' : '❌ No'}</td>
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
                <h2 className="text-2xl font-bold text-[#0F172A]">Customer Account Directory</h2>
                <p className="text-xs text-[#64748B]">Onboard customer accounts and manage billing profiles</p>
              </div>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                + Onboard New Customer
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Customer ID</th>
                    <th className="py-3 px-3">Company Name</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">City / Country</th>
                    <th className="py-3 px-3">Subscriptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-3 font-mono text-[#4F46E5] font-semibold">{c.customerNumber}</td>
                      <td className="py-3 px-3 font-semibold text-[#0F172A]">{c.companyName || 'Individual'}</td>
                      <td className="py-3 px-3 text-[#334155]">{c.contactName}</td>
                      <td className="py-3 px-3 text-[#64748B]">{c.email}</td>
                      <td className="py-3 px-3 text-[#64748B]">{c.city}, {c.country}</td>
                      <td className="py-3 px-3">
                        <Badge variant="brand">{c.subscriptions?.length || 0} active</Badge>
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
                <h2 className="text-2xl font-bold text-[#0F172A]">Commercial Quotations</h2>
                <p className="text-xs text-[#64748B]">Prepare quotes from templates and convert to active subscriptions</p>
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
                className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                + Prepare Quotation
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Quote #</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Valid Until</th>
                    <th className="py-3 px-3">Total Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-[#4F46E5]">{q.quotationNumber}</td>
                      <td className="py-3 px-3 font-semibold text-[#0F172A]">{q.customer?.companyName || q.customer?.contactName}</td>
                      <td className="py-3 px-3 text-[#64748B]">{new Date(q.validUntil).toLocaleDateString()}</td>
                      <td className="py-3 px-3 font-mono font-bold text-[#059669]">{formatINR(q.totalAmount)}</td>
                      <td className="py-3 px-3">
                        <Badge variant={q.status === 'CONVERTED' ? 'active' : 'paused'}>{q.status}</Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {q.status !== 'CONVERTED' && (
                          <button
                            onClick={() => handleConvertQuote(q.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold cursor-pointer text-xs shadow-2xs"
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
                <h2 className="text-2xl font-bold text-[#0F172A]">Client Self-Service Portal</h2>
                <p className="text-xs text-[#64748B]">
                  Welcome, <strong className="text-[#4F46E5] font-semibold">{currentUser?.email || 'Valued Customer'}</strong>. View your active subscriptions and invoices.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('models')}
                className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs cursor-pointer shadow-sm"
              >
                + Browse New Subscription Plans
              </button>
            </div>

            {/* My Subscriptions List */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#0F172A]">My Active Subscriptions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subscriptions.map((sub) => (
                  <Card key={sub.id} className="border border-[#E2E8F0] space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[#4F46E5] text-xs font-semibold">{sub.subscriptionNumber}</span>
                        <h4 className="text-lg font-bold text-[#0F172A] mt-1">{sub.plan?.name}</h4>
                      </div>
                      <Badge variant={sub.status === 'ACTIVE' ? 'active' : sub.status === 'PAUSED' ? 'paused' : 'neutral'}>
                        {sub.status}
                      </Badge>
                    </div>

                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Total Recurring:</span>
                        <span className="text-[#059669] font-bold">{formatINR(sub.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Next Scheduled Invoice:</span>
                        <span className="text-[#0F172A] font-medium">
                          {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Contract End Date:</span>
                        <span className="text-[#0F172A] font-medium">{new Date(sub.expiryDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      {sub.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleSubAction(sub.id, 'pause')}
                          className="flex-1 py-2 rounded-lg bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A] border border-[#FDE68A] font-semibold text-xs cursor-pointer"
                        >
                          Pause Plan
                        </button>
                      )}
                      {sub.status === 'PAUSED' && (
                        <button
                          onClick={() => handleSubAction(sub.id, 'resume')}
                          className="flex-1 py-2 rounded-lg bg-[#ECFDF5] text-[#059669] hover:bg-[#A7F3D0] border border-[#A7F3D0] font-semibold text-xs cursor-pointer"
                        >
                          Resume Plan
                        </button>
                      )}
                      <button
                        onClick={() => handleSubAction(sub.id, 'close')}
                        className="py-2 px-3 rounded-lg bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA] border border-[#FECACA] font-semibold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* My Invoices Table */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#0F172A]">My Invoices & Payment Receipts</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Paid</th>
                      <th className="py-2.5 px-3">Outstanding Balance</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-[#4F46E5]">{inv.invoiceNumber}</td>
                        <td className="py-3 px-3 text-[#64748B]">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-mono text-[#0F172A]">{formatINR(inv.totalAmount)}</td>
                        <td className="py-3 px-3 font-mono text-[#059669] font-medium">{formatINR(inv.paidAmount)}</td>
                        <td className="py-3 px-3 font-mono font-bold text-[#D97706]">{formatINR(inv.outstandingBalance)}</td>
                        <td className="py-3 px-3">
                          <Badge variant={inv.paymentStatus === 'PAID' ? 'active' : 'paused'}>
                            {inv.paymentStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-[#4F46E5] font-semibold hover:underline cursor-pointer">
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-[#0F172A] text-base">Record Payment for {selectedInvoice.invoiceNumber}</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="text-[#334155] font-medium block mb-1">Outstanding Balance</label>
                <input
                  type="text"
                  disabled
                  value={formatINR(selectedInvoice.outstandingBalance)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 text-[#D97706] font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[#334155] font-medium block mb-1">Payment Amount (INR ₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-[#0F172A] font-mono focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                />
              </div>

              <div>
                <label className="text-[#334155] font-medium block mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
                  <option value="CREDIT_CARD_MANUAL">Credit Card Manual Entry</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online Gateway</option>
                </select>
              </div>

              <div>
                <label className="text-[#334155] font-medium block mb-1">Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-98237498"
                  value={paymentForm.referenceNote}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNote: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold cursor-pointer shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-[#0F172A] text-base">Add Product to Catalog</h3>
              <button onClick={() => setShowProductModal(false)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#334155] font-medium block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud ERP Suite"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                />
              </div>

              <div>
                <label className="text-[#334155] font-medium block mb-1">SKU Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ERP-CLOUD-01"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] font-mono focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#334155] font-medium block mb-1">Sales Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.salesPrice}
                    onChange={(e) => setProductForm({ ...productForm, salesPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] font-mono focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[#334155] font-medium block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] font-mono focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#334155] font-medium block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold cursor-pointer shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-[#0F172A] text-base">Create Subscription Plan Tier</h3>
              <button onClick={() => setShowPlanModal(false)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#334155] font-medium block mb-1">Associate with Product</label>
                <select
                  value={planForm.productId}
                  onChange={(e) => setPlanForm({ ...planForm, productId: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#334155] font-medium block mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growth Monthly Tier"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                />
              </div>

              <div>
                <label className="text-[#334155] font-medium block mb-1">Plan Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PLAN-GROWTH-MO"
                  value={planForm.code}
                  onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] font-mono focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#334155] font-medium block mb-1">Billing Frequency</label>
                  <select
                    value={planForm.billingFrequency}
                    onChange={(e) => setPlanForm({ ...planForm, billingFrequency: e.target.value })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#334155] font-medium block mb-1">Recurring Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] font-mono focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-[#334155] font-medium">
                  <input
                    type="checkbox"
                    checked={planForm.isPauseAllowed}
                    onChange={(e) => setPlanForm({ ...planForm, isPauseAllowed: e.target.checked })}
                    className="rounded text-[#4F46E5] focus:ring-[#EEF2FF]"
                  />
                  <span>Pause Allowed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[#334155] font-medium">
                  <input
                    type="checkbox"
                    checked={planForm.isRenewalAllowed}
                    onChange={(e) => setPlanForm({ ...planForm, isRenewalAllowed: e.target.checked })}
                    className="rounded text-[#4F46E5] focus:ring-[#EEF2FF]"
                  />
                  <span>Renewal Allowed</span>
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold cursor-pointer shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-[#0F172A] text-base">Onboard New Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#334155] font-medium block mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stark Industries"
                  value={customerForm.companyName}
                  onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                />
              </div>

              <div>
                <label className="text-[#334155] font-medium block mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tony Stark"
                  value={customerForm.contactName}
                  onChange={(e) => setCustomerForm({ ...customerForm, contactName: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#334155] font-medium block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="tony@stark.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[#334155] font-medium block mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#334155] font-medium block mb-1">Billing Address</label>
                <input
                  type="text"
                  required
                  placeholder="Stark Tower, 5th Avenue"
                  value={customerForm.billingAddressLine1}
                  onChange={(e) => setCustomerForm({ ...customerForm, billingAddressLine1: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold cursor-pointer shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-[#0F172A] text-base">Prepare Commercial Quotation</h3>
              <button onClick={() => setShowQuoteModal(false)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">
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
                <label className="text-[#334155] font-medium block mb-1">Select Customer</label>
                <select
                  value={quoteForm.customerId}
                  onChange={(e) => setQuoteForm({ ...quoteForm, customerId: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || c.contactName} ({c.customerNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#334155] font-medium block mb-1">Select Product Offering</label>
                <select
                  value={quoteForm.productId}
                  onChange={(e) => setQuoteForm({ ...quoteForm, productId: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {formatINR(p.salesPrice)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#334155] font-medium block mb-1">Select Recurring Plan (Optional)</label>
                <select
                  value={quoteForm.planId}
                  onChange={(e) => setQuoteForm({ ...quoteForm, planId: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
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
                  <label className="text-[#334155] font-medium block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quoteForm.quantity}
                    onChange={(e) => setQuoteForm({ ...quoteForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] font-mono focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[#334155] font-medium block mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quoteForm.validDays}
                    onChange={(e) => setQuoteForm({ ...quoteForm, validDays: parseInt(e.target.value) || 15 })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-[#0F172A] font-mono focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] outline-hidden"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold cursor-pointer shadow-sm"
                >
                  Generate Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COLOR LEGEND STRIP (Theme & Palette Specs Token Inspector)                 */}
      {/* ========================================================================= */}
      <section className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-6 py-4">
        {/* <div className="max-w-7xl mx-auto space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
              <span>🎨</span> Theme & Palette Specs &bull; Light Enterprise SaaS Design System
            </span>
            <span className="text-[11px] text-[#64748B]">
              Tokens Active &bull; Canvas: #FFFFFF &bull; Primary Accent: #4F46E5
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-[11px]">
          
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2 shadow-2xs">
              <div className="w-5 h-5 rounded border border-[#E2E8F0] bg-[#FFFFFF] shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-[#0F172A] leading-none">app</p>
                <p className="text-[10px] text-[#64748B] font-mono">#FFFFFF</p>
              </div>
            </div>

           
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2 shadow-2xs">
              <div className="w-5 h-5 rounded border border-[#E2E8F0] bg-[#F8FAFC] shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-[#0F172A] leading-none">subtle</p>
                <p className="text-[10px] text-[#64748B] font-mono">#F8FAFC</p>
              </div>
            </div>

          
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2 shadow-2xs">
              <div className="w-5 h-5 rounded border border-[#E2E8F0] bg-[#F1F5F9] shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-[#0F172A] leading-none">hover</p>
                <p className="text-[10px] text-[#64748B] font-mono">#F1F5F9</p>
              </div>
            </div>

          
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2 shadow-2xs">
              <div className="w-5 h-5 rounded border border-[#CBD5E1] bg-[#E2E8F0] shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-[#0F172A] leading-none">border</p>
                <p className="text-[10px] text-[#64748B] font-mono">#E2E8F0</p>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2 shadow-2xs">
              <div className="w-5 h-5 rounded bg-[#4F46E5] shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-[#0F172A] leading-none">brand</p>
                <p className="text-[10px] text-[#4F46E5] font-mono font-medium">#4F46E5</p>
              </div>
            </div>

           
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2 shadow-2xs">
              <div className="w-5 h-5 rounded border border-[#A7F3D0] bg-[#ECFDF5] flex items-center justify-center text-[10px] text-[#059669] font-bold shrink-0">
                ✓
              </div>
              <div className="truncate">
                <p className="font-semibold text-[#059669] leading-none">active</p>
                <p className="text-[10px] text-[#64748B] font-mono">#059669</p>
              </div>
            </div>

           
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2 shadow-2xs">
              <div className="w-5 h-5 rounded border border-[#FDE68A] bg-[#FEF3C7] flex items-center justify-center text-[10px] text-[#D97706] font-bold shrink-0">
                ⏸
              </div>
              <div className="truncate">
                <p className="font-semibold text-[#D97706] leading-none">paused</p>
                <p className="text-[10px] text-[#64748B] font-mono">#D97706</p>
              </div>
            </div>

      
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2 shadow-2xs">
              <div className="w-5 h-5 rounded border border-[#FECACA] bg-[#FEE2E2] flex items-center justify-center text-[10px] text-[#DC2626] font-bold shrink-0">
                !
              </div>
              <div className="truncate">
                <p className="font-semibold text-[#DC2626] leading-none">overdue</p>
                <p className="text-[10px] text-[#64748B] font-mono">#DC2626</p>
              </div>
            </div>
          </div>
        </div> */}
      </section>

      {/* Footer */}
      <footer className="bg-white px-6 py-4 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
        <p>
          Subscription Management System &bull; Active Role:{' '}
          <span className="text-[#4F46E5] font-bold uppercase">{currentRole}</span> &bull; Enterprise Recurring Billing Platform
        </p>
      </footer>
    </div>
  );
}
