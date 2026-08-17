// Usage-based billing engine.
//
// Housekeeping is billed by verified time on-site, never a flat clean rate;
// linen is billed by what a job actually used. All timestamps this module
// consumes must already be server-set (see jobs API routes) — client clocks
// are never trusted for billing.

export type LinenLine = { quantity: number; unitCost: number };

export function computeHours(arrivalAt: Date, departureAt: Date): number {
  const ms = departureAt.getTime() - arrivalAt.getTime();
  const hours = ms / 1000 / 60 / 60;
  return Math.max(0, Math.round(hours * 100) / 100);
}

export function computeLaborCost(hours: number, hourlyRate: number): number {
  return Math.round(hours * hourlyRate * 100) / 100;
}

export function computeLinenCost(lines: LinenLine[]): number {
  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
  return Math.round(total * 100) / 100;
}

export function computeJobTotals(params: {
  arrivalAt: Date;
  departureAt: Date;
  hourlyRate: number;
  linen: LinenLine[];
}) {
  const computedHours = computeHours(params.arrivalAt, params.departureAt);
  const laborCost = computeLaborCost(computedHours, params.hourlyRate);
  const linenCost = computeLinenCost(params.linen);
  const totalCost = Math.round((laborCost + linenCost) * 100) / 100;
  return { computedHours, laborCost, linenCost, totalCost };
}

export const LINEN_UNIT_COST: Record<"QUEEN" | "SINGLE" | "BATH", number> = {
  QUEEN: 9.2,
  SINGLE: 5.4,
  BATH: 3.15,
};
