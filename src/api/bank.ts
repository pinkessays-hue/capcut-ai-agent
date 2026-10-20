import { api } from './client';
import type { BankAccount, ApiResponse } from '../types';

async function getMyCreatorId(): Promise<string> {
  const raw = await api.get<{ ok: boolean; data: { creatorId?: string } }>('/auth/me');
  if (!raw.data?.creatorId) throw new Error('크리에이터 정보를 찾을 수 없습니다.');
  return raw.data.creatorId;
}

export async function getMyBankAccounts(): Promise<ApiResponse<BankAccount[]>> {
  const creatorId = await getMyCreatorId();
  const raw = await api.get<{ ok: boolean; data: Record<string, unknown> | null }>(`/creators/${creatorId}/bank-account`);
  if (!raw.data) return { ok: true, data: [] };
  const ba = raw.data;
  return {
    ok: true,
    data: [{
      id: (ba.id ?? creatorId) as string,
      creatorId,
      bankName: (ba.bankName ?? ba.bank_name) as string,
      accountNumberMasked: (ba.accountNumberMasked ?? ba.account_number_masked ?? '****') as string,
      accountHolder: (ba.accountHolder ?? ba.account_holder) as string,
      isDefault: true,
      createdAt: (ba.updatedAt ?? ba.updated_at ?? '') as string,
    }],
  };
}

export async function addBankAccount(data: {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}): Promise<ApiResponse<BankAccount>> {
  const creatorId = await getMyCreatorId();
  await api.put<{ ok: boolean }>(`/creators/${creatorId}/bank-account`, data);
  return {
    ok: true,
    data: {
      id: creatorId,
      creatorId,
      bankName: data.bankName,
      accountNumberMasked: '****' + data.accountNumber.slice(-4),
      accountHolder: data.accountHolder,
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function deleteBankAccount(_id: string): Promise<ApiResponse> {
  return { ok: false, error: '계좌 삭제는 운영자에게 문의해주세요.' };
}

export async function setDefaultBankAccount(_id: string): Promise<ApiResponse<BankAccount>> {
  return { ok: true };
}
