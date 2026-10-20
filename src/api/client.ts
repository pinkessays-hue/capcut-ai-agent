const BASE = '/api';

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (res.status === 401) {
    setAccessToken(null);
    onUnauthorized?.();
    throw new ApiError('인증이 만료되었습니다. 다시 로그인해주세요.', 401);
  }

  const json = await res.json().catch(() => ({ ok: false, error: 'Invalid response' }));

  if (!res.ok || json.ok === false) {
    throw new ApiError(json.error || json.message || `Request failed (${res.status})`, res.status);
  }

  return json as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

let _siteUrl: string | null = null;
export async function getSiteUrl(): Promise<string> {
  if (_siteUrl) return _siteUrl;
  try {
    const res = await api.get<{ ok: boolean; data: { siteUrl: string } }>('/site-info');
    _siteUrl = res.data.siteUrl;
    return _siteUrl;
  } catch {
    return window.location.origin;
  }
}
