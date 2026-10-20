import { api } from './client';
import type { Order, OrderStatus, ApiResponse, ChannelType } from '../types';

function mapOrder(o: Record<string, unknown>): Order {
  return {
    id: o.id as string,
    linkId: (o.link_id ?? o.linkId) as string,
    creatorId: (o.creator_id ?? o.creatorId) as string,
    productId: (o.product_id ?? o.productId) as string,
    channel: (o.channel || 'direct') as ChannelType,
    contentTitle: (o.content_title ?? o.contentTitle) as string || '',
    amount: (o.amount ?? 0) as number,
    commission: (o.commission ?? 0) as number,
    status: (o.order_status ?? o.status ?? 'payment_pending') as OrderStatus,
    orderedAt: (o.created_at ?? o.orderedAt) as string || '',
    cafe24OrderId: (o.cafe24_order_id ?? o.cafe24OrderId) as string | undefined,
  };
}

export async function getMyOrders(): Promise<ApiResponse<Order[]>> {
  const raw = await api.get<{ ok: boolean; data: Array<Record<string, unknown>> }>('/orders/mine');
  return { ok: true, data: (raw.data || []).map(mapOrder) };
}

export async function getAllOrders(): Promise<ApiResponse<Order[]>> {
  const raw = await api.get<{ ok: boolean; data: Array<Record<string, unknown>> }>('/orders');
  return { ok: true, data: (raw.data || []).map(mapOrder) };
}

export async function updateOrderStatus(id: string, status: OrderStatus, reason?: string): Promise<ApiResponse<Order>> {
  const raw = await api.patch<{ ok: boolean; data: Record<string, unknown> }>(`/orders/${id}/status`, { status, reason });
  return { ok: true, data: mapOrder(raw.data) };
}

export async function createTestOrder(linkId: string): Promise<ApiResponse<Order>> {
  const raw = await api.post<{ ok: boolean; data: Record<string, unknown> }>('/orders/test', { linkId });
  return { ok: true, data: mapOrder(raw.data) };
}
