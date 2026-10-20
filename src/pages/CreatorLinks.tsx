import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getProducts, getLinks, getOrders, createLink, recordClick, formatKRW, formatPercent, formatDate } from '../store/data';
import { CHANNEL_LABELS } from '../types';
import type { ChannelType } from '../types';

interface Props {
  creatorId: string;
  onRefresh: () => void;
}

export default function CreatorLinks({ creatorId, onRefresh }: Props) {
  const location = useLocation();
  const initialProductId = (location.state as any)?.productId || '';

  const [links, setLinks] = useState(getLinks().filter(l => l.creatorId === creatorId));
  const [orders, setOrders] = useState(getOrders().filter(o => o.creatorId === creatorId));
  const [showForm, setShowForm] = useState(!!initialProductId);
  const [productId, setProductId] = useState(initialProductId);
  const [channel, setChannel] = useState<ChannelType>('youtube');
  const [contentTitle, setContentTitle] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const products = getProducts();

  const refreshData = () => {
    setLinks(getLinks().filter(l => l.creatorId === creatorId));
    setOrders(getOrders().filter(o => o.creatorId === creatorId));
    onRefresh();
  };

  const handleCreate = () => {
    if (!productId || !contentTitle) {
      alert('상품과 콘텐츠 제목을 입력해주세요.');
      return;
    }
    createLink(creatorId, productId, channel, contentTitle);
    setProductId('');
    setContentTitle('');
    setShowForm(false);
    refreshData();
  };

  const handleClick = (linkId: string) => {
    recordClick(linkId);
    refreshData();
  };

  const handleCopy = async (linkCode: string) => {
    const url = `${window.location.origin}/?ref=${linkCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(linkCode);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      prompt('링크를 복사하세요:', url);
    }
  };

  const getLinkStats = (linkId: string) => {
    const linkOrders = orders.filter(o => o.linkId === linkId);
    return {
      orders: linkOrders.length,
      sales: linkOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.amount, 0),
      commission: linkOrders.reduce((s, o) => s + o.commission, 0),
    };
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>내 링크</h1>
          <p style={{ fontSize: 14, color: 'var(--steel)' }}>
            상품·채널·콘텐츠별 개인 링크 관리 <span className="text-test-data">테스트 데이터</span>
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '취소' : '+ 새 링크 발급'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>링크 발급</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">상품</label>
              <select className="select-field" value={productId} onChange={e => setProductId(e.target.value)} aria-label="상품 선택">
                <option value="">선택하세요</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {!p.infoReady ? '(준비 중)' : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">홍보 채널</label>
              <select className="select-field" value={channel} onChange={e => setChannel(e.target.value as ChannelType)} aria-label="채널 선택">
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">콘텐츠 제목</label>
              <input
                className="input-field"
                placeholder="영상 또는 게시물 제목"
                value={contentTitle}
                onChange={e => setContentTitle(e.target.value)}
              />
            </div>
          </div>
          <button className="btn-buy" onClick={handleCreate} style={{ marginTop: 8 }}>
            링크 생성
          </button>
        </div>
      )}

      {links.length === 0 ? (
        <div className="empty-state">
          <p>아직 발급한 링크가 없습니다.</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
            첫 링크 만들기
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {links.map(link => {
            const product = products.find(p => p.id === link.productId);
            const stats = getLinkStats(link.id);
            return (
              <div key={link.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{product?.name || link.productId}</span>
                    <span className="badge badge-info" style={{ marginLeft: 8 }}>{CHANNEL_LABELS[link.channel]}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--stone)' }}>{formatDate(link.createdAt)}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--charcoal)', marginBottom: 8 }}>
                  {link.contentTitle}
                </p>
                <div style={{
                  display: 'flex',
                  gap: 16,
                  fontSize: 13,
                  color: 'var(--steel)',
                  marginBottom: 12,
                  flexWrap: 'wrap',
                }}>
                  <span>클릭 <strong style={{ color: 'var(--ink)' }}>{link.clicks}</strong></span>
                  <span>주문 <strong style={{ color: 'var(--ink)' }}>{stats.orders}</strong></span>
                  <span>매출 <strong style={{ color: 'var(--ink)' }}>{formatKRW(stats.sales)}</strong></span>
                  <span>수수료 <strong style={{ color: 'var(--primary)' }}>{formatKRW(stats.commission)}</strong></span>
                  <span>수수료율 {formatPercent(link.commissionRateAtCreation)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn-ghost btn-small"
                    onClick={() => handleCopy(link.linkCode)}
                  >
                    {copied === link.linkCode ? '✓ 복사됨' : '링크 복사'}
                  </button>
                  <button
                    className="btn-ghost btn-small"
                    onClick={() => handleClick(link.id)}
                  >
                    테스트 방문 (+1 클릭)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
