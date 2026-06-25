import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let _storeCurrency = 'MZN';

export function setStoreCurrency(currency: string) {
  _storeCurrency = currency;
}

export function formatCurrency(value: number, currency?: string): string {
  const cur = currency || _storeCurrency;
  const locale = cur === 'AOA' ? 'pt-AO' : cur === 'USD' ? 'en-US' : 'pt-MZ';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: cur,
    minimumFractionDigits: 2,
  }).format(value);
}

export function getErrorMessage(error: unknown, fallback = 'Erro desconhecido'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as Record<string, unknown>).message === 'string') return (error as Record<string, string>).message;
  return fallback;
}
