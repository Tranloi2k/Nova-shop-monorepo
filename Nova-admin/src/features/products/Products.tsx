import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { isCloudinaryConfigured, isCloudinaryUrl, getProductImageSrc, uploadProductImage } from '../../lib/cloudinary';
import {
  VariantImageUploads,
  buildVariantSlotsFromProduct,
  resolveVariantImageUrls,
  serializeVariantImages,
  syncVariantSlotsWithColors,
  type VariantImageSlot,
} from '../../lib/product-variant-images';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../../components/PageHeader';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category?: string;
  image?: string;
  colors?: string;
  images?: string;
  storageOptions?: string;
  discount?: number;
  detailInformation?: string;
}

const Products: React.FC = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Advanced Filters
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [onSale, setOnSale] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(100);
  const [formCategory, setFormCategory] = useState('accessories');
  const [colors, setColors] = useState('');
  const [storageOptions, setStorageOptions] = useState('');
  const [discount, setDiscount] = useState(0);
  const [detailInformation, setDetailInformation] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [legacyImageRemoved, setLegacyImageRemoved] = useState(false);
  const [variantSlots, setVariantSlots] = useState<VariantImageSlot[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Keep variant image rows aligned when colors change in the modal
  useEffect(() => {
    if (!isModalOpen) return;
    setVariantSlots((prev) => syncVariantSlotsWithColors(colors, prev));
  }, [colors, isModalOpen]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on search
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when other filters change
  useEffect(() => {
    setPage(1);
  }, [category, stockStatus, sort, onSale, minPrice, maxPrice]);

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setStockStatus('all');
    setSort('newest');
    setOnSale('all');
    setMinPrice('');
    setMaxPrice('');
  };

  const isAnyFilterActive =
    search !== '' ||
    category !== '' ||
    stockStatus !== 'all' ||
    sort !== 'newest' ||
    onSale !== 'all' ||
    minPrice !== '' ||
    maxPrice !== '';

  // Fetch products
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-products', page, debouncedSearch, category, stockStatus, sort, onSale, minPrice, maxPrice],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (category) params.append('category', category);
      if (stockStatus && stockStatus !== 'all') params.append('stockStatus', stockStatus);
      if (sort) params.append('sort', sort);
      if (onSale && onSale !== 'all') params.append('onSale', onSale === 'sale' ? 'true' : 'false');
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const res = await api.get(`/admin/products?${params.toString()}`);
      return res.data;
    },
  });

  // Mutator for deleting product
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-top-products'] });
    },
  });

  // Mutation for creating/editing product
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: number;
      name: string;
      description: string;
      price: number;
      stock: number;
      category?: string;
      colors?: string;
      storageOptions?: string;
      discount: number;
      detailInformation?: string;
      imageFile?: File | null;
      imageUrl?: string;
      variantSlots?: VariantImageSlot[];
    }) => {
      const { id, imageFile: file, imageUrl: currentImageUrl, variantSlots: slots = [], ...fields } = payload;

      let image = currentImageUrl;
      if (file) {
        if (!isCloudinaryConfigured()) {
          throw new Error(
            'Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env',
          );
        }
        image = await uploadProductImage(file);
      }

      let resolvedSlots = slots;
      if (slots.some((slot) => slot.file)) {
        if (!isCloudinaryConfigured()) {
          throw new Error(
            'Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env',
          );
        }
        resolvedSlots = await resolveVariantImageUrls(slots, uploadProductImage);
      }

      const images = serializeVariantImages(resolvedSlots);
      if (!image && images) {
        image = images.split(',')[0];
      }

      const body: Record<string, unknown> = { ...fields };
      if (image !== undefined) body.image = image;
      if (images) body.images = images;

      if (id) {
        await api.patch(`/admin/products/${id}`, body);
      } else {
        await api.post('/admin/products', body);
      }
    },
    onSuccess: () => {
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-top-products'] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setFormError(err.response?.data?.message || err.message || 'Failed to save product.');
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPrice(0);
    setStock(100);
    setFormCategory('accessories');
    setColors('');
    setStorageOptions('');
    setDiscount(0);
    setDetailInformation('');
    setImageFile(null);
    setImageUrl(undefined);
    setImagePreview(null);
    setLegacyImageRemoved(false);
    setVariantSlots([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description);
    setPrice(product.price);
    setStock(product.stock);
    setFormCategory(product.category || 'accessories');
    setColors(product.colors || '');
    setStorageOptions(product.storageOptions || '');
    setDiscount(product.discount || 0);
    setDetailInformation(product.detailInformation || '');
    setImageFile(null);
    const cloudinaryImage = isCloudinaryUrl(product.image) ? product.image! : '';
    setImageUrl(cloudinaryImage);
    setImagePreview(cloudinaryImage || null);
    setLegacyImageRemoved(Boolean(product.image && !isCloudinaryUrl(product.image)));
    setVariantSlots(buildVariantSlotsFromProduct(product.colors || '', product.images || ''));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/image\/*/)) {
        setFormError('Please select a valid image file (PNG, JPG, WEBP).');
        return;
      }
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setLegacyImageRemoved(false);
      setFormError(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !description.trim() || price <= 0 || stock < 0) {
      setFormError('Please fill in all required fields (Price > 0, Stock >= 0).');
      return;
    }

    saveMutation.mutate({
      id: editingProduct?.id,
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      category: formCategory.trim() || undefined,
      colors: colors.trim() || undefined,
      storageOptions: storageOptions.trim() || undefined,
      discount: Number(discount),
      detailInformation: detailInformation.trim() || undefined,
      imageFile,
      imageUrl,
      variantSlots,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Manage your catalog, inventory, and pricing."
      />

      {/* Header Filters & Add btn */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search & Main Action Controls */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name..."
                className="block w-full pl-11 pr-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all text-sm"
              />
            </div>

            <button
              onClick={() => setStockStatus(stockStatus === 'low-stock' ? 'all' : 'low-stock')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                stockStatus === 'low-stock'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-muted/30 text-muted-foreground border-border hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Filter size={16} />
              Low Stock (&le;15)
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                showFilters || isAnyFilterActive
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted/30 text-muted-foreground border-border hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters
              {isAnyFilterActive && (
                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
              )}
            </button>

            {isAnyFilterActive && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 transition-all border border-border cursor-pointer"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-blue-600 shadow-[0_4px_15px_rgba(59,130,246,0.2)] transition-all self-start lg:self-auto cursor-pointer"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>

        {/* Collapsible Advanced Filters Panel */}
        {showFilters && (
          <div className="glass-panel p-5 rounded-2xl border border-border bg-card/45 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                >
                  <option value="" className="bg-card">All Categories</option>
                  <option value="smartphones" className="bg-card">Smartphones</option>
                  <option value="tablets" className="bg-card">Tablets</option>
                  <option value="wearables" className="bg-card">Wearables</option>
                  <option value="audio" className="bg-card">Audio</option>
                  <option value="laptops" className="bg-card">Laptops</option>
                  <option value="accessories" className="bg-card">Accessories</option>
                </select>
              </div>

              {/* Stock Status Filter */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Stock Status
                </label>
                <select
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                  className="block w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                >
                  <option value="all" className="bg-card">All Stock Statuses</option>
                  <option value="in-stock" className="bg-card">In Stock (&gt;15)</option>
                  <option value="low-stock" className="bg-card">Low Stock (&le;15)</option>
                  <option value="out-of-stock" className="bg-card">Out of Stock (0)</option>
                </select>
              </div>

              {/* Sale/Discount status Filter */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Discount Status
                </label>
                <select
                  value={onSale}
                  onChange={(e) => setOnSale(e.target.value)}
                  className="block w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                >
                  <option value="all" className="bg-card">All Products</option>
                  <option value="sale" className="bg-card">On Sale (Discounted)</option>
                  <option value="regular" className="bg-card">Regular Price</option>
                </select>
              </div>

              {/* Sort Filter */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Sort By
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="block w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                >
                  <option value="newest" className="bg-card">Newest</option>
                  <option value="price-low" className="bg-card">Price: Low to High</option>
                  <option value="price-high" className="bg-card">Price: High to Low</option>
                  <option value="stock-low" className="bg-card">Stock: Low to High</option>
                  <option value="stock-high" className="bg-card">Stock: High to Low</option>
                  <option value="name-asc" className="bg-card">Name: A to Z</option>
                  <option value="name-desc" className="bg-card">Name: Z to A</option>
                </select>
              </div>
            </div>

            {/* Price range filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider min-w-[70px]">Price ($):</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-muted/20 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 text-xs transition-all animate-none"
                  min="0"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-muted/20 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 text-xs transition-all animate-none"
                  min="0"
                />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">
                  Active Filters: <span className="font-semibold text-foreground">{[
                    category && 'Category',
                    stockStatus !== 'all' && 'Stock Status',
                    onSale !== 'all' && 'Discount',
                    sort !== 'newest' && 'Sorting',
                    (minPrice || maxPrice) && 'Price Range'
                  ].filter(Boolean).length}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products Table Card */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-muted rounded"></div>
                          <div className="h-3 w-48 bg-muted rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-8 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-6 w-16 bg-muted rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-red-400">
                    Failed to load products from server.
                  </td>
                </tr>
              ) : data?.products?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                data?.products?.map((product: Product) => (
                  <tr key={product.id} className="hover:bg-muted/30 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getProductImageSrc(product.image)}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover border border-border bg-muted"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate max-w-xs">{product.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-md mt-0.5">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">
                      ${Number(product.price).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {product.discount && product.discount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                          {product.discount}% OFF
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {product.stock <= 15 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                          <AlertTriangle size={12} />
                          {product.stock} Low
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                          {product.stock} In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-400 hover:bg-muted/50 border border-transparent hover:border-border transition-all cursor-pointer"
                          title="Edit Product"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={!hasRole(['admin'])}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent disabled:cursor-not-allowed transition-all cursor-pointer"
                          title={hasRole(['admin']) ? 'Delete Product' : 'Delete Product (Admin Only)'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
              <button
                onClick={() => setPage(page - 1)}
                disabled={!data.hasPrevPage}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
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

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Grid 2 Column */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: General Information */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                      placeholder="e.g. iPhone 15 Pro Max"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Description *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="block w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                      placeholder="Product descriptions..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="block w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                      required
                    >
                      <option value="smartphones" className="bg-card">Smartphones</option>
                      <option value="tablets" className="bg-card">Tablets</option>
                      <option value="wearables" className="bg-card">Wearables</option>
                      <option value="audio" className="bg-card">Audio</option>
                      <option value="laptops" className="bg-card">Laptops</option>
                      <option value="accessories" className="bg-card">Accessories</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Price (USD) *
                      </label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="block w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Stock *
                      </label>
                      <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(Number(e.target.value))}
                        className="block w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Media & Specs */}
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Product Thumbnail
                    </label>
                    <div className="flex gap-4">
                      {imagePreview ? (
                        <div className="h-28 w-28 rounded-xl overflow-hidden border border-border bg-muted shrink-0 relative group">
                          <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              if (imagePreview?.startsWith('blob:')) {
                                URL.revokeObjectURL(imagePreview);
                              }
                              setImageFile(null);
                              setImageUrl('');
                              setImagePreview(null);
                              setLegacyImageRemoved(false);
                            }}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <label className="h-28 w-28 rounded-xl border border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-all bg-muted/20">
                          <Upload size={20} className="mb-2" />
                          <span className="text-[10px] font-semibold uppercase">Upload</span>
                          <input type="file" onChange={handleImageChange} className="hidden" accept="image/*" />
                        </label>
                      )}
                      <div className="text-xs text-muted-foreground leading-normal flex flex-col justify-center">
                        <p>Format: JPG, PNG, WEBP, GIF</p>
                        <p className="mt-1">Images are uploaded to Cloudinary. The API stores only the CDN URL.</p>
                        {!isCloudinaryConfigured() && (
                          <p className="mt-1 text-amber-600 dark:text-amber-400">
                            Cloudinary env vars are missing — image upload will fail until configured.
                          </p>
                        )}
                        {legacyImageRemoved && (
                          <p className="mt-1 text-amber-600 dark:text-amber-400">
                            Previous local image was removed. Upload a new image to Cloudinary.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="block w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Colors
                      </label>
                      <input
                        type="text"
                        value={colors}
                        onChange={(e) => setColors(e.target.value)}
                        className="block w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                        placeholder="Black, Natural Titanium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Storage Options
                    </label>
                    <input
                      type="text"
                      value={storageOptions}
                      onChange={(e) => setStorageOptions(e.target.value)}
                      className="block w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                      placeholder="128GB, 256GB, 512GB"
                    />
                  </div>

                  <VariantImageUploads
                    colors={colors}
                    slots={variantSlots}
                    onChange={setVariantSlots}
                    disabled={saveMutation.isPending}
                  />
                </div>
              </div>

              {/* Detail Specification JSON Textarea */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Detail Information (JSON string / specifications)
                </label>
                <textarea
                  value={detailInformation}
                  onChange={(e) => setDetailInformation(e.target.value)}
                  rows={2}
                  className="block w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-mono"
                  placeholder='e.g. {"screen": "6.7 inch", "chip": "A17 Pro"}'
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-border pt-5 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground font-semibold text-sm hover:bg-muted transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-indigo-600 shadow-[0_4px_15px_rgba(99,102,241,0.2)] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {saveMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
