import { useState, useEffect } from 'react';
import { getAllLinks, simulateClick, simulateOrder, adminIssueLinks, toggleLinkActive, reissueLink } from '../api/links';
import { getProducts } from '../api/products';
import { getAllCreators } from '../api/creators';
import { formatPercent, formatDate, CHANNEL_LABELS } from '../types';
import type { AffiliateLink, Product, Creator } from '../types';

export default function AdminLinks() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [showIssue, setShowIssue] = useState(false);
  const [issueCreatorId, setIssueCreatorId] = useState('');
  const [issueProductIds, setIssueProductIds] = useState<string[]>([]);
  const [issuing, setIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const siteUrl = (window as unknown as Record<string, unknown>).__SITE_URL__ as string || window.location.origin;

  const loadData = () => {
    getAllLinks().then(res => { if (res.data) setLinks(res.data); }).catch(() => {});
    getProducts().then(res => { if (res.data) setProducts(res.data); }).catch(() => {});
    getAllCreators().then(res => { if (res.data) setCreators(res.data); }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const handleIssue = async () => {
    if (!issueCreatorId || issueProductIds.length === 0) return;
    setIssuing(true);
    setIssueResult(null);
    try {
      const res = await adminIssueLinks(issueCreatorId, issueProductIds);
      if (res.ok) {
        setIssueResult('링크가 발급되었습니다.');
        setShowIssue(false);
        setIssueCreatorId('');
        setIssueProductIds([]);
        loadData();
      } else {
        setIssueResult(res.error || '발급에 실패했습니다.');
      }
    } catch (err: unknown) {
      setIssueResult(err instanceof Error ? err.message : '발급에 실패했습니다.');
    } finally {
      setIssuing(false);
    }
  };

  const handleToggle = async (id: string) => {
    try { await toggleLinkActive(id); loadData(); } catch { /* silent */ }
  };

  const handleReissue = async (id: string) => {
    if (!confirm('새 코드를 발급하면 기존 코드는 더 이상 동작하지 않습니다. 계속하시겠습니까?')) return;
    try { await reissueLink(id); loadData(); } catch { /* silent */ }
  };

  const handleClick = async (id: string) => {
    await simulateClick(id).catch(() => {});
    loadData();
  };

  const handleCreateOrder = async (linkId: string) => {
    await simulateOrder(linkId).catch(() => {});
    loadData();
  };

  const copyLink = (code: string, id: string) => {
    navigator.clipboard.writeText(`${siteUrl}/r/${code}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleIssueProduct = (id: string) => {
    setIssueProductIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const activeCreators = creators.filter(c => c.status === 'active');

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="section-title" style={{ marginBottom: 0 }}>링크 관리</h1>
        {!showIssue && (
          <button className="btn-buy" onClick={() => setShowIssue(true)}>+ 링크 발급</button>
        )}
      </div>

      {issueResult && (
        <div style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          {issueResult}
        </div>
      )}

      {showIssue && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>링크 발급</h3>

          <div style={{ marginBottom: 12 }}>
            <label className="form-label">크리에이터 선택</label>
            <select className="select-field" value={issueCreatorId} onChange={e => setIssueCreatorId(e.target.value)}>
              <option value="">선택하세요</option>
              {activeCreators.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
            {activeCreators.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 4 }}>승인된 크리에이터가 없습니다. 먼저 크리에이터를 승인해주세요.</p>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">상품 선택 <span style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 400 }}>(복수 선택 가능)</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {products.filter(p => p.saleStatus !== 'inactive').map(p => (
                <label key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 8,
                  border: issueProductIds.includes(p.id) ? '2px solid var(--primary)' : '1px solid var(--hairline)',
                  background: issueProductIds.includes(p.id) ? 'var(--primary-soft)' : '#fff',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={issueProductIds.includes(p.id)}
                    onChange={() => toggleIssueProduct(p.id)}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 14 }}>
                    {p.name}
                    {p.price > 0 && <span style={{ color: 'var(--stone)', fontSize: 12, marginLeft: 8 }}>{p.price.toLocaleString('ko-KR')}원 · {(p.commissionRate * 100).toFixed(0)}%</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-buy"
              onClick={handleIssue}
              disabled={issuing || !issueCreatorId || issueProductIds.length === 0}
            >
              {issuing ? '발급 중...' : '링크 발급'}
            </button>
            <button className="btn-ghost" onClick={() => { setShowIssue(false); setIssueCreatorId(''); setIssueProductIds([]); setIssueResult(null); }}>취소</button>
          </div>
        </div>
      )}

      {links.length === 0 ? (
        <div className="empty-state"><p>발급된 링크가 없습니다.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {links.map(link => {
            const creator = creators.find(c => c.id === link.creatorId);
            const product = products.find(p => p.id === link.productId);
            const linkUrl = `${siteUrl}/r/${link.linkCode}`;

            return (
              <div key={link.id} className="card" style={{ padding: 16, opacity: link.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{product?.name}</span>
                    <span className="badge badge-info" style={{ marginLeft: 8 }}>{CHANNEL_LABELS[link.channel] || link.channel}</span>
                    {!link.active && <span className="badge badge-critical" style={{ marginLeft: 4 }}>비활성</span>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--stone)' }}>
                    {creator?.name}
                    {link.issuedBy && link.issuedBy !== creator?.userId
                      ? <span className="badge" style={{ marginLeft: 6, fontSize: 10, background: 'var(--primary-soft)', color: 'var(--primary)' }}>운영자 발급</span>
                      : <span className="badge" style={{ marginLeft: 6, fontSize: 10, background: '#e8f5e9', color: '#2e7d32' }}>직접 생성</span>
                    }
                    {' · '}{formatDate(link.createdAt)}
                  </span>
                </div>
                {link.contentTitle && <p style={{ fontSize: 13, color: 'var(--charcoal)', marginBottom: 8 }}>{link.contentTitle}</p>}
                <div style={{ fontSize: 12, color: 'var(--steel)', marginBottom: 4 }}>
                  링크: <code style={{ background: 'var(--surface-soft)', padding: '2px 6px', borderRadius: 4, fontSize: 11, wordBreak: 'break-all' }}>{linkUrl}</code>
                  &nbsp;· 수수료율: {formatPercent(link.commissionRateAtCreation)}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--steel)', marginBottom: 12, flexWrap: 'wrap' }}>
                  <span>클릭 <strong style={{ color: 'var(--ink)' }}>{link.clicks}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-ghost btn-small" onClick={() => copyLink(link.linkCode, link.id)}>
                    {copiedId === link.id ? '복사됨!' : '링크 복사'}
                  </button>
                  <button
                    className="btn-ghost btn-small"
                    style={{ color: link.active ? 'var(--critical)' : 'var(--success)' }}
                    onClick={() => handleToggle(link.id)}
                  >
                    {link.active ? '비활성화' : '활성화'}
                  </button>
                  <button className="btn-ghost btn-small" onClick={() => handleReissue(link.id)}>코드 재발급</button>
                  <button className="btn-ghost btn-small" onClick={() => handleClick(link.id)}>테스트 클릭</button>
                  <button className="btn-ghost btn-small" onClick={() => handleCreateOrder(link.id)}>테스트 주문</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
