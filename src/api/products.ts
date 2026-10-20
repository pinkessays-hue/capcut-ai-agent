import { api } from './client';
import type { Product, ApiResponse } from '../types';

function mapProduct(p: Record<string, unknown>): Product {
  return {
    id: p.id as string,
    name: p.name as string,
    description: p.description as string || '',
    price: p.price as number || 0,
    commissionRate: (p.commission_rate ?? p.commissionRate) as number || 0,
    imageUrl: p.image_url as string || undefined,
    infoReady: !!(p.info_ready ?? p.infoReady),
    saleStatus: (p.sale_status ?? p.saleStatus ?? 'preparing') as Product['saleStatus'],
    createdAt: (p.created_at ?? p.createdAt) as string || '',
  };
}

export async function getProducts(): Promise<ApiResponse<Product[]>> {
  const raw = await api.get<{ ok: boolean; data: Array<Record<string, unknown>> }>('/products');
  return { ok: true, data: (raw.data || []).map(mapProduct) };
}

export async function getProduct(id: string): Promise<ApiResponse<Product>> {
  const raw = await api.get<{ ok: boolean; data: Record<string, unknown> }>(`/products/${id}`);
  return { ok: true, data: mapProduct(raw.data) };
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
  const raw = await api.put<{ ok: boolean; data: Record<string, unknown> }>(`/products/${id}`, data);
  return { ok: true, data: mapProduct(raw.data) };
}
