import { api } from './client';
import type { Creator, CreatorStatus, ApiResponse, ChannelType } from '../types';

function mapCreator(c: Record<string, unknown>): Creator {
  const channels = c.channels as ChannelType[] | string | undefined;
  let parsedChannels: ChannelType[] = [];
  if (Array.isArray(channels)) parsedChannels = channels;
  else if (typeof channels === 'string') {
    try { parsedChannels = JSON.parse(channels); } catch { parsedChannels = []; }
  }

  return {
    id: c.id as string,
    userId: (c.user_id ?? c.userId ?? '') as string,
    name: c.name as string,
    email: c.email as string,
    phone: (c.phone ?? '') as string,
    category: (c.category ?? '') as string,
    channels: parsedChannels,
    channelOther: (c.channel_other ?? c.channelOther) as string | undefined,
    status: (c.status ?? 'active') as CreatorStatus,
    createdAt: (c.created_at ?? c.createdAt ?? '') as string,
  };
}

export async function getMyProfile(): Promise<ApiResponse<Creator>> {
  const raw = await api.get<{ ok: boolean; data: Record<string, unknown>; creator: Record<string, unknown> | null }>('/auth/me');
  if (raw.creator) {
    return { ok: true, data: mapCreator(raw.creator) };
  }
  return { ok: false, error: '크리에이터 정보를 찾을 수 없습니다.' };
}

export async function updateMyProfile(data: Partial<Creator>): Promise<ApiResponse<Creator>> {
  const raw = await api.put<{ ok: boolean; data: Record<string, unknown> }>('/creators/me', {
    display_name: data.name,
    phone: data.phone,
    category: data.category,
    channels: data.channels,
  });
  if (raw.data) return { ok: true, data: mapCreator(raw.data) };
  return { ok: true };
}

export async function getAllCreators(): Promise<ApiResponse<Creator[]>> {
  const raw = await api.get<{ ok: boolean; data: Array<Record<string, unknown>> }>('/creators');
  return { ok: true, data: (raw.data || []).map(mapCreator) };
}

export async function updateCreatorStatus(id: string, status: CreatorStatus, reason?: string): Promise<ApiResponse<Creator>> {
  const raw = await api.patch<{ ok: boolean; data: Record<string, unknown> }>(`/creators/${id}/status`, { status, reason });
  if (raw.data) return { ok: true, data: mapCreator(raw.data) };
  return { ok: true };
}
