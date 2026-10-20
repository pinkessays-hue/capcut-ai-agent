import { api } from './client';
import type { AffiliateLink, ApiResponse, ChannelType } from '../types';

export interface CreateLinkPayload {
  productId: string;
  channel: ChannelType;
  channelOther?: string;
  contentTitle: string;
}

function mapLink(l: Record<string, unknown>): AffiliateLink {
  return {
    id: l.id as string,
    creatorId: (l.creator_id ?? l.creatorId) as string,
    productId: (l.product_id ?? l.productId) as string,
    channel: (l.channel || 'direct') as ChannelType,
    channelOther: l.channelOther as string | undefined,
    contentTitle: (l.content_title ?? l.contentTitle) as string || '',
    linkCode: (l.code ?? l.linkCode) as string,
    clicks: (l.clicks ?? 0) as number,
    commissionRateAtCreation: (l.commission_rate ?? l.commissionRateAtCreation ?? 0) as number,
    active: l.active !== false && l.active !== 0,
    createdAt: (l.created_at ?? l.createdAt) as string || '',
  };
}

export async function getMyLinks(): Promise<ApiResponse<AffiliateLink[]>> {
  const raw = await api.get<{ ok: boolean; data: Array<Record<string, unknown>> }>('/links/mine');
  return { ok: true, data: (raw.data || []).map(mapLink) };
}

export async function getAllLinks(): Promise<ApiResponse<AffiliateLink[]>> {
  const raw = await api.get<{ ok: boolean; data: Array<Record<string, unknown>> }>('/links');
  return { ok: true, data: (raw.data || []).map(mapLink) };
}

export async function createLink(payload: CreateLinkPayload): Promise<ApiResponse<AffiliateLink>> {
  const raw = await api.post<{ ok: boolean; data: Record<string, unknown> }>('/links', payload);
  return { ok: true, data: mapLink(raw.data) };
}

export async function toggleLinkActive(_id: string): Promise<ApiResponse<AffiliateLink>> {
  return { ok: false, error: '링크 활성/비활성 전환은 아직 지원되지 않습니다.' };
}

export async function simulateClick(id: string): Promise<ApiResponse> {
  return api.post<ApiResponse>(`/links/${id}/test-click`);
}

export async function simulateOrder(linkId: string): Promise<ApiResponse> {
  return api.post<ApiResponse>(`/links/${linkId}/test-order`);
}
