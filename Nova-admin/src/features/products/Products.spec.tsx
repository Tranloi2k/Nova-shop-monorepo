import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Products from './Products';

// Mock useAuth
const mockHasRole = vi.fn();
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'testuser', role: 'staff' },
    hasRole: mockHasRole,
  }),
}));

// Mock @tanstack/react-query
const mockQueryClient = {
  invalidateQueries: vi.fn(),
};
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
  useQuery: vi.fn(),
  useMutation: () => ({
    mutate: vi.fn(),
  }),
}));

import { useQuery } from '@tanstack/react-query';

describe('Products Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders products table with data', () => {
    // Mock successful fetch of products
    (useQuery as any).mockReturnValue({
      data: {
        products: [
          { id: 1, name: 'iPhone 15', description: 'Apple flagship', price: 999, stock: 50 },
          { id: 2, name: 'iPad Pro', description: 'M2 tablet', price: 799, stock: 5 },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
        hasPrevPage: false,
        hasNextPage: false,
      },
      isLoading: false,
      isError: false,
    });

    mockHasRole.mockReturnValue(false); // Staff user, cannot delete

    render(<Products />);

    // Check title/search bar
    expect(screen.getByPlaceholderText('Search products by name...')).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Stock')).toBeInTheDocument();

    // Check rows rendered
    expect(screen.getByText('iPhone 15')).toBeInTheDocument();
    expect(screen.getByText('iPad Pro')).toBeInTheDocument();

    // Check stock badges
    expect(screen.getByText('50 In Stock')).toBeInTheDocument();
    expect(screen.getByText('5 Low')).toBeInTheDocument(); // 5 <= 15 threshold
  });

  it('disables Delete button for staff users', () => {
    (useQuery as any).mockReturnValue({
      data: {
        products: [{ id: 1, name: 'iPhone 15', description: 'Apple flagship', price: 999, stock: 50 }],
        total: 1,
        page: 1,
        totalPages: 1,
      },
      isLoading: false,
    });

    mockHasRole.mockImplementation((roles: string[]) => roles.includes('admin') && false); // return false for admin role check

    render(<Products />);

    // Get delete button
    const deleteBtn = screen.getByTitle('Delete Product (Admin Only)');
    expect(deleteBtn).toBeDisabled();
  });

  it('enables Delete button for admin users', () => {
    (useQuery as any).mockReturnValue({
      data: {
        products: [{ id: 1, name: 'iPhone 15', description: 'Apple flagship', price: 999, stock: 50 }],
        total: 1,
        page: 1,
        totalPages: 1,
      },
      isLoading: false,
    });

    mockHasRole.mockImplementation((roles: string[]) => roles.includes('admin')); // returns true for admin

    render(<Products />);

    // Get delete button
    const deleteBtn = screen.getByTitle('Delete Product');
    expect(deleteBtn).toBeEnabled();
  });
});
