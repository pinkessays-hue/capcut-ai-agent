import { useState, useEffect } from 'react';
import { getAllCreators, updateCreatorStatus, approveCreator, rejectCreator } from '../api/creators';
import { getProducts } from '../api/products';
import { formatDate, CHANNEL_LABELS, CREATOR_STATUS_LABELS } from '../types';
import type { Creator, Product, CreatorStatus } from '../types';

export default function AdminCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<CreatorStatus | 'all'>('all');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const loadData = () => {
    getAllCreators().then(res => { if (res.data) setCreators(res.data); }).catch(() => {});
    getProducts().then(res => { if (res.data) setProducts(res.data); }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await approveCreator(id);
      loadData();
    } catch { /* silent */ } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      await rejectCreator(id, rejectReason.trim() || undefined);
      setRejectId(null);
      setRejectReason('');
      loadData();
    } catch { /* silent */ } finally {
      setProcessing(null);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setProcessing(id);
    try {
      await updateCreatorStatus(id, newStatus as CreatorStatus);
      loadData();
    } catch { /* silent */ } finally {
      setProcessing(null);
    }
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || id;

  const statusBadge = (s: CreatorStatus) => {
    const cls = s === 'active' ? 'badge-success' : s === 'pending' ? 'badge-pending' : s === 'rejected' ? 'badge-critical' : 'badge-critical';
    return <span className={`badge ${cls}`}>{CREATOR_STATUS_LABELS[s] || s}</span>;
  };

  const filtered = filter === 'all' ? creators : creators.filter(c => c.status === filter);
  const pendingCount = creators.filter(c => c.status === 'pending').length;

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 16 }}>크리에이터 관리</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'active', 'suspended', 'rejected'] as const).map(s => (
          <button
            key={s}
            className={filter === s ? 'btn-buy btn-small' : 'btn-ghost btn-small'}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? '전체' : CREATOR_STATUS_LABELS[s]}
            {s === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><p>{filter === 'all' ? '등록된 크리에이터가 없습니다.' : '해당 상태의 크리에이터가 없습니다.'}</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(c => (
            <div key={c.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</span>
                  <span style={{ marginLeft: 8 }}>{statusBadge(c.status)}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--stone)' }}>{formatDate(c.createdAt)}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 13, marginBottom: 12 }}>
                <span style={{ color: 'var(--stone)' }}>이메일</span>
                <span>{c.email}</span>
                <span style={{ color: 'var(--stone)' }}>연락처</span>
                <span>{c.phone || '-'}</span>
                <span style={{ color: 'var(--stone)' }}>카테고리</span>
                <span>{c.category || '-'}</span>
                <span style={{ color: 'var(--stone)' }}>채널</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {c.channels && c.channels.length > 0
                    ? c.channels.map((ch: string) => (
                        <span key={ch} className="badge badge-info" style={{ fontSize: 11 }}>{CHANNEL_LABELS[ch as keyof typeof CHANNEL_LABELS] || ch}</span>
                      ))
                    : <span style={{ color: 'var(--stone)' }}>-</span>
                  }
                </div>
                <span style={{ color: 'var(--stone)' }}>희망 상품</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {c.selectedProducts && c.selectedProducts.length > 0
                    ? c.selectedProducts.map(pid => (
                        <span key={pid} className="badge" style={{ fontSize: 11, background: 'var(--surface-soft)', color: 'var(--ink)' }}>{getProductName(pid)}</span>
                      ))
                    : <span style={{ color: 'var(--stone)' }}>-</span>
                  }
                </div>
              </div>

              {c.status === 'rejected' && c.rejectionReason && (
                <div style={{ fontSize: 13, color: 'var(--critical)', background: 'var(--critical-soft)', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                  반려 사유: {c.rejectionReason}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {c.status === 'pending' && (
                  <>
                    <button
                      className="btn-buy btn-small"
                      onClick={() => handleApprove(c.id)}
                      disabled={processing === c.id}
                    >
                      {processing === c.id ? '처리 중...' : '승인'}
                    </button>
                    {rejectId === c.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          className="input-field"
                          style={{ width: 200, padding: '6px 10px', fontSize: 13 }}
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="반려 사유 (선택)"
                        />
                        <button
                          className="btn-ghost btn-small"
                          style={{ color: 'var(--critical)' }}
                          onClick={() => handleReject(c.id)}
                          disabled={processing === c.id}
                        >
                          반려 확인
                        </button>
                        <button className="btn-ghost btn-small" onClick={() => { setRejectId(null); setRejectReason(''); }}>취소</button>
                      </div>
                    ) : (
                      <button
                        className="btn-ghost btn-small"
                        style={{ color: 'var(--critical)' }}
                        onClick={() => setRejectId(c.id)}
                      >
                        반려
                      </button>
                    )}
                  </>
                )}
                {(c.status === 'active' || c.status === 'suspended') && (
                  <button
                    className="btn-ghost btn-small"
                    style={{ color: c.status === 'active' ? 'var(--critical)' : 'var(--success)' }}
                    onClick={() => handleToggleStatus(c.id, c.status)}
                    disabled={processing === c.id}
                  >
                    {c.status === 'active' ? '정지' : '활성화'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
