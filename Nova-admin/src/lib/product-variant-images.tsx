import { Upload, X, Plus } from 'lucide-react';
import { isCloudinaryUrl } from './cloudinary';

export type VariantImageSlot = {
  id: string;
  label: string;
  url: string;
  file: File | null;
  preview: string | null;
};

export function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function serializeVariantImages(slots: VariantImageSlot[]): string {
  return slots
    .map((slot) => slot.url.trim())
    .filter(Boolean)
    .join(',');
}

export function buildVariantSlotsFromProduct(colors: string, images: string): VariantImageSlot[] {
  const colorList = parseCsv(colors);
  const imageList = parseCsv(images || '').map((url) => (isCloudinaryUrl(url) ? url : ''));

  if (colorList.length === 0 && imageList.length === 0) {
    return [];
  }

  const slotCount = Math.max(colorList.length, imageList.length, colorList.length > 0 ? colorList.length : 0);

  return Array.from({ length: slotCount }, (_, index) => {
    const url = imageList[index] || '';
    return {
      id: `variant-${index}-${url || 'empty'}`,
      label: colorList[index] || `Gallery ${index + 1}`,
      url,
      file: null,
      preview: url || null,
    };
  });
}

export function syncVariantSlotsWithColors(
  colors: string,
  previous: VariantImageSlot[],
): VariantImageSlot[] {
  const colorList = parseCsv(colors);

  if (colorList.length === 0) {
    return previous;
  }

  const colorSlots = colorList.map((label, index) => {
    const existing = previous[index];
    return {
      id: existing?.id ?? crypto.randomUUID(),
      label,
      url: existing?.url ?? '',
      file: existing?.file ?? null,
      preview: existing?.preview ?? existing?.url ?? null,
    };
  });

  const extraSlots = previous.slice(colorList.length).filter((slot) => slot.url || slot.file || slot.preview);
  return [...colorSlots, ...extraSlots];
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

type VariantImageUploadsProps = {
  colors: string;
  slots: VariantImageSlot[];
  onChange: (slots: VariantImageSlot[]) => void;
  disabled?: boolean;
};

export function VariantImageUploads({
  colors,
  slots,
  onChange,
  disabled = false,
}: VariantImageUploadsProps) {
  const colorList = parseCsv(colors);

  const updateSlot = (id: string, patch: Partial<VariantImageSlot>) => {
    onChange(slots.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)));
  };

  const removeSlot = (id: string) => {
    onChange(slots.filter((slot) => slot.id !== id));
  };

  const addGallerySlot = () => {
    onChange([
      ...slots,
      {
        id: crypto.randomUUID(),
        label: `Gallery ${slots.length + 1}`,
        url: '',
        file: null,
        preview: null,
      },
    ]);
  };

  const handleFileChange = (id: string, file: File | null) => {
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;

    if (slot.preview?.startsWith('blob:')) {
      URL.revokeObjectURL(slot.preview);
    }

    if (!file) {
      updateSlot(id, { file: null, preview: slot.url || null });
      return;
    }

    updateSlot(id, {
      file,
      preview: URL.createObjectURL(file),
    });
  };

  const clearSlotImage = (id: string) => {
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;

    if (slot.preview?.startsWith('blob:')) {
      URL.revokeObjectURL(slot.preview);
    }

    updateSlot(id, { file: null, url: '', preview: null });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Variant / Gallery Images
        </label>
        <button
          type="button"
          onClick={addGallerySlot}
          disabled={disabled}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-indigo-400 disabled:opacity-50 cursor-pointer"
        >
          <Plus size={14} />
          Add image
        </button>
      </div>

      {colorList.length > 0 && (
        <p className="text-xs text-muted-foreground">
          One image per color variant (order matches Colors field). Extra rows are gallery-only.
        </p>
      )}

      {slots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
          {colorList.length > 0
            ? 'Upload an image for each color variant below, or use Add image for gallery photos.'
            : 'Add colors above for per-variant images, or click Add image for a product gallery.'}
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  {isHexColor(slot.label) && (
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-border"
                      style={{ background: slot.label }}
                      aria-hidden
                    />
                  )}
                  <span className="truncate text-xs font-semibold text-foreground">{slot.label}</span>
                </div>
                {slot.url && isCloudinaryUrl(slot.url) && !slot.file && (
                  <span className="truncate text-[10px] text-muted-foreground">{slot.url}</span>
                )}
              </div>

              {slot.preview ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                  <img src={slot.preview} alt={slot.label} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => clearSlotImage(slot.id)}
                    disabled={disabled}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition-opacity hover:opacity-100 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                  <Upload size={16} />
                  <span className="mt-1 text-[9px] font-semibold uppercase">Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    disabled={disabled}
                    onChange={(e) => handleFileChange(slot.id, e.target.files?.[0] ?? null)}
                  />
                </label>
              )}

              {!colorList.includes(slot.label) && (
                <button
                  type="button"
                  onClick={() => removeSlot(slot.id)}
                  disabled={disabled}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                  title="Remove slot"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export async function resolveVariantImageUrls(
  slots: VariantImageSlot[],
  upload: (file: File) => Promise<string>,
): Promise<VariantImageSlot[]> {
  return Promise.all(
    slots.map(async (slot) => {
      if (slot.file) {
        const url = await upload(slot.file);
        return { ...slot, url, file: null, preview: url };
      }
      return slot;
    }),
  );
}
