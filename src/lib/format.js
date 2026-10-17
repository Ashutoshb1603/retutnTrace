export const percent = (value) => `${((value || 0) * 100).toFixed(1)}%`;
export const money = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
export const shortDate = (value) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
export const number = (value) => new Intl.NumberFormat('en-US').format(value || 0);
