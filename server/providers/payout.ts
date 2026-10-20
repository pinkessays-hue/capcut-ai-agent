export interface PayoutRequest {
  creatorId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  idempotencyKey: string;
}

export interface PayoutResult {
  success: boolean;
  reference?: string;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface PayoutProvider {
  requestPayout(request: PayoutRequest): Promise<PayoutResult>;
  checkStatus(reference: string): Promise<PayoutResult>;
  isConfigured(): boolean;
  getProviderName(): string;
}

export class UnconnectedPayoutProvider implements PayoutProvider {
  async requestPayout(_request: PayoutRequest): Promise<PayoutResult> {
    return {
      success: false,
      status: 'failed',
      errorMessage: '지급대행사가 연결되지 않았습니다. 운영자 설정에서 지급대행사 API 정보를 등록하세요.',
    };
  }

  async checkStatus(_reference: string): Promise<PayoutResult> {
    return {
      success: false,
      status: 'failed',
      errorMessage: '지급대행사가 연결되지 않았습니다.',
    };
  }

  isConfigured(): boolean {
    return false;
  }

  getProviderName(): string {
    return '미연결';
  }
}

function createPayoutProvider(): PayoutProvider {
  const provider = process.env.PAYOUT_PROVIDER;
  const apiKey = process.env.PAYOUT_API_KEY;
  const apiSecret = process.env.PAYOUT_API_SECRET;

  if (!provider || !apiKey || !apiSecret) {
    return new UnconnectedPayoutProvider();
  }

  // When a real payout provider is configured, instantiate the appropriate client here.
  // Example: if (provider === 'toss') return new TossPayoutProvider(apiKey, apiSecret);
  console.warn(`[payout] 지급대행사 '${provider}'에 대한 구현이 없습니다. UnconnectedPayoutProvider를 사용합니다.`);
  return new UnconnectedPayoutProvider();
}

export const payoutProvider = createPayoutProvider();
