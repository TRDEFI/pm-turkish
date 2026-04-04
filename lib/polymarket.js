/**
 * Polymarket-specific formatting utilities
 */

/**
 * Format a USD amount (simple wrapper)
 */
export function formatUSD(amount) {
  if (amount == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
