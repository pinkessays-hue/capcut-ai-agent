import { api } from './client';
import type { Product, ApiResponse } from '../types';

function mapProduct(p: Record<string, unknown>): Product {
  return {
    id: p.id as string,
    name: p.name as string,
    originalName: (p.original_name ?? p.originalName) as string || undefined,
    description: p.description as string || '',
    price: p.price as number || 0,
    commissionRate: (p.commission_rate ?? p.commissionRate) as number || 0,
    imageUrl: p.image_url as string || undefined,
    thumbnailUrl: (p.thumbnail_url ?? p.thumbnailUrl) as string || undefined,
    productUrl: (p.product_url ?? p.productUrl) as string || undefined,
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

export async function createProduct(data: Partial<Product>): Promise<ApiResponse<Product>> {
  const raw = await api.post<{ ok: boolean; data: Record<string, unknown> }>('/products', {
    name: data.name,
    original_name: data.originalName,
    description: data.description,
    price: data.price,
    commission_rate: data.commissionRate,
    sale_status: data.saleStatus,
    info_ready: data.infoReady,
    product_url: data.productUrl,
  });
  return { ok: true, data: mapProduct(raw.data) };
}

export async function uploadThumbnail(productId: string, file: File): Promise<ApiResponse<{ thumbnailUrl: string }>> {
  const form = new FormData();
  form.append('thumbnail', file);
  const token = (await import('./client')).getAccessToken();
  const res = await fetch(`/api/products/${productId}/thumbnail`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || '업로드 실패');
  return { ok: true, data: json.data };
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.originalName !== undefined) payload.original_name = data.originalName;
  if (data.description !== undefined) payload.description = data.description;
  if (data.price !== undefined) payload.price = data.price;
  if (data.commissionRate !== undefined) payload.commission_rate = data.commissionRate;
  if (data.saleStatus !== undefined) payload.sale_status = data.saleStatus;
  if (data.infoReady !== undefined) payload.info_ready = data.infoReady;
  if (data.productUrl !== undefined) payload.product_url = data.productUrl;
  const raw = await api.put<{ ok: boolean; data: Record<string, unknown> }>(`/products/${id}`, payload);
  return { ok: true, data: mapProduct(raw.data) };
}
