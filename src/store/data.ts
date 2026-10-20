import type { AppState, Creator, Product, AffiliateLink, Order, OrderStatus, SettlementStatus, ChannelType } from '../types';
import { LocalAttributionProvider } from './attribution';

const STORAGE_KEY_PREFIX = 'hnhs_';
const INITIALIZED_KEY = `${STORAGE_KEY_PREFIX}initialized`;

const attribution = new LocalAttributionProvider();

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateLinkCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: '포미 리프트업 침대',
    description: '전동 리프트업 기능으로 편안한 수납과 취침을 동시에. 원터치 리모컨으로 간편 조작.',
    price: 890000,
    commissionRate: 0.05,
    imageUrl: '',
    infoReady: true,
  },
  {
    id: 'prod_2',
    name: '리클라이너 소파',
    description: '',
    price: 0,
    commissionRate: 0.04,
    imageUrl: '',
    infoReady: false,
  },
  {
    id: 'prod_3',
    name: '휴고 플립',
    description: '접이식 디자인으로 좁은 공간에서도 편안한 휴식. 컴팩트하게 접어 보관 가능.',
    price: 450000,
    commissionRate: 0.06,
    imageUrl: '',
    infoReady: true,
  },
];

const DEFAULT_CREATORS: Creator[] = [
  {
    id: 'creator_1',
    name: '김하늘',
    email: 'haneul@example.com',
    phone: '010-0000-0001',
    channels: [
      { type: 'youtube', url: 'https://youtube.com/@example_haneul', accountName: '하늘의 인테리어' },
      { type: 'instagram', url: 'https://instagram.com/example_haneul', accountName: '@example_haneul' },
    ],
    category: '인테리어 / 홈스타일링',
    status: 'approved',
    appliedAt: '2024-09-15T10:00:00Z',
    approvedAt: '2024-09-17T14:00:00Z',
  },
  {
    id: 'creator_2',
    name: '이준서',
    email: 'junseo@example.com',
    phone: '010-0000-0002',
    channels: [
      { type: 'naver_blog', url: 'https://blog.naver.com/example_junseo', accountName: '준서의 리빙로그' },
      { type: 'ohouse', url: 'https://ohou.se/users/example_junseo', accountName: '준서의집' },
    ],
    category: '가구 리뷰 / 리빙',
    status: 'approved',
    appliedAt: '2024-10-01T09:00:00Z',
    approvedAt: '2024-10-03T11:00:00Z',
  },
  {
    id: 'creator_3',
    name: '박소영',
    email: 'soyoung@example.com',
    phone: '010-0000-0003',
    channels: [
      { type: 'tiktok', url: 'https://tiktok.com/@example_soyoung', accountName: '@example_soyoung' },
    ],
    category: '라이프스타일',
    status: 'pending',
    appliedAt: '2024-10-20T15:00:00Z',
  },
];

const DEFAULT_LINKS: AffiliateLink[] = [
  {
    id: 'link_1',
    creatorId: 'creator_1',
    productId: 'prod_1',
    channel: 'youtube',
    contentTitle: '포미 리프트업 침대 솔직 리뷰',
    linkCode: 'HN1YT001',
    clicks: 142,
    createdAt: '2024-09-20T10:00:00Z',
    commissionRateAtCreation: 0.05,
  },
  {
    id: 'link_2',
    creatorId: 'creator_1',
    productId: 'prod_3',
    channel: 'instagram',
    contentTitle: '휴고 플립 언박싱',
    linkCode: 'HN1IG002',
    clicks: 87,
    createdAt: '2024-09-25T14:00:00Z',
    commissionRateAtCreation: 0.06,
  },
  {
    id: 'link_3',
    creatorId: 'creator_2',
    productId: 'prod_1',
    channel: 'naver_blog',
    contentTitle: '신혼 침실 꾸미기 – 포미 리프트업',
    linkCode: 'JS2NB003',
    clicks: 63,
    createdAt: '2024-10-05T09:00:00Z',
    commissionRateAtCreation: 0.05,
  },
];

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'order_1',
    linkId: 'link_1',
    creatorId: 'creator_1',
    productId: 'prod_1',
    channel: 'youtube',
    contentTitle: '포미 리프트업 침대 솔직 리뷰',
    amount: 890000,
    status: 'confirmed',
    commission: 44500,
    commissionRate: 0.05,
    settlementStatus: 'paid',
    orderedAt: '2024-09-22T16:30:00Z',
  },
  {
    id: 'order_2',
    linkId: 'link_1',
    creatorId: 'creator_1',
    productId: 'prod_1',
    channel: 'youtube',
    contentTitle: '포미 리프트업 침대 솔직 리뷰',
    amount: 890000,
    status: 'confirmed',
    commission: 44500,
    commissionRate: 0.05,
    settlementStatus: 'approved',
    orderedAt: '2024-10-01T11:00:00Z',
  },
  {
    id: 'order_3',
    linkId: 'link_2',
    creatorId: 'creator_1',
    productId: 'prod_3',
    channel: 'instagram',
    contentTitle: '휴고 플립 언박싱',
    amount: 450000,
    status: 'payment_pending',
    commission: 27000,
    commissionRate: 0.06,
    settlementStatus: 'pending',
    orderedAt: '2024-10-18T09:30:00Z',
  },
  {
    id: 'order_4',
    linkId: 'link_3',
    creatorId: 'creator_2',
    productId: 'prod_1',
    channel: 'naver_blog',
    contentTitle: '신혼 침실 꾸미기 – 포미 리프트업',
    amount: 890000,
    status: 'cancelled',
    commission: 0,
    commissionRate: 0.05,
    settlementStatus: 'pending',
    orderedAt: '2024-10-10T14:00:00Z',
  },
  {
    id: 'order_5',
    linkId: 'link_3',
    creatorId: 'creator_2',
    productId: 'prod_1',
    channel: 'naver_blog',
    contentTitle: '신혼 침실 꾸미기 – 포미 리프트업',
    amount: 890000,
    status: 'confirmed',
    commission: 44500,
    commissionRate: 0.05,
    settlementStatus: 'pending',
    orderedAt: '2024-10-12T10:00:00Z',
  },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(data));
  } catch {
    // localStorage unavailable
  }
}

function ensureInitialized(): void {
  try {
    if (!localStorage.getItem(INITIALIZED_KEY)) {
      saveToStorage('creators', DEFAULT_CREATORS);
      saveToStorage('products', DEFAULT_PRODUCTS);
      saveToStorage('links', DEFAULT_LINKS);
      saveToStorage('orders', DEFAULT_ORDERS);
      localStorage.setItem(INITIALIZED_KEY, 'true');
    }
  } catch {
    // localStorage unavailable
  }
}

ensureInitialized();

export function getState(): AppState {
  return {
    creators: loadFromStorage('creators', DEFAULT_CREATORS),
    products: loadFromStorage('products', DEFAULT_PRODUCTS),
    links: loadFromStorage('links', DEFAULT_LINKS),
    orders: loadFromStorage('orders', DEFAULT_ORDERS),
  };
}

export function getCreators(): Creator[] {
  return loadFromStorage('creators', DEFAULT_CREATORS);
}

export function getProducts(): Product[] {
  return loadFromStorage('products', DEFAULT_PRODUCTS);
}

export function getLinks(): AffiliateLink[] {
  return loadFromStorage('links', DEFAULT_LINKS);
}

export function getOrders(): Order[] {
  return loadFromStorage('orders', DEFAULT_ORDERS);
}

export function saveCreators(creators: Creator[]): void {
  saveToStorage('creators', creators);
}

export function saveProducts(products: Product[]): void {
  saveToStorage('products', products);
}

export function saveLinks(links: AffiliateLink[]): void {
  saveToStorage('links', links);
  localStorage.setItem('app_links', JSON.stringify(links));
}

export function saveOrders(orders: Order[]): void {
  saveToStorage('orders', orders);
  localStorage.setItem('app_orders', JSON.stringify(orders));
}

export function addCreator(creator: Omit<Creator, 'id' | 'status' | 'appliedAt'>): Creator {
  const newCreator: Creator = {
    ...creator,
    id: generateId('creator'),
    status: 'pending',
    appliedAt: new Date().toISOString(),
  };
  const creators = getCreators();
  creators.push(newCreator);
  saveCreators(creators);
  return newCreator;
}

export function updateCreatorStatus(id: string, status: Creator['status']): void {
  const creators = getCreators();
  const creator = creators.find(c => c.id === id);
  if (creator) {
    creator.status = status;
    if (status === 'approved') creator.approvedAt = new Date().toISOString();
    saveCreators(creators);
  }
}

export function updateProduct(id: string, updates: Partial<Product>): void {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx !== -1) {
    products[idx] = { ...products[idx], ...updates };
    saveProducts(products);
  }
}

export function createLink(
  creatorId: string,
  productId: string,
  channel: ChannelType,
  contentTitle: string,
): AffiliateLink {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) throw new Error('상품을 찾을 수 없습니다.');

  const link: AffiliateLink = {
    id: generateId('link'),
    creatorId,
    productId,
    channel,
    contentTitle,
    linkCode: generateLinkCode(),
    clicks: 0,
    createdAt: new Date().toISOString(),
    commissionRateAtCreation: product.commissionRate,
  };
  const links = getLinks();
  links.push(link);
  saveLinks(links);
  return link;
}

export function recordClick(linkId: string): void {
  const links = getLinks();
  const link = links.find(l => l.id === linkId);
  if (link) {
    link.clicks += 1;
    saveLinks(links);
  }
}

export function createTestOrder(linkId: string): Order {
  const links = getLinks();
  const link = links.find(l => l.id === linkId);
  if (!link) throw new Error('링크를 찾을 수 없습니다.');

  const products = getProducts();
  const product = products.find(p => p.id === link.productId);
  if (!product) throw new Error('상품을 찾을 수 없습니다.');

  const amount = product.price || 100000;
  const rate = link.commissionRateAtCreation;
  const commission = Math.round(amount * rate);

  const order: Order = {
    id: generateId('order'),
    linkId,
    creatorId: link.creatorId,
    productId: link.productId,
    channel: link.channel,
    contentTitle: link.contentTitle,
    amount,
    status: 'payment_pending',
    commission,
    commissionRate: rate,
    settlementStatus: 'pending',
    orderedAt: new Date().toISOString(),
  };
  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);
  return order;
}

export function updateOrderStatus(orderId: string, status: OrderStatus): void {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    if (status === 'cancelled') {
      order.commission = 0;
    } else if (status === 'confirmed') {
      order.commission = Math.round(order.amount * order.commissionRate);
    }
    saveOrders(orders);
  }
}

export function updateSettlementStatus(orderId: string, status: SettlementStatus): void {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.settlementStatus = status;
    saveOrders(orders);
  }
}

export function resetAllData(): void {
  try {
    localStorage.removeItem(INITIALIZED_KEY);
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('app_links');
    localStorage.removeItem('app_orders');
    ensureInitialized();
  } catch {
    // localStorage unavailable
  }
}

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
