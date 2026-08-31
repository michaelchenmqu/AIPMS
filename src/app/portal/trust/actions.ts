"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createTrustBankUser, getConnectUrl, syncTransactions } from "@/lib/basiq";

/** Staff action, "Connect trust bank account" on the Trust accounting page.
 *  Creates the Basiq user + a PENDING BankConnection, then redirects to
 *  Basiq's hosted consent flow — see lib/basiq.ts. A Basiq API failure
 *  here is a real, expected-in-early-testing scenario (wrong permission
 *  set, unverified account details, etc.) — report it instead of
 *  crashing the page. */
export async function connectTrustBank() {
  await requireRole("STAFF");
  let url: string;
  try {
    const { basiqUserId } = await createTrustBankUser();
    url = await getConnectUrl(basiqUserId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to connect trust bank account.";
    redirect(`/portal/trust?basiqError=${encodeURIComponent(message)}`);
  }
  redirect(url);
}

/** Simple auto-match: pairs an unmatched bank transaction with an
 *  unmatched ledger entry of the identical amount and the closest date,
 *  within 5 days. Real reconciliation software does fuzzier matching
 *  (partial amounts, split payments); this covers the common case of one
 *  ledger entry <-> one bank line, and leaves anything it can't match
 *  confidently for a human to sort out. */
async function autoMatch() {
  const [transactions, entries] = await Promise.all([
    prisma.bankTransaction.findMany({ where: { matchedLedgerEntryId: null } }),
    prisma.trustLedgerEntry.findMany({ where: { bankTransaction: null } }),
  ]);

  for (const tx of transactions) {
    const candidates = entries.filter(
      (e) =>
        Math.abs(e.amount - tx.amount) < 0.01 &&
        Math.abs(e.date.getTime() - tx.date.getTime()) <= 5 * 24 * 60 * 60 * 1000
    );
    if (candidates.length !== 1) continue; // ambiguous or no match — leave for manual review
    const match = candidates[0];
    await prisma.bankTransaction.update({ where: { id: tx.id }, data: { matchedLedgerEntryId: match.id } });
    entries.splice(entries.indexOf(match), 1); // don't reuse the same entry for another line
  }
}

export async function syncTrustBank(connectionId: string) {
  await requireRole("STAFF");
  await syncTransactions(connectionId);
  await autoMatch();
  revalidatePath("/portal/trust");
}

export async function unmatchTransaction(id: string) {
  await requireRole("STAFF");
  await prisma.bankTransaction.update({ where: { id }, data: { matchedLedgerEntryId: null } });
  revalidatePath("/portal/trust");
}

export async function matchTransaction(transactionId: string, formData: FormData) {
  await requireRole("STAFF");
  const ledgerEntryId = String(formData.get("ledgerEntryId") ?? "");
  if (!ledgerEntryId) return;
  await prisma.bankTransaction.update({ where: { id: transactionId }, data: { matchedLedgerEntryId: ledgerEntryId } });
  revalidatePath("/portal/trust");
}
