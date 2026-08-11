import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  Line,
  ComposedChart,
} from 'recharts';
import { AlertCircle, ChevronRight, Calendar } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface OrderItem {
  name: string;
}

interface RecentOrder {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  customer?: {
    username: string;
    email: string;
  } | null;
  items?: OrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  delivered: '#3b82f6',
  shipped: '#38bdf8',
  processing: '#f59e0b',
  cancelled: '#f43f5e',
};

const AVATAR_PALETTE = [
  { bg: 'rgba(56,189,248,0.14)', color: '#38bdf8' },
  { bg: 'rgba(167,139,250,0.16)', color: '#a78bfa' },
  { bg: 'rgba(245,158,11,0.16)', color: '#f59e0b' },
  { bg: 'rgba(59,130,246,0.16)', color: '#60a5fa' },
  { bg: 'rgba(244,63,94,0.16)', color: '#f43f5e' },
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);

const formatDateRange = (range: '7d' | '30d' | '90d') => {
  const end = new Date();
  const start = new Date();
  const days = range === '7d' ? 6 : range === '30d' ? 29 : 89;
  start.setDate(end.getDate() - days);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getAvatarStyle = (name: string) => {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const MetricRing: React.FC<{
  value: number;
  label: string;
  subtext: string;
  color: string;
}> = ({ value, label, subtext, color }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(Math.min(value, 100) / 100) * circumference} ${circumference}`;

  return (
    <div className="flex items-center gap-3.5 rounded-[13px] border border-border bg-white/[0.015] p-[13px_15px]">
      <div className="relative h-[50px] w-[50px] shrink-0">
        <svg width="50" height="50" viewBox="0 0 56 56" className="-rotate-90">
          <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-xs font-bold">
          {Math.round(value)}%
        </span>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
        <div className="mt-0.5 font-display text-lg font-bold tracking-[-0.02em]">{subtext}</div>
      </div>
    </div>
  );
};

const StatusDonut: React.FC<{
  segments: { name: string; value: number; color: string }[];
  total: number;
}> = ({ segments, total }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative h-[188px] w-[188px]">
      <svg width="188" height="188" viewBox="0 0 200 200">
        <g transform="rotate(-90 100 100)" fill="none" strokeWidth="22" strokeLinecap="butt">
          <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.045)" />
          {segments.map((seg) => {
            const length = total > 0 ? (seg.value / total) * circumference : 0;
            const dasharray = `${length} ${circumference - length}`;
            const dashoffset = -offset;
            offset += length;
            return (
              <circle
                key={seg.name}
                cx="100"
                cy="100"
                r={radius}
                stroke={seg.color}
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
              />
            );
          })}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[38px] font-bold tracking-[-0.04em]">{total}</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">TOTAL</span>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    delivered: 'bg-blue-500/16 text-blue-400',
    shipped: 'bg-sky-400/14 text-sky-400',
    processing: 'bg-amber-500/16 text-amber-400',
    cancelled: 'bg-rose-500/16 text-rose-400',
  };
  const cls = styles[status] ?? styles.processing;
  return (
    <span className={`inline-block rounded-lg px-2.5 py-1 text-[11.5px] font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
};

const Overview: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');

  const { data: conversion, isLoading: isConversionLoading, error: conversionError } = useQuery({
    queryKey: ['analytics-conversion'],
    queryFn: async () => (await api.get('/admin/analytics/conversion')).data,
  });

  const { data: revenue, isLoading: isRevenueLoading } = useQuery({
    queryKey: ['analytics-revenue', range],
    queryFn: async () => (await api.get(`/admin/analytics/revenue?range=${range}`)).data,
  });

  const { data: ordersSummary, isLoading: isOrdersSummaryLoading } = useQuery({
    queryKey: ['analytics-orders-summary'],
    queryFn: async () => (await api.get('/admin/analytics/orders-summary')).data,
  });

  const { data: topProducts, isLoading: isTopProductsLoading } = useQuery<Product[]>({
    queryKey: ['analytics-top-products'],
    queryFn: async () => (await api.get('/admin/analytics/top-products?limit=5')).data,
  });

  const { data: customersData, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['admin-customers-count'],
    queryFn: async () => (await api.get('/admin/customers?page=1&limit=1')).data,
  });

  const { data: recentOrdersData, isLoading: isRecentOrdersLoading } = useQuery({
    queryKey: ['analytics-recent-orders'],
    queryFn: async () => (await api.get('/admin/orders?page=1&limit=6')).data,
  });

  const isLoading =
    isConversionLoading ||
    isRevenueLoading ||
    isOrdersSummaryLoading ||
    isTopProductsLoading ||
    isCustomersLoading ||
    isRecentOrdersLoading;

  if (conversionError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-[18px] border border-border glass-panel p-8 text-center">
        <AlertCircle size={40} className="animate-bounce text-red-400" />
        <h3 className="font-display text-lg font-bold">Analytics Loading Error</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Unable to retrieve stats from the server. Ensure the NestJS server is running and the database contains seeded orders.
        </p>
      </div>
    );
  }

  const totalOrders = conversion?.total || 0;
  const conversionRate = conversion?.deliveredRate || 0;
  const totalCustomers = customersData?.total || 0;
  const totalPeriodRevenue = revenue
    ? revenue.reduce((sum: number, item: { revenue: number }) => sum + item.revenue, 0)
    : 0;

  const pieData = ordersSummary
    ? [
        { name: 'Delivered', value: ordersSummary.delivered, color: STATUS_COLORS.delivered },
        { name: 'Shipped', value: ordersSummary.shipped, color: STATUS_COLORS.shipped },
        { name: 'Processing', value: ordersSummary.processing, color: STATUS_COLORS.processing },
        { name: 'Cancelled', value: ordersSummary.cancelled, color: STATUS_COLORS.cancelled },
      ].filter((item) => item.value > 0)
    : [];

  const maxProductQuantity =
    topProducts && topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.totalQuantity), 1) : 1;

  const chartGridStroke = theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const chartAxisColor = theme === 'dark' ? '#5d6878' : '#94a3b8';
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#171d27' : '#ffffff',
    borderColor: 'var(--nova-line)',
    borderRadius: '12px',
    fontSize: '11px',
    fontFamily: 'DM Sans, sans-serif',
  };

  const welcomeName = user?.username ?? 'Admin';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        subtitle={`Welcome back, ${welcomeName} — here's how your store performed this week.`}
        showLive
      >
        <div className="hidden items-center gap-2 rounded-xl border border-border bg-white/[0.02] px-3.5 py-2 text-[12.5px] font-semibold text-foreground sm:flex">
          <Calendar size={15} className="text-muted-foreground" strokeWidth={1.8} />
          {formatDateRange(range)}
        </div>
      </PageHeader>

      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.92fr_1.32fr]">
        {/* Top Products */}
        <section className="glass-panel flex flex-col p-[22px_24px]">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold tracking-[-0.01em]">Top Performing Products</h3>
            <span className="nova-badge">BY REVENUE</span>
          </div>
          <div className="space-y-[17px]">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="animate-pulse space-y-2">
                  <div className="h-3.5 w-2/3 rounded bg-muted" />
                  <div className="h-[7px] rounded bg-muted" />
                </div>
              ))
            ) : !topProducts?.length ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No sales records found</p>
            ) : (
              topProducts.map((product) => {
                const ratio = (product.totalQuantity / maxProductQuantity) * 100;
                return (
                  <div key={product.id}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold" title={product.name}>
                        {product.name}
                      </span>
                      <span className="shrink-0 text-[12.5px] text-muted-foreground">
                        {product.totalQuantity} sold ·{' '}
                        <span className="font-bold text-blue-400">{formatCurrency(product.totalRevenue)}</span>
                      </span>
                    </div>
                    <div className="h-[7px] overflow-hidden rounded-md bg-white/[0.05]">
                      <div
                        className="h-full rounded-md bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Order Status */}
        <section className="glass-panel p-[22px_24px]">
          <div className="mb-3.5 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold tracking-[-0.01em]">Order Status</h3>
            <span className="nova-badge">SUMMARY</span>
          </div>
          <div className="flex flex-col items-center gap-[18px]">
            {isLoading ? (
              <div className="h-[188px] w-[188px] animate-spin rounded-full border-4 border-muted border-t-blue-500/30" />
            ) : pieData.length === 0 ? (
              <p className="py-12 text-xs text-muted-foreground">No metrics available</p>
            ) : (
              <>
                <StatusDonut segments={pieData} total={totalOrders} />
                <div className="grid w-full grid-cols-2 gap-x-3.5 gap-y-2.5">
                  {pieData.map((d) => (
                    <span key={d.name} className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                      <span className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: d.color }} />
                      {d.name}
                      <b className="ml-auto font-bold text-foreground">{d.value}</b>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Performance Overview */}
        <section className="glass-panel flex flex-col p-[22px_24px]">
          <div className="mb-[18px] flex items-center justify-between">
            <h3 className="font-display text-base font-semibold tracking-[-0.01em]">Performance Overview</h3>
            <span className="nova-badge-live">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-nova-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            <MetricRing
              value={conversion?.revenueTargetProgress || 0}
              label="Revenue Target"
              subtext={formatCurrency(totalPeriodRevenue)}
              color="#3b82f6"
            />
            <MetricRing
              value={conversionRate}
              label="Conversion Rate"
              subtext={`${conversionRate.toFixed(1)}%`}
              color="#38bdf8"
            />
            <MetricRing
              value={conversion?.customerTargetProgress || 0}
              label="New Customers"
              subtext={totalCustomers.toString()}
              color="#a78bfa"
            />
          </div>
          <div className="mt-auto pt-3.5">
            {isLoading ? (
              <div className="h-14 animate-pulse rounded-xl bg-muted/20" />
            ) : (
              <ResponsiveContainer width="100%" height={56}>
                <AreaChart data={revenue} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#60a5fa" stopOpacity={0.28} />
                      <stop offset="1" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#60a5fa"
                    strokeWidth={2.2}
                    dot={false}
                    fill="url(#sparkFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.62fr_1fr]">
        {/* Sales vs Orders */}
        <section className="glass-panel p-[22px_24px]">
          <div className="mb-[22px] flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="font-display text-base font-semibold tracking-[-0.01em]">Sales vs Orders Volume</h3>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Comparing transactions against total earnings
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3.5">
              <div className="flex gap-0.5 rounded-[10px] border border-border bg-black/20 p-[3px]">
                {(['7d', '30d', '90d'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`cursor-pointer rounded-[7px] px-3 py-1.5 text-xs font-semibold transition-all ${
                      range === r
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[3px] bg-blue-400" />
                  Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-[3px] w-3.5 rounded-sm bg-sky-400" />
                  Orders
                </span>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-xl bg-muted/20" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenue} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke={chartAxisColor}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => {
                      const p = val.split('-');
                      return p.length > 2 ? `${p[1]}/${p[2]}` : val;
                    }}
                  />
                  <YAxis stroke={chartAxisColor} fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="revenue"
                    fill="url(#barGradient)"
                    radius={[7, 7, 3, 3]}
                    name="Revenue"
                    maxBarSize={44}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                    name="Orders"
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#60a5fa" />
                      <stop offset="1" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Store Conversion */}
        <section className="glass-panel flex flex-col p-[22px_24px]">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold tracking-[-0.01em]">Store Conversion</h3>
            <span className="nova-badge-live">LIVE STATS</span>
          </div>
          <div className="font-display text-[46px] font-extrabold tracking-[-0.04em]">
            {conversionRate.toFixed(1)}%
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Average order value{' '}
            <b className="font-bold text-foreground">{formatCurrency(conversion?.averageOrderValue || 0)}</b>
          </p>
          <div className="mt-auto pt-[18px]">
            {isLoading ? (
              <div className="h-44 animate-pulse rounded-xl bg-muted/20" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={172}>
                  <AreaChart data={revenue} margin={{ top: 5, right: 2, left: -25, bottom: 2 }}>
                    <defs>
                      <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#60a5fa" stopOpacity={0.32} />
                        <stop offset="1" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#60a5fa"
                      strokeWidth={2.6}
                      fill="url(#convFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-between pt-2">
                  {(revenue || []).slice(0, 7).map((item: { date: string }) => {
                    const p = item.date.split('-');
                    const label = p.length > 2 ? `${p[1]}/${p[2]}` : item.date;
                    return (
                      <span key={item.date} className="text-[11px] text-muted-foreground">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Recent Orders */}
      <section className="glass-panel p-[22px_24px]">
        <div className="mb-[18px] flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold tracking-[-0.01em]">Recent Orders</h3>
            <p className="mt-1 text-[12.5px] text-muted-foreground">Live store order logging updates</p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-blue-400 hover:underline"
          >
            View full report
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div className="grid grid-cols-[0.7fr_1.5fr_1.5fr_1fr_0.8fr_0.7fr] border-b border-border px-1.5 pb-3">
            {['Order', 'Customer', 'Product', 'Status', 'Total', 'Date'].map((col, i) => (
              <span
                key={col}
                className={`text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground ${
                  i >= 4 ? 'text-right' : ''
                }`}
              >
                {col}
              </span>
            ))}
          </div>

          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="grid animate-pulse grid-cols-6 gap-4 border-b border-border px-1.5 py-3.5">
                {Array.from({ length: 6 }).map((__, i) => (
                  <div key={i} className="h-3 rounded bg-muted" />
                ))}
              </div>
            ))
          ) : !recentOrdersData?.orders?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No recent orders logged</p>
          ) : (
            recentOrdersData.orders.map((order: RecentOrder) => {
              const customerName = order.customer?.username || 'Guest';
              const avatar = getAvatarStyle(customerName);
              const productName = order.items?.[0]?.name || '—';
              return (
                <div
                  key={order.id}
                  className="grid grid-cols-[0.7fr_1.5fr_1.5fr_1fr_0.8fr_0.7fr] items-center border-b border-border px-1.5 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                >
                  <span className="font-display text-[13px] font-semibold text-muted-foreground">
                    #{order.id.substring(0, 4)}
                  </span>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] font-display text-[11px] font-bold"
                      style={{ backgroundColor: avatar.bg, color: avatar.color }}
                    >
                      {getInitials(customerName)}
                    </span>
                    <span className="truncate text-[13.5px] font-semibold">{customerName}</span>
                  </span>
                  <span className="truncate text-[13px] text-muted-foreground">{productName}</span>
                  <span>
                    <StatusBadge status={order.status} />
                  </span>
                  <span className="text-right font-display text-[13.5px] font-bold">{formatCurrency(order.total)}</span>
                  <span className="text-right text-[12.5px] text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="animate-pulse rounded-xl border border-border p-4">
                <div className="h-4 w-1/2 rounded bg-muted" />
              </div>
            ))
          ) : (
            recentOrdersData?.orders?.map((order: RecentOrder) => {
              const customerName = order.customer?.username || 'Guest';
              const avatar = getAvatarStyle(customerName);
              return (
                <div key={order.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-semibold text-muted-foreground">
                      #{order.id.substring(0, 8)}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg font-display text-[11px] font-bold"
                      style={{ backgroundColor: avatar.bg, color: avatar.color }}
                    >
                      {getInitials(customerName)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.items?.[0]?.name || '—'}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="font-display font-bold">{formatCurrency(order.total)}</span>
                    <span className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default Overview;
