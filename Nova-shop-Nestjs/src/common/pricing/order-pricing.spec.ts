import { computeOrderCharges } from './order-pricing';

describe('computeOrderCharges', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('calculates configured shipping, tax, and currency rounding', () => {
    expect(
      computeOrderCharges(10.005, {
        taxRate: 0.08,
        shippingFlatFee: 5,
        freeShippingThreshold: 100,
      }),
    ).toEqual({ subtotal: 10.01, shippingFee: 5, taxAmount: 0.8, total: 15.81 });
  });

  it('applies free shipping at the threshold and clamps negative values', () => {
    expect(
      computeOrderCharges(100, {
        taxRate: -1,
        shippingFlatFee: -5,
        freeShippingThreshold: 100,
      }),
    ).toEqual({ subtotal: 100, shippingFee: 0, taxAmount: 0, total: 100 });
    expect(computeOrderCharges(-20, { taxRate: 0.1, shippingFlatFee: 0 })).toEqual({
      subtotal: 0,
      shippingFee: 0,
      taxAmount: 0,
      total: 0,
    });
  });

  it('reads valid environment defaults and ignores invalid values', () => {
    process.env = {
      ...originalEnv,
      TAX_RATE: '0.1',
      SHIPPING_FLAT_FEE: 'invalid',
      FREE_SHIPPING_THRESHOLD: '0',
    };

    expect(computeOrderCharges(20)).toEqual({
      subtotal: 20,
      shippingFee: 0,
      taxAmount: 2,
      total: 22,
    });
  });
});
