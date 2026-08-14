/**
 * Centralised order money math: shipping fee + tax on top of the (already
 * discounted) subtotal. Rates are read from env so they can be tuned per
 * deployment without code changes. All rates default to 0 / disabled, so an
 * existing install behaves exactly as before until configured.
 *
 *   TAX_RATE                 e.g. 0.08  (8% applied to subtotal)
 *   SHIPPING_FLAT_FEE        e.g. 5     (flat shipping charge)
 *   FREE_SHIPPING_THRESHOLD  e.g. 100   (subtotal >= threshold ships free; 0 = off)
 */
export interface OrderCharges {
  subtotal: number;
  shippingFee: number;
  taxAmount: number;
  total: number;
}

export interface OrderChargeOptions {
  taxRate?: number;
  shippingFlatFee?: number;
  freeShippingThreshold?: number;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const envNum = (key: string): number => {
  const raw = process.env[key];
  const n = raw !== undefined ? Number(raw) : Number.NaN;
  return Number.isFinite(n) ? n : 0;
};

export function computeOrderCharges(
  subtotal: number,
  opts: OrderChargeOptions = {},
): OrderCharges {
  const taxRate = opts.taxRate ?? envNum('TAX_RATE');
  const shippingFlatFee = opts.shippingFlatFee ?? envNum('SHIPPING_FLAT_FEE');
  const freeShippingThreshold = opts.freeShippingThreshold ?? envNum('FREE_SHIPPING_THRESHOLD');

  const sub = round2(Math.max(0, subtotal));
  const shippingFee =
    freeShippingThreshold > 0 && sub >= freeShippingThreshold
      ? 0
      : round2(Math.max(0, shippingFlatFee));
  const taxAmount = round2(sub * Math.max(0, taxRate));
  const total = round2(sub + shippingFee + taxAmount);

  return { subtotal: sub, shippingFee, taxAmount, total };
}
