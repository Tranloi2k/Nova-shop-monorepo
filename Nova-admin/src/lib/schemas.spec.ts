import { describe, it, expect } from 'vitest';
import { loginSchema, productSchema } from './schemas';

describe('Zod Schema Validations', () => {
  describe('loginSchema', () => {
    it('should pass with valid email and password', () => {
      const data = { email: 'admin@novashop.com', password: 'admin123' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid email', () => {
      const data = { email: 'invalid-email', password: 'admin123' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address');
      }
    });

    it('should fail with too short password', () => {
      const data = { email: 'admin@novashop.com', password: '123' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 6 characters');
      }
    });
  });

  describe('productSchema', () => {
    it('should pass with valid product data', () => {
      const data = {
        name: 'iPhone 15',
        description: 'Latest model',
        price: 999,
        stock: 50,
      };
      const result = productSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail with negative price', () => {
      const data = {
        name: 'iPhone 15',
        description: 'Latest model',
        price: -10,
        stock: 50,
      };
      const result = productSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Price must be greater than 0');
      }
    });

    it('should fail with negative stock', () => {
      const data = {
        name: 'iPhone 15',
        description: 'Latest model',
        price: 999,
        stock: -1,
      };
      const result = productSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Stock cannot be negative');
      }
    });
  });
});
