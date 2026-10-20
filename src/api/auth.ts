import { api } from './client';
import type { User, ChannelType, ApiResponse } from '../types';

interface AuthResponse {
  ok: boolean;
  token: string;
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  category: string;
  channels: ChannelType[];
  channelOther?: string;
  nickname?: string;
  selectedProducts: string[];
  termsAgreed: boolean;
  privacyAgreed: boolean;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/register', payload);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', { email, password });
}

export async function getMe(): Promise<ApiResponse<User>> {
  return api.get<ApiResponse<User>>('/auth/me');
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout').catch(() => {});
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
  return api.post<ApiResponse>('/auth/change-password', { currentPassword, newPassword });
}

export async function loginSimple(nickname: string, pin: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login/simple', { nickname, pin });
}

export async function setNickname(nickname: string, pin: string): Promise<ApiResponse> {
  return api.post<ApiResponse>('/auth/nickname/set', { nickname, pin });
}

export async function checkNickname(nickname: string): Promise<ApiResponse<{ available: boolean }>> {
  return api.get<ApiResponse<{ available: boolean }>>(`/auth/nickname/check/${encodeURIComponent(nickname)}`);
}
