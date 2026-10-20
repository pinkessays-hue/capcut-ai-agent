import { api } from './client';
import type { IntegrationStatus, ApiResponse } from '../types';

interface DashboardStats {
  totalCreators: number;
  activeCreators: number;
  totalLinks: number;
  totalClicks: number;
  totalOrders: number;
  totalSales: number;
  totalCommission: number;
  pendingSettlement: number;
}

function mapStats(d: Record<string, unknown>): DashboardStats {
  return {
    totalCreators: (d.totalCreators ?? d.total_creators ?? 0) as number,
    activeCreators: (d.activeCreators ?? d.active_creators ?? 0) as number,
    totalLinks: (d.totalLinks ?? d.total_links ?? 0) as number,
    totalClicks: (d.totalClicks ?? d.total_clicks ?? 0) as number,
    totalOrders: (d.totalOrders ?? d.total_orders ?? 0) as number,
    totalSales: (d.totalSales ?? d.total_sales ?? 0) as number,
    totalCommission: (d.totalCommission ?? d.total_commission ?? 0) as number,
    pendingSettlement: (d.pendingSettlement ?? d.pending_settlement ?? 0) as number,
  };
}

export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  const raw = await api.get<{ ok: boolean; data: Record<string, unknown> }>('/admin/dashboard');
  return { ok: true, data: mapStats(raw.data || {}) };
}

export async function getIntegrationStatus(): Promise<ApiResponse<IntegrationStatus>> {
  try {
    const raw = await api.get<{ ok: boolean; data: Record<string, unknown> }>('/admin/integrations');
    const d = raw.data || {};
    const cafe24 = (d.cafe24 || {}) as Record<string, unknown>;
    const payout = (d.payout || {}) as Record<string, unknown>;
    return {
      ok: true,
      data: {
        cafe24: {
          connected: (cafe24.connected ?? false) as boolean,
          mallId: cafe24.mallId as string | undefined,
          lastSync: cafe24.lastSync as string | undefined,
        },
        payout: {
          configured: (payout.configured ?? false) as boolean,
          provider: payout.provider as string | undefined,
        },
      },
    };
  } catch {
    return {
      ok: true,
      data: {
        cafe24: { connected: false },
        payout: { configured: false },
      },
    };
  }
}

export async function updateCafe24Config(config: { mallId: string; clientId: string; clientSecret: string }): Promise<ApiResponse> {
  return api.post<ApiResponse>('/integrations/cafe24/oauth', config);
}

export async function syncCafe24Orders(): Promise<ApiResponse<{ synced: number }>> {
  const raw = await api.post<{ ok: boolean; data: { synced: number } }>('/integrations/cafe24/sync');
  return { ok: true, data: raw.data };
}

export async function resetTestData(): Promise<ApiResponse> {
  return api.post<ApiResponse>('/admin/reset-test-data');
}

export async function getTestMode(): Promise<ApiResponse<{ testMode: boolean }>> {
  const raw = await api.get<{ ok: boolean; data: { testMode: boolean } }>('/admin/test-mode');
  return { ok: true, data: raw.data };
}

// ── Analytics ──

export interface AnalyticsSummary {
  totalOrders: number;
  totalSales: number;
  confirmedSales: number;
  cancelledAmount: number;
  refundedAmount: number;
  totalCommission: number;
  attributedOrders: number;
  unattributedOrders: number;
}

export interface DailyData {
  date: string;
  orders: number;
  sales: number;
  cancels: number;
  cancelAmount: number;
}

export interface ProductData {
  productId: string;
  productName: string;
  orders: number;
  sales: number;
  quantity: number;
  cancels: number;
  cancelAmount: number;
}

export interface CreatorData {
  creatorId: string;
  creatorName: string;
  orders: number;
  sales: number;
  commission: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  daily: DailyData[];
  byProduct: ProductData[];
  byCreator: CreatorData[];
  cafe24Status: {
    connected: boolean;
    lastSync: string | null;
    totalSyncedOrders: number;
  };
}

export async function getAnalytics(startDate: string, endDate: string): Promise<ApiResponse<AnalyticsData>> {
  const raw = await api.get<{ ok: boolean; data: AnalyticsData }>(`/admin/analytics?startDate=${startDate}&endDate=${endDate}`);
  return { ok: true, data: raw.data };
}
