// Single currency across the whole app: Nigerian Naira. Centralized so every
// screen formats amounts the same way instead of each hand-rolling `$${n}`.
export const CURRENCY_SYMBOL = '₦';

export function formatNaira(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-NG')}`;
}
