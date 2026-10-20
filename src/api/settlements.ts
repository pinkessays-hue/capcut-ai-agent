import { api } from './client';
import type { Settlement, SettlementStatus, ApiResponse } from '../types';

function mapSettlement(s: Record<string, unknown>): Settlement {
  return {
    id: s.id as string,
    creatorId: (s.creator_id ?? s.creatorId) as string,
    amount: (s.amount ?? 0) as number,
    status: (s.status ?? 'pending') as SettlementStatus,
    bankName: s.bank_name as string | undefined,
    accountNumberMasked: s.account_number_masked as string | undefined,
    requestedAt: (s.created_at ?? s.requestedAt) as string || '',
    completedAt: (s.completed_at ?? s.completedAt) as string | undefined,
    failureReason: (s.error_message ?? s.failureReason) as string | undefined,
  };
}

export async function getMySettlements(): Promise<ApiResponse<Settlement[]>> {
  const raw = await api.get<{ ok: boolean; data: Array<Record<string, unknown>> }>('/settlements/mine');
  return { ok: true, data: (raw.data || []).map(mapSettlement) };
}

export async function getAllSettlements(): Promise<ApiResponse<Settlement[]>> {
  const raw = await api.get<{ ok: boolean; data: Array<Record<string, unknown>> }>('/settlements');
  return { ok: true, data: (raw.data || []).map(mapSettlement) };
}

export async function requestSettlement(): Promise<ApiResponse<Settlement>> {
  const raw = await api.post<{ ok: boolean; data: Record<string, unknown>; warning?: string }>('/settlements/request');
  return { ok: true, data: mapSettlement(raw.data), message: raw.warning };
}

export async function updateSettlementStatus(id: string, status: SettlementStatus): Promise<ApiResponse<Settlement>> {
  const raw = await api.patch<{ ok: boolean; data: Record<string, unknown> }>(`/settlements/${id}/status`, { status });
  return { ok: true, data: mapSettlement(raw.data) };
}
