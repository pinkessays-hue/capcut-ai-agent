// ── Channel ──
export type ChannelType = 'youtube' | 'instagram' | 'tiktok' | 'naver_blog' | 'ohouse' | 'other';

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  naver_blog: '네이버 블로그',
  ohouse: '오늘의집',
  other: '기타',
};

// ── Creator ──
export type CreatorStatus = 'active' | 'suspended' | 'pending' | 'rejected';

export const CREATOR_STATUS_LABELS: Record<CreatorStatus, string> = {
  pending: '승인 대기',
  active: '활성',
  suspended: '정지',
  rejected: '반려',
};

export interface Creator {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  channels: ChannelType[];
  channelOther?: string;
  selectedProducts?: string[];
  rejectionReason?: string;
  status: CreatorStatus;
  createdAt: string;
}

// ── Product ──
export interface Product {
  id: string;
  name: string;
  originalName?: string;
  description: string;
  price: number;
  commissionRate: number;
  imageUrl?: string;
  productUrl?: string;
  infoReady: boolean;
  saleStatus: 'active' | 'inactive' | 'preparing';
  createdAt: string;
}

// ── Affiliate Link ──
export interface AffiliateLink {
  id: string;
  creatorId: string;
  productId: string;
  channel: ChannelType;
  channelOther?: string;
  contentTitle: string;
  linkCode: string;
  clicks: number;
  commissionRateAtCreation: number;
  active: boolean;
  issuedBy?: string;
  createdAt: string;
}

// ── Order ──
export type OrderStatus = 'payment_pending' | 'confirmed' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  payment_pending: '결제 대기',
  confirmed: '구매 확정',
  cancelled: '취소',
};

export interface Order {
  id: string;
  linkId: string;
  creatorId: string;
  productId: string;
  channel: ChannelType;
  contentTitle: string;
  amount: number;
  commission: number;
  status: OrderStatus;
  orderedAt: string;
  cafe24OrderId?: string;
}

// ── Point / Wallet ──
export type PointStatus =
  | 'payment_pending'
  | 'credit_scheduled'
  | 'available'
  | 'settlement_processing'
  | 'settled'
  | 'settlement_failed'
  | 'cancelled';

export const POINT_STATUS_LABELS: Record<PointStatus, string> = {
  payment_pending: '결제 대기',
  credit_scheduled: '적립 예정',
  available: '사용 가능',
  settlement_processing: '정산 처리 중',
  settled: '정산 완료',
  settlement_failed: '정산 실패',
  cancelled: '취소/환수',
};

export type LedgerEntryType = 'credit' | 'cancel' | 'payout' | 'reversal';

export interface LedgerEntry {
  id: string;
  creatorId: string;
  orderId?: string;
  type: LedgerEntryType;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

// ── Settlement ──
export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed';

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  pending: '대기',
  processing: '처리 중',
  completed: '지급 완료',
  failed: '실패',
};

export interface Settlement {
  id: string;
  creatorId: string;
  amount: number;
  status: SettlementStatus;
  bankName?: string;
  accountNumberMasked?: string;
  requestedAt: string;
  completedAt?: string;
  failureReason?: string;
}

// ── Bank Account ──
export interface BankAccount {
  id: string;
  creatorId: string;
  bankName: string;
  accountNumberMasked: string;
  accountHolder: string;
  isDefault: boolean;
  createdAt: string;
}

// ── Auth / User ──
export type UserRole = 'creator' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  nickname?: string;
  creatorId?: string;
  creatorStatus?: CreatorStatus;
}

// ── Integration Status ──
export interface IntegrationStatus {
  cafe24: { connected: boolean; mallId?: string; lastSync?: string };
  payout: { configured: boolean; provider?: string };
}

// ── API Response ──
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── Helpers ──
export function formatKRW(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function formatPercent(rate: number): string {
  return (rate * 100).toFixed(1) + '%';
}
