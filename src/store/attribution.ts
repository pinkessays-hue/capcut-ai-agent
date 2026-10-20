import type { AffiliateLink, Order, OrderStatus, SettlementStatus } from '../types';

export interface AttributionProvider {
  recordClick(linkId: string): void;
  createOrder(linkId: string, amount: number, commissionRate: number): Order;
  calculateCommission(amount: number, rate: number, status: OrderStatus): number;
}

export class LocalAttributionProvider implements AttributionProvider {
  private getLinks(): AffiliateLink[] {
    return JSON.parse(localStorage.getItem('app_links') || '[]');
  }

  private saveLinks(links: AffiliateLink[]): void {
    localStorage.setItem('app_links', JSON.stringify(links));
  }

  private getOrders(): Order[] {
    return JSON.parse(localStorage.getItem('app_orders') || '[]');
  }

  private saveOrders(orders: Order[]): void {
    localStorage.setItem('app_orders', JSON.stringify(orders));
  }

  recordClick(linkId: string): void {
    const links = this.getLinks();
    const link = links.find(l => l.id === linkId);
    if (link) {
      link.clicks += 1;
      this.saveLinks(links);
    }
  }

  createOrder(linkId: string, amount: number, commissionRate: number): Order {
    const links = this.getLinks();
    const link = links.find(l => l.id === linkId);
    if (!link) throw new Error('링크를 찾을 수 없습니다.');

    const order: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      linkId,
      creatorId: link.creatorId,
      productId: link.productId,
      channel: link.channel,
      contentTitle: link.contentTitle,
      amount,
      status: 'payment_pending',
      commission: this.calculateCommission(amount, commissionRate, 'payment_pending'),
      commissionRate,
      settlementStatus: 'pending',
      orderedAt: new Date().toISOString(),
    };

    const orders = this.getOrders();
    orders.push(order);
    this.saveOrders(orders);
    return order;
  }

  calculateCommission(amount: number, rate: number, status: OrderStatus): number {
    if (status === 'cancelled') return 0;
    return Math.round(amount * rate);
  }
}
