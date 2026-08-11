import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  serializeVariantImages,
  buildVariantSlotsFromProduct,
  syncVariantSlotsWithColors,
} from './product-variant-images';

describe('product-variant-images', () => {
  it('parses comma-separated values', () => {
    expect(parseCsv(' Black, #fff , Silver ')).toEqual(['Black', '#fff', 'Silver']);
  });

  it('serializes variant slots to comma-separated URLs', () => {
    expect(
      serializeVariantImages([
        { id: '1', label: 'Black', url: 'https://res.cloudinary.com/a/1.jpg', file: null, preview: null },
        { id: '2', label: 'White', url: '', file: null, preview: null },
        { id: '3', label: 'Silver', url: 'https://res.cloudinary.com/a/2.jpg', file: null, preview: null },
      ]),
    ).toBe('https://res.cloudinary.com/a/1.jpg,https://res.cloudinary.com/a/2.jpg');
  });

  it('builds slots aligned with colors and images', () => {
    const slots = buildVariantSlotsFromProduct(
      '#111,#222',
      'https://res.cloudinary.com/demo/a.jpg,https://res.cloudinary.com/demo/b.jpg',
    );
    expect(slots).toHaveLength(2);
    expect(slots[0].label).toBe('#111');
    expect(slots[0].url).toContain('a.jpg');
  });

  it('syncs slot count when colors change', () => {
    const synced = syncVariantSlotsWithColors('Red, Blue', [
      {
        id: 'a',
        label: 'Old',
        url: 'https://res.cloudinary.com/demo/keep.jpg',
        file: null,
        preview: 'https://res.cloudinary.com/demo/keep.jpg',
      },
    ]);
    expect(synced).toHaveLength(2);
    expect(synced[0].label).toBe('Red');
    expect(synced[0].url).toContain('keep.jpg');
    expect(synced[1].label).toBe('Blue');
  });
});
