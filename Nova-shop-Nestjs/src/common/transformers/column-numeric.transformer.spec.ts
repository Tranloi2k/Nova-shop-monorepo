import { ColumnNumericTransformer } from './column-numeric.transformer';

describe('ColumnNumericTransformer', () => {
  it('passes values to the database unchanged', () => {
    expect(ColumnNumericTransformer.to(12.5)).toBe(12.5);
    expect(ColumnNumericTransformer.to(null)).toBeNull();
  });

  it('converts database decimals while preserving nullish values', () => {
    expect(ColumnNumericTransformer.from('12.50')).toBe(12.5);
    expect(ColumnNumericTransformer.from(null)).toBeNull();
    expect(ColumnNumericTransformer.from(undefined)).toBeUndefined();
  });
});
