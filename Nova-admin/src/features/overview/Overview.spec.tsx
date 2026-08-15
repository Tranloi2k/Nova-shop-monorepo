import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Overview from './Overview';

const mocks = vi.hoisted(() => ({ mode: 'data' as 'loading' | 'empty' | 'data' }));

const values: Record<string, unknown> = {
  'analytics-conversion': {
    total: 4,
    deliveredRate: 75,
    revenueTargetProgress: 20,
    customerTargetProgress: 10,
    averageOrderValue: 200,
  },
  'analytics-revenue': [{ date: '2026-08-15', revenue: 500, orders: 3 }],
  'analytics-orders-summary': { delivered: 2, shipped: 1, processing: 1, cancelled: 0 },
  'analytics-top-products': [
    { id: 1, name: 'Nova Phone', totalQuantity: 3, totalRevenue: 300 },
  ],
  'admin-customers-count': { total: 2 },
  'analytics-recent-orders': {
    orders: [
      {
        id: 'ORD-1',
        total: 200,
        status: 'delivered',
        createdAt: '2026-08-15',
        customer: { username: 'Nova User', email: 'nova@example.com' },
        items: [{ name: 'Nova Phone' }],
      },
    ],
  },
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data:
      mocks.mode === 'data'
        ? values[queryKey[0]]
        : mocks.mode === 'empty'
          ? queryKey[0] === 'analytics-recent-orders'
            ? { orders: [] }
            : queryKey[0] === 'analytics-top-products'
              ? []
              : queryKey[0] === 'analytics-orders-summary'
                ? { delivered: 0, shipped: 0, processing: 0, cancelled: 0 }
                : undefined
          : undefined,
    isLoading: mocks.mode === 'loading',
    error: null,
  }),
}));

vi.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'Admin Nova' } }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../components/PageHeader', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <header><h1>{title}</h1>{children}</header>
  ),
}));
vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  Line: () => null,
  ComposedChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Overview', () => {
  beforeEach(() => {
    mocks.mode = 'data';
  });

  it('renders analytics, products, order status, and recent orders', () => {
    render(<Overview />);

    expect(screen.getAllByText('Nova Phone').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nova User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Delivered').length).toBeGreaterThan(0);
  });

  it('renders loading placeholders in each asynchronous section', () => {
    mocks.mode = 'loading';
    const { container } = render(<Overview />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders empty states for products, statuses, and recent orders', () => {
    mocks.mode = 'empty';
    render(<Overview />);

    expect(screen.getByText('No sales records found')).toBeVisible();
    expect(screen.getByText('No metrics available')).toBeVisible();
    expect(screen.getByText('No recent orders logged')).toBeVisible();
  });
});
