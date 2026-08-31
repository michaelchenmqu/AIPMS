// Basiq client — Australian open-banking aggregator, used to pull real bank
// transactions into the trust-account three-way reconciliation
// (bank balance vs. ledger balance vs. sum of owner balances — see
// src/app/portal/trust/page.tsx). During development this points at
// Basiq's sandbox, which offers fake test institutions/accounts so the
// integration code path matches what a real live bank feed would use
// later, without touching a real account.
//
// Gated behind BASIQ_API_KEY, same fallback shape as lib/ai.ts: without a
// key, the "Connect trust bank account" button doesn't appear and the
// trust page just shows the ledger, exactly as it did before this file
// existed.
//
// NOTE ON ACCURACY: written against Basiq's documented Connect flow
// (server token -> per-connection Basiq user -> hosted consent redirect
// -> poll for accounts/transactions). Not yet exercised against a real
// Basiq account — there isn't one yet. Confirm exact field/endpoint names
// against docs.basiq.io during the first real sandbox connection.

import { prisma } from "@/lib/prisma";

const API_BASE = "https://au-api.basiq.io";

export function isBasiqConfigured(): boolean {
  return Boolean(process.env.BASIQ_API_KEY);
}

// The dashboard hands out this key already base64-encoded (a
// clientId:clientSecret pair) — use it directly as the Basic auth value,
// don't re-encode it.
async function getServerToken(): Promise<string> {
  const apiKey = process.env.BASIQ_API_KEY;
  if (!apiKey) throw new Error("BASIQ_API_KEY is not set");

  const res = await fetch(`${API_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "basiq-version": "3.0",
    },
    body: new URLSearchParams({ scope: "SERVER_ACCESS" }),
  });
  if (!res.ok) throw new Error(`Basiq token error (${res.status}): ${await res.text()}`);
  const body = await res.json();
  return body.access_token as string;
}

/** Creates the Basiq user representing the agency's trust account and
 *  stores a PENDING BankConnection row for it. Called once, the first
 *  time staff click "Connect trust bank account" — see
 *  src/app/portal/trust/actions.ts. */
export async function createTrustBankUser(): Promise<{ connectionId: string; basiqUserId: string }> {
  const token = await getServerToken();
  // Basiq requires an email or mobile to create a user. This represents
  // the agency's trust account, not an individual, so there's no real
  // email to use — a unique placeholder is fine, Basiq never sends it
  // anything, it's just an identifier.
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "basiq-version": "3.0",
    },
    body: JSON.stringify({ email: `trust-${Date.now()}@aipms.local` }),
  });
  if (!res.ok) throw new Error(`Basiq create user error (${res.status}): ${await res.text()}`);
  const body = await res.json();
  const basiqUserId = body.id as string;

  const connection = await prisma.bankConnection.create({
    data: { basiqUserId, status: "PENDING" },
  });
  return { connectionId: connection.id, basiqUserId };
}

/** Generates the hosted Basiq Connect URL to redirect staff to, so they
 *  can pick a (sandbox, for now) institution and authorize access. Basiq
 *  handles the actual bank-login UI — we never see credentials. */
export async function getConnectUrl(basiqUserId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${process.env.BASIQ_API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "basiq-version": "3.0",
    },
    body: new URLSearchParams({ scope: "CLIENT_ACCESS", userId: basiqUserId }),
  });
  if (!res.ok) throw new Error(`Basiq client token error (${res.status}): ${await res.text()}`);
  const body = await res.json();
  return `https://consent.basiq.io/home?token=${body.access_token}`;
}

/** Pulls the latest transactions for a connection from Basiq and upserts
 *  them, idempotent on basiqTransactionId — safe to call repeatedly from
 *  the "Sync transactions" button. Newly-synced rows start unmatched;
 *  reconciling them against the trust ledger is a separate, manual step
 *  (see the trust page's auto-match heuristic). */
export async function syncTransactions(connectionId: string): Promise<{ synced: number }> {
  const connection = await prisma.bankConnection.findUniqueOrThrow({ where: { id: connectionId } });
  const token = await getServerToken();

  const res = await fetch(`${API_BASE}/users/${connection.basiqUserId}/transactions`, {
    headers: { Authorization: `Bearer ${token}`, "basiq-version": "3.0" },
  });
  if (!res.ok) throw new Error(`Basiq transactions error (${res.status}): ${await res.text()}`);
  const body = await res.json();
  const transactions = (body.data ?? []) as {
    id: string;
    postDate: string;
    description: string;
    amount: string;
  }[];

  for (const tx of transactions) {
    await prisma.bankTransaction.upsert({
      where: { basiqTransactionId: tx.id },
      create: {
        connectionId,
        basiqTransactionId: tx.id,
        date: new Date(tx.postDate),
        description: tx.description,
        amount: parseFloat(tx.amount),
      },
      update: {},
    });
  }

  if (connection.status !== "ACTIVE") {
    await prisma.bankConnection.update({ where: { id: connectionId }, data: { status: "ACTIVE" } });
  }

  return { synced: transactions.length };
}
