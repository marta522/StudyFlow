import { fromCents, lessonCostInCents, toCents } from './money';

describe('monetary values', () => {
  it('converts amounts to integer groszy and formats only at the API boundary', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(fromCents(1999)).toBe(19.99);
  });

  it('rounds each lesson charge to a whole grosz before aggregation', () => {
    const halfHourCharge = lessonCostInCents(199, 30);
    expect(halfHourCharge).toBe(100);
    expect(Array.from({ length: 10_000 }, () => halfHourCharge).reduce(
      (total, amount) => total + amount,
      0,
    )).toBe(1_000_000);
  });
});
