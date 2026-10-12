import type { DesignTokens } from "@g-stock/types";

export function tokensToCssVariablesString(tokens: DesignTokens): string {
  return Object.entries(tokens)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");
}

export function formatCurrencyAmount(
  amount: number | string,
  currency = "EUR",
  locale = "fr-FR"
): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(num)) return `0,00 ${currency}`;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currency}`;
  }
}

export function formatQuantity(quantity: number | string, locale = "fr-FR", maxDecimals = 2): string {
  const num = typeof quantity === "string" ? Number(quantity) : quantity;
  if (Number.isNaN(num)) return "0";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(num);
}
