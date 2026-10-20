import { api } from './client';
import type { LedgerEntry, ApiResponse } from '../types';

interface WalletSummary {
  available: number;
  pending: number;
  totalEarned: number;
  totalSettled: number;
}

export async function getWalletSummary(): Promise<ApiResponse<WalletSummary>> {
  const raw = await api.get<{ ok: boolean; data: WalletSummary }>('/points/summary');
  return { ok: true, data: raw.data };
}

function mapEntry(e: Record<string, unknown>): LedgerEntry {
  return {
    id: e.id as string,
    creatorId: (e.creator_id ?? e.creatorId) as string,
    orderId: (e.order_id ?? e.orderId) as string | undefined,
    type: (e.entry_type ?? e.type) as LedgerEntry['type'],
    amount: (e.amount ?? 0) as number,
    balanceAfter: (e.balance_after ?? e.balanceAfter ?? 0) as number,
    description: (e.description ?? '') as string,
    createdAt: (e.created_at ?? e.createdAt) as string || '',
  };
}

export async function getLedger(): Promise<ApiResponse<LedgerEntry[]>> {
  const raw = await api.get<{ ok: boolean; data: Array<Record<string, unknown>> }>('/points/ledger');
  return { ok: true, data: (raw.data || []).map(mapEntry) };
}

export async function getCreatorWalletSummary(creatorId: string): Promise<ApiResponse<WalletSummary>> {
  const raw = await api.get<{ ok: boolean; data: WalletSummary }>(`/points/summary?creatorId=${creatorId}`);
  return { ok: true, data: raw.data };
}
