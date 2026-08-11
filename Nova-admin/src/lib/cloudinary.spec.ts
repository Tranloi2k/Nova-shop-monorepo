import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isCloudinaryConfigured, isCloudinaryUrl, uploadProductImage } from './cloudinary';

describe('cloudinary', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'demo');
    vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'nova_products');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('detects when Cloudinary env vars are set', () => {
    expect(isCloudinaryConfigured()).toBe(true);
  });

  it('throws when Cloudinary is not configured', async () => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', '');
    const file = new File(['x'], 'test.png', { type: 'image/png' });

    await expect(uploadProductImage(file)).rejects.toThrow('Cloudinary is not configured');
  });

  it('detects Cloudinary URLs', () => {
    expect(isCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/v1/test.png')).toBe(true);
    expect(isCloudinaryUrl('http://localhost:5000/uploads/old.jpg')).toBe(false);
  });

  it('uploads a file and returns secure_url', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/nova/products/test.png' }),
    } as Response);

    const file = new File(['x'], 'test.png', { type: 'image/png' });
    const url = await uploadProductImage(file);

    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/v1/nova/products/test.png');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/demo/image/upload',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
