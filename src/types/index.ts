export type ChannelType = 'youtube' | 'instagram' | 'tiktok' | 'naver_blog' | 'ohouse';

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  youtube: '유튜브',
  instagram: '인스타그램',
  tiktok: '틱톡',
  naver_blog: '네이버 블로그',
  ohouse: '오늘의집',
};

export type CreatorStatus = 'pending' | 'approved' | 'rejected';
export type OrderStatus = 'payment_pending' | 'confirmed' | 'cancelled';
export type SettlementStatus = 'pending' | 'approved' | 'paid';

export const CREATOR_STATUS_LABELS: Record<CreatorStatus, string> = {
  pending: '심사 중',
  approved: '승인',
  rejected: '반려',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  payment_pending: '결제 대기',
  confirmed: '구매 확정',
  cancelled: '취소/반품',
};

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  pending: '정산 대기',
  approved: '승인',
  paid: '지급 완료',
};

export interface CreatorChannel {
  type: ChannelType;
  url: string;
  accountName: string;
}

export interface Creator {
  id: string;
  name: string;
  email: string;
  phone: string;
  channels: CreatorChannel[];
  category: string;
  status: CreatorStatus;
  appliedAt: string;
  approvedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  commissionRate: number;
  imageUrl: string;
  infoReady: boolean;
}

export interface AffiliateLink {
  id: string;
  creatorId: string;
  productId: string;
  channel: ChannelType;
  contentTitle: string;
  linkCode: string;
  clicks: number;
  createdAt: string;
  commissionRateAtCreation: number;
}

export interface Order {
  id: string;
  linkId: string;
  creatorId: string;
  productId: string;
  channel: ChannelType;
  contentTitle: string;
  amount: number;
  status: OrderStatus;
  commission: number;
  commissionRate: number;
  settlementStatus: SettlementStatus;
  orderedAt: string;
}

export interface AppState {
  creators: Creator[];
  products: Product[];
  links: AffiliateLink[];
  orders: Order[];
}
