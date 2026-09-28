export function toPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
