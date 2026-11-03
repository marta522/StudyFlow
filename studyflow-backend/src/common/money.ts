export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(amountInCents: number): number {
  return amountInCents / 100;
}

export function lessonCostInCents(
  hourlyRateInCents: number,
  durationMinutes: number,
): number {
  return Math.round((hourlyRateInCents * durationMinutes) / 60);
}
