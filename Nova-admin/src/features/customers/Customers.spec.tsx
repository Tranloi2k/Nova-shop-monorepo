import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Customers from './Customers';

const mocks = vi.hoisted(() => ({
  listMode: 'data' as 'loading' | 'error' | 'empty' | 'data',
  detailMode: 'data' as 'loading' | 'empty' | 'data',
  mutate: vi.fn(),
}));

const customer = {
  id: 2,
  username: 'Nova Customer',
  email: 'customer@example.com',
  role: 'customer',
  totalOrders: 1,
  totalSpent: 200,
};

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
  useMutation: () => ({ mutate: mocks.mutate }),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'admin-customers-list') {
      return {
        data:
          mocks.listMode === 'data'
            ? { customers: [customer], page: 1, totalPages: 1 }
            : mocks.listMode === 'empty'
              ? { customers: [], page: 1, totalPages: 1 }
              : undefined,
        isLoading: mocks.listMode === 'loading',
        isError: mocks.listMode === 'error',
      };
    }
    return {
      data:
        mocks.detailMode === 'data'
          ? {
              ...customer,
              orders: [
                {
                  id: 'ORD-1',
                  total: 200,
                  status: 'delivered',
                  createdAt: '2026-08-15',
                  items: [{ id: 1, productId: 1, name: 'Nova Phone', image: '', price: 200, quantity: 1 }],
                },
              ],
            }
          : undefined,
      isLoading: mocks.detailMode === 'loading',
    };
  },
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, hasRole: () => true }),
}));
vi.mock('../../components/PageHeader', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

describe('Customers', () => {
  beforeEach(() => {
    mocks.listMode = 'data';
    mocks.detailMode = 'data';
    vi.clearAllMocks();
  });

  it.each([
    ['loading', '.animate-pulse'],
    ['error', 'Failed to fetch customers list.'],
    ['empty', 'No customers found.'],
  ] as const)('renders the %s customer-list state', (mode, expected) => {
    mocks.listMode = mode;
    const { container } = render(<Customers />);

    if (expected.startsWith('.')) expect(container.querySelector(expected)).toBeInTheDocument();
    else expect(screen.getByText(expected)).toBeVisible();
  });

  it('renders customers and their loaded profile details', () => {
    render(<Customers />);
    fireEvent.click(screen.getByTitle('View Details'));

    expect(screen.getAllByText('Nova Customer').length).toBeGreaterThan(0);
    expect(screen.getByText('Nova Phone')).toBeVisible();
  });

  it('renders the profile loading and failure states', () => {
    mocks.detailMode = 'loading';
    const loading = render(<Customers />);
    fireEvent.click(screen.getByTitle('View Details'));
    expect(loading.container.querySelector('.animate-spin')).toBeInTheDocument();
    loading.unmount();

    mocks.detailMode = 'empty';
    render(<Customers />);
    fireEvent.click(screen.getByTitle('View Details'));
    expect(screen.getByText('Failed to load customer profile details.')).toBeVisible();
  });
});
