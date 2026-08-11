const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1';
export const CLOUDINARY_IMAGE_URL_PATTERN = /^https:\/\/res\.cloudinary\.com\/.+/i;

export function isCloudinaryUrl(url: string | null | undefined): boolean {
  return Boolean(url && CLOUDINARY_IMAGE_URL_PATTERN.test(url));
}

export function getProductImageSrc(url: string | null | undefined, fallback = 'https://placehold.co/100x100?text=No+Image'): string {
  return isCloudinaryUrl(url) ? url! : fallback;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME &&
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  );
}

export async function uploadProductImage(file: File): Promise<string> {
  return uploadCloudinaryImage(file, 'nova/products');
}

export async function uploadPosterImage(file: File): Promise<string> {
  return uploadCloudinaryImage(file, 'nova/posters');
}

async function uploadCloudinaryImage(file: File, folder: string): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env',
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  const response = await fetch(`${CLOUDINARY_UPLOAD_URL}/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      (errorBody as { error?: { message?: string } } | null)?.error?.message ??
      `Cloudinary upload failed (${response.status})`;
    throw new Error(message);
  }

  const data = (await response.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error('Cloudinary did not return a secure_url');
  }

  return data.secure_url;
}
