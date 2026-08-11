import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import api from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import {
  getProductImageSrc,
  isCloudinaryConfigured,
  isCloudinaryUrl,
  uploadPosterImage,
} from '../../lib/cloudinary';

const MAX_POSTERS = 8;

interface ProductOption {
  id: number;
  name: string;
  image?: string;
}

interface PosterRecord {
  id: number;
  imageUrl: string;
  altText: string | null;
  productId: number;
  sortOrder: number;
  isActive: boolean;
  product?: ProductOption;
}

const Posters: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoster, setEditingPoster] = useState<PosterRecord | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [altText, setAltText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProductSearch(productSearch), 350);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const { data: posters = [], isLoading, isError } = useQuery({
    queryKey: ['admin-posters'],
    queryFn: async () => {
      const res = await api.get('/admin/posters');
      return res.data as PosterRecord[];
    },
  });

  const { data: productResults } = useQuery({
    queryKey: ['admin-products-picker', debouncedProductSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (debouncedProductSearch.trim()) {
        params.append('search', debouncedProductSearch.trim());
      }
      const res = await api.get(`/admin/products?${params.toString()}`);
      return res.data.products as ProductOption[];
    },
  });

  const productOptions = useMemo(() => productResults ?? [], [productResults]);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: number;
      productId: number;
      altText?: string;
      isActive: boolean;
      imageFile?: File | null;
      imageUrl?: string;
    }) => {
      const { id, imageFile: file, imageUrl: currentImageUrl, ...fields } = payload;
      let image = currentImageUrl;
      if (file) {
        if (!isCloudinaryConfigured()) {
          throw new Error(
            'Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env',
          );
        }
        image = await uploadPosterImage(file);
      }
      if (!image) {
        throw new Error('Poster image is required.');
      }

      const body = {
        imageUrl: image,
        productId: fields.productId,
        altText: fields.altText?.trim() || undefined,
        isActive: fields.isActive,
      };

      if (id) {
        await api.patch(`/admin/posters/${id}`, body);
      } else {
        await api.post('/admin/posters', body);
      }
    },
    onSuccess: () => {
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-posters'] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const message = err.response?.data?.message;
      setFormError(
        Array.isArray(message) ? message.join(', ') : message || err.message || 'Failed to save poster.',
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive: active }: { id: number; isActive: boolean }) => {
      await api.patch(`/admin/posters/${id}`, { isActive: active });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-posters'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/posters/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-posters'] }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      await api.patch('/admin/posters/reorder', { orderedIds });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-posters'] }),
  });

  const atPosterLimit = posters.length >= MAX_POSTERS;

  const openAddModal = () => {
    setEditingPoster(null);
    setSelectedProductId('');
    setAltText('');
    setIsActive(true);
    setImageFile(null);
    setImageUrl('');
    setImagePreview(null);
    setProductSearch('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (poster: PosterRecord) => {
    setEditingPoster(poster);
    setSelectedProductId(poster.productId);
    setAltText(poster.altText ?? '');
    setIsActive(poster.isActive);
    setImageFile(null);
    const cloudinaryImage = isCloudinaryUrl(poster.imageUrl) ? poster.imageUrl : '';
    setImageUrl(cloudinaryImage);
    setImagePreview(cloudinaryImage || null);
    setProductSearch(poster.product?.name ?? '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/image\/*/)) {
      setFormError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFormError('Image must be 2MB or smaller.');
      return;
    }
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedProductId) {
      setFormError('Please select a product to link this poster to.');
      return;
    }
    if (!imageFile && !imageUrl) {
      setFormError('Please upload a poster image.');
      return;
    }

    saveMutation.mutate({
      id: editingPoster?.id,
      productId: Number(selectedProductId),
      altText,
      isActive,
      imageFile,
      imageUrl,
    });
  };

  const movePoster = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= posters.length) return;
    const orderedIds = posters.map((p) => p.id);
    const [moved] = orderedIds.splice(index, 1);
    orderedIds.splice(nextIndex, 0, moved);
    reorderMutation.mutate(orderedIds);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home Posters"
        subtitle="Upload promo posters for the storefront ticker (max 8). Each poster links to a product."
      >
        <button
          onClick={openAddModal}
          disabled={atPosterLimit}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} />
          Add poster
        </button>
      </PageHeader>

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          Slots used: <strong className="text-foreground">{posters.length}</strong> / {MAX_POSTERS}
        </span>
        {!isCloudinaryConfigured() && (
          <span className="text-amber-400 text-xs font-medium">Cloudinary not configured</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load posters.
        </div>
      ) : posters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-16 text-center">
          <ImagePlus className="mx-auto mb-3 text-muted-foreground" size={28} />
          <p className="text-sm text-muted-foreground">No posters yet. Add up to {MAX_POSTERS} promo images.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {posters.map((poster, index) => (
            <div
              key={poster.id}
              className="overflow-hidden rounded-2xl border border-border bg-card/40"
            >
              <div className="relative aspect-[16/7] bg-muted/30">
                <img
                  src={getProductImageSrc(poster.imageUrl, poster.imageUrl)}
                  alt={poster.altText ?? poster.product?.name ?? 'Poster'}
                  className="h-full w-full object-cover"
                />
                {!poster.isActive && (
                  <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Hidden
                  </span>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {poster.product?.name ?? `Product #${poster.productId}`}
                  </p>
                  {poster.altText && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{poster.altText}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleMutation.mutate({ id: poster.id, isActive: !poster.isActive })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      poster.isActive
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-border bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    {poster.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => openEditModal(poster)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => movePoster(index, -1)}
                    disabled={index === 0 || reorderMutation.isPending}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    title="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => movePoster(index, 1)}
                    disabled={index === posters.length - 1 || reorderMutation.isPending}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    title="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this poster?')) {
                        deleteMutation.mutate(poster.id);
                      }
                    }}
                    className="ml-auto rounded-lg border border-red-500/20 p-1.5 text-red-400 hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
            <h2 className="font-display text-lg font-bold text-foreground">
              {editingPoster ? 'Edit poster' : 'Add poster'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Poster image *
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 hover:bg-muted/30">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg object-contain" />
                  ) : (
                    <>
                      <ImagePlus className="mb-2 text-muted-foreground" size={24} />
                      <span className="text-xs text-muted-foreground">PNG, JPG, WEBP — max 2MB</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Linked product *
                </label>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full rounded-xl border border-border bg-muted/20 py-2.5 pl-10 pr-3 text-sm text-foreground"
                  />
                </div>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm text-foreground"
                  required
                >
                  <option value="">Select a product</option>
                  {productOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Alt text (optional)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Short description for accessibility"
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm text-foreground"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border"
                />
                Show on storefront
              </label>

              {formError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Posters;
