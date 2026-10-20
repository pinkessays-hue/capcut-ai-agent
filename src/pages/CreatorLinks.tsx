import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getProducts } from '../api/products';
import { getMyLinks, createLink, simulateClick, type CreateLinkPayload } from '../api/links';
import { formatKRW, formatPercent, formatDate, CHANNEL_LABELS } from '../types';
import type { Product, AffiliateLink, ChannelType } from '../types';

const CHANNEL_OPTIONS: ChannelType[] = ['youtube', 'instagram', 'tiktok', 'naver_blog', 'ohouse', 'other'];

export default function CreatorLinks() {
  const location = useLocation();
  const preselectedProduct = (location.state as { productId?: string } | null)?.productId;

  const [products, setProducts] = useState<Product[]>([]);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [productId, setProductId] = useState(preselectedProduct || '');
  const [channel, setChannel] = useState<ChannelType>('youtube');
  const [channelOther, setChannelOther] = useState('');
  const [contentTitle, setContentTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = () => {
    getProducts().then(res => { if (res.data) setProducts(res.data); }).catch(() => {});
    getMyLinks().then(res => { if (res.data) setLinks(res.data); }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (preselectedProduct) { setProductId(preselectedProduct); setShowForm(true); } }, [preselectedProduct]);

  const handleCreate = async () => {
    if (!productId || !contentTitle.trim()) return;
    setCreating(true);
    try {
      const payload: CreateLinkPayload = { productId, channel, contentTitle: contentTitle.trim() };
      if (channel === 'other') payload.channelOther = channelOther.trim();
      await createLink(payload);
      setShowForm(false);
      setContentTitle('');
      loadData();
    } catch { /* silent */ } finally {
      setCreating(false);
    }
  };

  const handleTestClick = async (id: string) => {
    await simulateClick(id).catch(() => {});
    loadData();
  };

  const baseUrl = window.location.origin;

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="section-title" style={{ marginBottom: 0 }}>마케팅 링크</h1>
        {!showForm && <button className="btn-buy" onClick={() => setShowForm(true)}>+ 새 링크 발급</button>}
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>링크 발급</h3>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">상품</label>
            <select className="select-field" value={productId} onChange={e => setProductId(e.target.value)}>
              <option value="">선택하세요</option>
              {products.filter(p => p.saleStatus === 'on_sale' && p.infoReady).map(p => (
                <option key={p.id} value={p.id}>{p.name} — 수수료 {(p.commissionRate * 100).toFixed(0)}%</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">채널</label>
            <select className="select-field" value={channel} onChange={e => setChannel(e.target.value as ChannelType)}>
              {CHANNEL_OPTIONS.map(ch => <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>)}
            </select>
          </div>
          {channel === 'other' && (
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">채널명</label>
              <input className="input-field" value={channelOther} onChange={e => setChannelOther(e.target.value)} placeholder="채널명 입력" />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">콘텐츠 제목</label>
            <input className="input-field" value={contentTitle} onChange={e => setContentTitle(e.target.value)} placeholder="콘텐츠 제목 (예: 포미침대 리뷰)" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-buy" onClick={handleCreate} disabled={creating || !productId || !contentTitle.trim()}>
              {creating ? '생성 중...' : '링크 생성'}
            </button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {links.length === 0 ? (
        <div className="empty-state"><p>발급한 링크가 없습니다.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {links.map(link => {
            const product = products.find(p => p.id === link.productId);
            const linkUrl = `${baseUrl}/r/${link.linkCode}`;

            return (
              <div key={link.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{product?.name || '상품'}</span>
                    <span className="badge badge-info" style={{ marginLeft: 8 }}>{CHANNEL_LABELS[link.channel]}</span>
                    {!link.active && <span className="badge badge-critical" style={{ marginLeft: 4 }}>비활성</span>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--stone)' }}>{formatDate(link.createdAt)}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--charcoal)', marginBottom: 8 }}>{link.contentTitle}</p>
                <div style={{ fontSize: 12, color: 'var(--steel)', marginBottom: 4 }}>
                  링크: <code style={{ background: 'var(--surface-soft)', padding: '2px 6px', borderRadius: 4, fontSize: 11, wordBreak: 'break-all' }}>{linkUrl}</code>
                  &nbsp;· 수수료율: {formatPercent(link.commissionRateAtCreation)}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--steel)', marginBottom: 12, flexWrap: 'wrap' }}>
                  <span>클릭 <strong style={{ color: 'var(--ink)' }}>{link.clicks}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-ghost btn-small" onClick={() => navigator.clipboard.writeText(linkUrl)}>링크 복사</button>
                  <button className="btn-ghost btn-small" onClick={() => handleTestClick(link.id)}>테스트 방문 (+1 클릭)</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
