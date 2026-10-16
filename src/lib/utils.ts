import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with conflict resolution.
 * Combines clsx (conditional classes) with tailwind-merge (dedup).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupee (INR) currency.
 * Follows Indian numbering system (e.g., ₹1,25,000 or ₹48,500.00).
 */
export function formatCurrency(amount: number, forceDecimals = false): string {
  const hasDecimals = amount % 1 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: forceDecimals || hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const formatRupees = formatCurrency;

/**
 * Format a date string to Indian-friendly format (e.g., "15 Oct 2026").
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
