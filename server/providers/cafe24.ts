import crypto from 'crypto';

interface Cafe24Config {
  mallId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface Cafe24Order {
  order_id: string;
  order_date: string;
  payment_date: string;
  order_price_amount: string;
  order_amount?: string;
  actual_payment_amount?: string;
  actual_order_amount: { payment_amount: string };
  tracking_code?: string;
  items: Array<{
    product_no: number;
    product_code: string;
    quantity: number;
    product_price: string;
    order_status: string;
  }>;
  buyer?: { name: string; email: string };
}

export class Cafe24Client {
  private config: Cafe24Config | null = null;
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    const mallId = process.env.CAFE24_MALL_ID;
    const clientId = process.env.CAFE24_CLIENT_ID;
    const clientSecret = process.env.CAFE24_CLIENT_SECRET;
    const redirectUri = process.env.CAFE24_REDIRECT_URI || '';

    if (mallId && clientId && clientSecret) {
      this.config = { mallId, clientId, clientSecret, redirectUri };
    }
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  getStatus(): { configured: boolean; mallId?: string; hasToken: boolean; tokenExpiry?: string } {
    return {
      configured: this.isConfigured(),
      mallId: this.config?.mallId,
      hasToken: !!this.accessToken && Date.now() < this.tokenExpiresAt,
      tokenExpiry: this.tokenExpiresAt ? new Date(this.tokenExpiresAt).toISOString() : undefined,
    };
  }

  getOAuthUrl(state: string): string {
    if (!this.config) throw new Error('카페24 연동이 설정되지 않았습니다. CAFE24_MALL_ID, CAFE24_CLIENT_ID, CAFE24_CLIENT_SECRET 환경 변수를 설정하세요.');
    const baseUrl = `https://${this.config.mallId}.cafe24api.com/api/v2/oauth/authorize`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'mall.read_store,mall.read_order,mall.read_product',
      state,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri?: string): Promise<{ access_token: string; refresh_token: string; expires_at: string }> {
    if (!this.config) throw new Error('카페24 연동이 설정되지 않았습니다.');

    const url = `https://${this.config.mallId}.cafe24api.com/api/v2/oauth/token`;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri || this.config.redirectUri,
    });

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`카페24 OAuth 토큰 교환 실패: ${response.status} ${text}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshTokenValue = data.refresh_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(this.tokenExpiresAt).toISOString(),
    };
  }

  async refreshToken(): Promise<void> {
    if (!this.config) throw new Error('카페24 연동이 설정되지 않았습니다.');
    if (!this.refreshTokenValue) throw new Error('리프레시 토큰이 없습니다. OAuth 인증을 다시 진행하세요.');

    const url = `https://${this.config.mallId}.cafe24api.com/api/v2/oauth/token`;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshTokenValue,
    });

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      this.accessToken = null;
      this.refreshTokenValue = null;
      throw new Error('토큰 갱신 실패. OAuth 인증을 다시 진행하세요.');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshTokenValue = data.refresh_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
  }

  private async apiRequest(path: string, method: string = 'GET'): Promise<unknown> {
    if (!this.config) throw new Error('카페24 연동이 설정되지 않았습니다.');
    if (!this.accessToken) throw new Error('카페24 OAuth 인증이 필요합니다.');

    if (Date.now() >= this.tokenExpiresAt && this.refreshTokenValue) {
      await this.refreshToken();
    }

    const url = `https://${this.config.mallId}.cafe24api.com/api/v2${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2024-03-01',
      },
    });

    if (response.status === 401) {
      await this.refreshToken();
      const retryResponse = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2024-03-01',
        },
      });
      if (!retryResponse.ok) throw new Error(`카페24 API 요청 실패: ${retryResponse.status}`);
      return retryResponse.json();
    }

    if (!response.ok) throw new Error(`카페24 API 요청 실패: ${response.status}`);
    return response.json();
  }

  async getOrder(orderId: string): Promise<Cafe24Order> {
    const data = await this.apiRequest(`/admin/orders/${orderId}`) as { order: Cafe24Order };
    return data.order;
  }

  async listOrders(accessToken: string, params: { startDate?: string; endDate?: string; limit?: number; offset?: number } = {}): Promise<Cafe24Order[]> {
    this.accessToken = accessToken;
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    query.set('limit', String(params.limit || 50));
    query.set('offset', String(params.offset || 0));

    const data = await this.apiRequest(`/admin/orders?${query.toString()}`) as { orders: Cafe24Order[] };
    return data.orders;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config) return false;
    const hmac = crypto.createHmac('sha256', this.config.clientSecret);
    hmac.update(payload);
    const computed = hmac.digest('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  }
}

export const cafe24Client = new Cafe24Client();
