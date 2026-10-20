import { useState, useEffect } from 'react';
import { getProducts } from '../api/products';
import { getMyLinks, createLink } from '../api/links';
import { getSiteUrl } from '../api/client';
import { formatPercent, formatDate, CHANNEL_LABELS } from '../types';
import type { Product, AffiliateLink, ChannelType } from '../types';

const CHANNEL_OPTIONS: { value: ChannelType; label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'naver_blog', label: '네이버 블로그' },
  { value: 'ohouse', label: '오늘의집' },
  { value: 'other', label: '기타' },
];

export default function CreatorLinks() {
  const [products, setProducts] = useState<Product[]>([]);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | ''>('');
  const [contentTitle, setContentTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState('');

  const loadData = () => {
    getProducts().then(res => { if (res.data) setProducts(res.data); }).catch(() => {});
    getMyLinks().then(res => { if (res.data) setLinks(res.data); }).catch(() => {});
  };

  useEffect(() => {
    loadData();
    getSiteUrl().then(setSiteUrl).catch(() => {});
  }, []);

  const copyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const buildUtmUrl = (link: AffiliateLink) => {
    if (!link.productUrl) return null;
    const sep = link.productUrl.includes('?') ? '&' : '?';
    const src = encodeURIComponent(link.creatorNameEn || link.linkCode);
    const med = encodeURIComponent(link.channel || 'direct');
    return `${link.productUrl}${sep}cafe_mkt=${link.linkCode}&utm_source=${src}&utm_medium=${med}&utm_campaign=${link.linkCode}`;
  };

  const activeProducts = products.filter(p => p.saleStatus === 'active' && p.infoReady);

  const resetForm = () => {
    setSelectedProductId('');
    setSelectedChannel('');
    setContentTitle('');
    setFormError(null);
  };

  const handleCreate = async () => {
    if (!selectedProductId || !selectedChannel) {
      setFormError('상품과 채널을 선택해주세요.');
      return;
    }
    setCreating(true);
    setFormError(null);
    setSuccessMsg(null);
    try {
      const res = await createLink({
        productId: selectedProductId,
        channel: selectedChannel as ChannelType,
        contentTitle: contentTitle.trim(),
      });
      if (res.ok && res.data) {
        setSuccessMsg('링크가 생성되었습니다!');
        resetForm();
        setShowForm(false);
        loadData();
      } else {
        setFormError(res.error || '링크 생성에 실패했습니다.');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : '링크 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="section-title" style={{ marginBottom: 0 }}>마케팅 링크</h1>
        {!showForm && (
          <button className="btn-buy" onClick={() => { setShowForm(true); setSuccessMsg(null); }}>+ 링크 생성</button>
        )}
      </div>

      {successMsg && (
        <div style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>링크 생성</h3>

          {formError && (
            <div style={{ background: '#fff0f0', color: 'var(--critical)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
              {formError}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label className="form-label">상품 선택</label>
            <select className="select-field" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
              <option value="">상품을 선택하세요</option>
              {activeProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.price > 0 ? ` (${p.price.toLocaleString('ko-KR')}원 · ${(p.commissionRate * 100).toFixed(0)}%)` : ''}
                </option>
              ))}
            </select>
            {activeProducts.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 4 }}>현재 링크를 생성할 수 있는 상품이 없습니다.</p>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="form-label">채널</label>
            <select className="select-field" value={selectedChannel} onChange={e => setSelectedChannel(e.target.value as ChannelType)}>
              <option value="">채널을 선택하세요</option>
              {CHANNEL_OPTIONS.map(ch => (
                <option key={ch.value} value={ch.value}>{ch.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">콘텐츠 제목 <span style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 400 }}>(선택)</span></label>
            <input
              type="text"
              className="input-field"
              placeholder="예: 여름 인테리어 추천 영상"
              value={contentTitle}
              onChange={e => setContentTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-buy"
              onClick={handleCreate}
              disabled={creating || !selectedProductId || !selectedChannel}
            >
              {creating ? '생성 중...' : '링크 생성'}
            </button>
            <button className="btn-ghost" onClick={() => { setShowForm(false); resetForm(); }}>취소</button>
          </div>
        </div>
      )}

      {links.length === 0 && !showForm ? (
        <div className="empty-state">
          <p>아직 생성된 링크가 없습니다.</p>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginTop: 8 }}>위의 "링크 생성" 버튼을 눌러 마케팅 링크를 만들어보세요.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {links.map(link => {
            const product = products.find(p => p.id === link.productId);
            const utmUrl = buildUtmUrl(link);
            const shortUrl = siteUrl ? `${siteUrl}/r/${link.linkCode}` : null;

            return (
              <div key={link.id} className="card" style={{ padding: 16, opacity: link.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{product?.name || '상품'}</span>
                    <span className="badge badge-info" style={{ marginLeft: 8 }}>{CHANNEL_LABELS[link.channel] || link.channel}</span>
                    {!link.active && <span className="badge badge-critical" style={{ marginLeft: 4 }}>비활성</span>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--stone)' }}>{formatDate(link.createdAt)}</span>
                </div>
                {link.contentTitle && <p style={{ fontSize: 13, color: 'var(--charcoal)', marginBottom: 8 }}>{link.contentTitle}</p>}
                {utmUrl && (
                  <div style={{ fontSize: 12, color: 'var(--steel)', marginBottom: 6 }}>
                    <strong style={{ color: 'var(--ink)' }}>마케팅 링크:</strong>
                    <code style={{ display: 'block', marginTop: 4, background: '#eff6ff', padding: '6px 8px', borderRadius: 6, fontSize: 11, wordBreak: 'break-all', lineHeight: 1.5 }}>{utmUrl}</code>
                  </div>
                )}
                {shortUrl && (
                  <div style={{ fontSize: 12, color: 'var(--steel)', marginBottom: 4 }}>
                    클릭 추적 링크: <code style={{ background: 'var(--surface-soft)', padding: '2px 6px', borderRadius: 4, fontSize: 11, wordBreak: 'break-all' }}>{shortUrl}</code>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--steel)', marginBottom: 4 }}>
                  수수료율: {formatPercent(link.commissionRateAtCreation)}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--steel)', marginBottom: 8, flexWrap: 'wrap' }}>
                  <span>클릭 <strong style={{ color: 'var(--ink)' }}>{link.clicks}</strong></span>
                  <span style={{ color: 'var(--stone)' }}>주문: 연동 전</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {utmUrl && (
                    <button className="btn-buy btn-small" onClick={() => copyLink(utmUrl, link.id + '-utm')}>
                      {copiedId === link.id + '-utm' ? '복사됨!' : '마케팅 링크 복사'}
                    </button>
                  )}
                  {shortUrl && (
                    <button className="btn-ghost btn-small" onClick={() => copyLink(shortUrl, link.id + '-short')}>
                      {copiedId === link.id + '-short' ? '복사됨!' : '추적 링크 복사'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, padding: '12px 16px', background: 'var(--surface-soft)', borderRadius: 10, fontSize: 13, color: 'var(--stone)' }}>
        주문 추적은 카페24 연동 후 자동으로 시작됩니다. 현재는 클릭 수만 추적됩니다.
      </div>
    </div>
  );
}
