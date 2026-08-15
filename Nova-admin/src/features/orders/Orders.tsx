import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileText,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface OrderItem {
  id: number;
  productId: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface ShippingAddress {
  fullName?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

interface StatusHistoryEntry {
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedBy: number | null;
  createdAt: string;
}

interface Order {
  id: string;
  userId: number;
  stripeSessionId: string;
  subtotal?: number;
  shippingFee?: number;
  taxAmount?: number;
  total: number;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string | null;
  carrier?: string | null;
  shippingAddress?: ShippingAddress | null;
  statusHistory?: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    username: string;
    email: string;
  } | null;
  items: OrderItem[];
}

const Orders: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch orders
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-orders', page, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'ALL') params.append('status', statusFilter.toLowerCase());

      const res = await api.get(`/admin/orders?${params.toString()}`);
      return res.data;
    },
  });

  // Mutator for updating status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      trackingNumber,
      carrier,
    }: {
      id: string;
      status: string;
      trackingNumber?: string;
      carrier?: string;
    }) => {
      const res = await api.patch(`/admin/orders/${id}/status`, {
        status,
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(carrier ? { carrier } : {}),
      });
      return res.data;
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-detail'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-conversion'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-orders-summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-top-products'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-recent-orders'] });
      // If modal is open for this order, update it
      if (selectedOrder && selectedOrder.id === updatedOrder.id) {
        setSelectedOrder(updatedOrder);
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update order status');
    },
  });

  // Fetch full order detail (breakdown, shipping address, status history) when
  // a row is opened - the list endpoint does not include these fields.
  const { data: orderDetail } = useQuery({
    queryKey: ['admin-order-detail', selectedOrder?.id],
    queryFn: async () => {
      const res = await api.get(`/admin/orders/${selectedOrder!.id}`);
      return res.data as Order;
    },
    enabled: !!selectedOrder,
  });

  // Prefer the richer detail payload; fall back to the list row while it loads.
  const detail: Order | null = orderDetail ?? selectedOrder;

  const handleStatusChange = (id: string, newStatus: string) => {
    // Collect a tracking number / carrier when marking an order as shipped.
    if (newStatus === 'shipped') {
      const trackingNumber = window.prompt('Tracking number (optional):') || undefined;
      const carrier = trackingNumber
        ? window.prompt('Carrier (e.g. GHN, FedEx) (optional):') || undefined
        : undefined;
      updateStatusMutation.mutate({ id, status: newStatus, trackingNumber, carrier });
      return;
    }
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'processing':
        return <Clock size={14} className="text-amber-400" />;
      case 'shipped':
        return <Truck size={14} className="text-indigo-400" />;
      case 'delivered':
        return <CheckCircle size={14} className="text-blue-400" />;
      case 'cancelled':
        return <XCircle size={14} className="text-red-400" />;
    }
  };

  const getStatusClass = (status: Order['status']) => {
    switch (status) {
      case 'processing':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'shipped':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'delivered':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
  };

  // State machine helper for allowable next statuses
  const getAllowedStatuses = (currentStatus: Order['status']) => {
    switch (currentStatus) {
      case 'processing':
        return ['shipped', 'cancelled'];
      case 'shipped':
        return ['delivered', 'cancelled'];
      default:
        return []; // delivered or cancelled are final states
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        subtitle="Track fulfillment status and order details."
      />

      {/* Search & Tabs Row */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border self-start overflow-x-auto max-w-full">
          {['ALL', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((tab) => (
            <button type="button"
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab
                  ? 'bg-primary text-white shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full xl:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID or email..."
            className="block w-full pl-11 pr-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all text-sm"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Update Status</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(() => {
                if (isLoading) return (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-muted rounded"></div></td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-muted rounded"></div>
                        <div className="h-3 w-36 bg-muted rounded"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-6 w-16 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-8 w-24 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-6 w-8 bg-muted rounded ml-auto"></div></td>
                  </tr>
                ))
              );
                if (isError) return (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-red-400">
                    Failed to fetch orders from server.
                  </td>
                </tr>
              );
                if (data?.orders?.length === 0) return (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              );
                return (
                data?.orders?.map((order: Order) => {
                  const allowed = getAllowedStatuses(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-all border-b border-border/50">
                      <td className="px-6 py-4 font-mono text-sm text-indigo-500 dark:text-indigo-400 font-semibold">
                        {order.id}
                      </td>
                      <td className="px-6 py-4">
                        {order.customer ? (
                          <div>
                            <p className="text-sm font-semibold text-foreground">{order.customer.username}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{order.customer.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Guest (User ID: {order.userId})</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-foreground">
                        ${order.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusClass(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="uppercase tracking-wider text-[10px]">{order.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {allowed.length > 0 ? (
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="bg-muted/30 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary hover:bg-muted/50 cursor-pointer transition-all"
                          >
                            <option value={order.status} disabled className="bg-background text-muted-foreground">
                              Choose Status...
                            </option>
                            {allowed.map((next) => (
                              <option key={next} value={next} className="bg-background text-foreground">
                                Mark as {next}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground font-semibold italic">Final State</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-500 hover:bg-muted/50 border border-transparent hover:border-border transition-all cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              );
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/50">
            <span className="text-xs text-muted-foreground">
              Showing page <span className="font-bold text-foreground">{data.page}</span> of{' '}
              <span className="font-bold text-foreground">{data.totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => setPage(page - 1)}
                disabled={!data.hasPrevPage}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button type="button"
                onClick={() => setPage(page + 1)}
                disabled={!data.hasNextPage}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-primary" />
                <div>
                  <h3 className="text-base font-bold text-foreground">Order Details</h3>
                  <p className="text-xs font-mono text-indigo-500 dark:text-indigo-400 font-semibold mt-0.5">{selectedOrder.id}</p>
                </div>
              </div>
              <button type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Order Info & Customer Details */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Date</span>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusClass(selectedOrder.status)}`}>
                      {getStatusIcon(selectedOrder.status)}
                      <span className="uppercase tracking-wider text-[9px]">{selectedOrder.status}</span>
                    </span>
                  </div>
                </div>

                <div className="col-span-2 pt-2 border-t border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Customer Details</span>
                  {selectedOrder.customer ? (
                    <div className="mt-1 flex gap-6 text-sm">
                      <p className="text-foreground font-medium">Username: <span className="font-bold">{selectedOrder.customer.username}</span></p>
                      <p className="text-muted-foreground">Email: <span className="font-semibold">{selectedOrder.customer.email}</span></p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs italic mt-1">Guest Purchase (User ID: {selectedOrder.userId})</p>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Items</h4>
                <div className="divide-y divide-border border-y border-border">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image || 'https://placehold.co/100x100?text=No+Image'}
                          alt={item.name}
                          className="h-10 w-10 rounded-lg object-cover border border-border bg-muted"
                        />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ${item.price.toLocaleString()} x {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-foreground">
                        ${(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping address */}
              {detail?.shippingAddress && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Truck size={13} /> Shipping Address
                  </h4>
                  <div className="p-4 rounded-xl bg-muted/20 border border-border text-sm text-foreground leading-relaxed">
                    <p className="font-semibold">{detail.shippingAddress.fullName}</p>
                    <p className="text-muted-foreground">{detail.shippingAddress.phone}</p>
                    <p>
                      {detail.shippingAddress.line1}
                      {detail.shippingAddress.line2 ? `, ${detail.shippingAddress.line2}` : ''}
                    </p>
                    <p>
                      {[detail.shippingAddress.city, detail.shippingAddress.state, detail.shippingAddress.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p>{detail.shippingAddress.country}</p>
                  </div>
                </div>
              )}

              {/* Tracking */}
              {detail?.trackingNumber && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm">
                  <span className="font-semibold text-muted-foreground">Tracking</span>
                  <span className="font-bold text-foreground">
                    {detail.carrier ? `${detail.carrier} · ` : ''}
                    {detail.trackingNumber}
                  </span>
                </div>
              )}

              {/* Summary with breakdown */}
              <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                {detail?.subtotal !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">${Number(detail.subtotal).toLocaleString()}</span>
                  </div>
                )}
                {detail?.shippingFee !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-foreground">${Number(detail.shippingFee).toLocaleString()}</span>
                  </div>
                )}
                {detail?.taxAmount !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-foreground">${Number(detail.taxAmount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-sm font-semibold text-muted-foreground">Total Amount Paid</span>
                  <span className="text-xl font-black text-gradient">${selectedOrder.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Status history timeline */}
              {detail?.statusHistory && detail.statusHistory.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock size={13} /> Status History
                  </h4>
                  <ol className="relative border-l border-border ml-2 space-y-4">
                    {detail.statusHistory.map((h) => (
                      <li key={`${h.createdAt}-${h.toStatus}`} className="ml-4">
                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary border border-background" />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground capitalize">{h.toStatus}</span>
                          {h.fromStatus && (
                            <span className="text-xs text-muted-foreground">from {h.fromStatus}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(h.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {h.note ? ` · ${h.note}` : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
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

export default Orders;
