import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../../components/PageHeader';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  User as UserIcon,
} from 'lucide-react';

interface Customer {
  id: number;
  username: string;
  email: string;
  role: 'customer' | 'staff' | 'admin';
  totalOrders: number;
  totalSpent: number;
}

interface OrderItem {
  id: number;
  productId: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface CustomerOrderDetail {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

interface CustomerDetail {
  id: number;
  username: string;
  email: string;
  role: 'customer' | 'staff' | 'admin';
  orders: CustomerOrderDetail[];
}

const Customers: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Selected customer details modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch customers list
  const { data: listData, isLoading: isListLoading, isError: isListError } = useQuery({
    queryKey: ['admin-customers-list', page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await api.get(`/admin/customers?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch selected customer details
  const { data: detailData, isLoading: isDetailLoading } = useQuery<CustomerDetail>({
    queryKey: ['admin-customer-detail', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null as any;
      const res = await api.get(`/admin/customers/${selectedCustomerId}`);
      return res.data;
    },
    enabled: !!selectedCustomerId,
  });

  // Mutator for updating customer role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await api.patch(`/admin/customers/${id}/role`, { role });
      return res.data;
    },
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers-count'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-conversion'] });
      // If modal is open for this customer, update local detailData role
      if (selectedCustomerId === updatedCustomer.id && detailData) {
        queryClient.setQueryData(['admin-customer-detail', selectedCustomerId], {
          ...detailData,
          role: updatedCustomer.role,
        });
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update role');
    },
  });

  const handleRoleChange = (id: number, newRole: string) => {
    if (window.confirm(`Are you sure you want to change this user's role to "${newRole}"?`)) {
      updateRoleMutation.mutate({ id, role: newRole });
    }
  };

  const getRoleBadgeClass = (role: Customer['role']) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'staff':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'customer':
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="View customer profiles, roles, and purchase history."
      />

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          className="block w-full pl-11 pr-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all text-sm"
        />
      </div>

      {/* Customers Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Total Orders</th>
                <th className="px-6 py-4">Total Spent</th>
                <th className="px-6 py-4">Assign Role</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isListLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-muted rounded"></div>
                        <div className="h-3 w-36 bg-muted rounded"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-10 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-8 w-20 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-6 w-8 bg-muted rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : isListError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-red-400">
                    Failed to fetch customers list.
                  </td>
                </tr>
              ) : listData?.customers?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No customers found.
                  </td>
                </tr>
              ) : (
                listData?.customers?.map((customer: Customer) => (
                  <tr key={customer.id} className="hover:bg-muted/30 transition-all border-b border-border/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center border border-border text-muted-foreground">
                          <UserIcon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{customer.username}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getRoleBadgeClass(customer.role)}`}>
                        {customer.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {customer.totalOrders}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-foreground">
                      ${customer.totalSpent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {hasRole(['admin']) && customer.id !== currentUser?.id ? (
                        <select
                          value={customer.role}
                          onChange={(e) => handleRoleChange(customer.id, e.target.value)}
                          className="bg-muted/30 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary hover:bg-muted/50 cursor-pointer transition-all"
                        >
                          <option value="customer" className="bg-background text-foreground">Customer</option>
                          <option value="staff" className="bg-background text-foreground">Staff</option>
                          <option value="admin" className="bg-background text-foreground">Admin</option>
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          {customer.id === currentUser?.id ? 'Self (Admin)' : 'Admin Only'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-500 hover:bg-muted/50 border border-transparent hover:border-border transition-all cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {listData && listData.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/50">
            <span className="text-xs text-muted-foreground">
              Showing page <span className="font-bold text-foreground">{listData.page}</span> of{' '}
              <span className="font-bold text-foreground">{listData.totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!listData.hasPrevPage}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!listData.hasNextPage}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail & History Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <UserIcon size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Customer Profile</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Details and order logs</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isDetailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : detailData ? (
                <>
                  {/* Profile info card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-xl bg-muted/30 border border-border">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Username</span>
                      <p className="text-sm font-semibold text-foreground mt-1">{detailData.username}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Email Address</span>
                      <p className="text-sm font-semibold text-foreground mt-1">{detailData.email}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">System Role</span>
                      <div className="mt-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getRoleBadgeClass(detailData.role)}`}>
                          {detailData.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order History */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order History ({detailData.orders.length})</h4>

                    {detailData.orders.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl bg-muted/5">
                        This customer has not placed any orders yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {detailData.orders.map((order) => (
                          <div key={order.id} className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
                            <div className="flex items-center justify-between border-b border-border pb-2.5">
                              <div>
                                <span className="font-mono text-xs font-bold text-indigo-500 dark:text-indigo-400">{order.id}</span>
                                <span className="text-[10px] text-muted-foreground ml-3">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="font-bold text-foreground">${order.total.toLocaleString()}</span>
                                <span className="uppercase text-[9px] font-bold text-blue-400">{order.status}</span>
                              </div>
                            </div>

                            {/* Order items */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  <img
                                    src={item.image || 'https://placehold.co/100x100?text=No+Image'}
                                    alt={item.name}
                                    className="h-6 w-6 rounded object-cover border border-border bg-muted shrink-0"
                                  />
                                  <span className="text-foreground truncate font-medium max-w-[180px]">{item.name}</span>
                                  <span className="text-muted-foreground font-semibold">&times; {item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-center text-sm text-muted-foreground">Failed to load customer profile details.</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground font-semibold text-sm hover:bg-muted transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
