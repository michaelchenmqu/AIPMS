import { format, formatDistanceToNow } from "date-fns";

/** Request-scoped "now", for server components computing things like
 *  occupancy over a trailing window. A named wrapper (rather than a bare
 *  `Date.now()` in component bodies) keeps the intent explicit — this is
 *  the server's clock at request time, read once per render. */
export function nowMs(): number {
  return Date.now();
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export function formatMoneyCents(amount: number): string {
  return amount.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 });
}

export function formatDateTime(date: Date): string {
  return format(date, "d MMM yyyy, h:mm a");
}

export function formatDate(date: Date): string {
  return format(date, "d MMM yyyy");
}

export function timeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}
