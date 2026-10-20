import { useState } from 'react';
import { getProducts, updateProduct, formatKRW, formatPercent } from '../store/data';
import ProductImage from '../components/ProductImage';

interface Props {
  onRefresh: () => void;
}

export default function AdminProducts({ onRefresh }: Props) {
  const [products, setProducts] = useState(getProducts());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', commissionRate: '' });

  const refreshData = () => {
    setProducts(getProducts());
    onRefresh();
  };

  const startEdit = (id: string) => {
    const p = products.find(pr => pr.id === id);
    if (p) {
      setEditingId(id);
      setEditForm({
        name: p.name,
        description: p.description,
        price: String(p.price),
        commissionRate: String(p.commissionRate * 100),
      });
    }
  };

  const handleSave = () => {
    if (!editingId) return;
    updateProduct(editingId, {
      name: editForm.name,
      description: editForm.description,
      price: Number(editForm.price) || 0,
      commissionRate: (Number(editForm.commissionRate) || 0) / 100,
    });
    setEditingId(null);
    refreshData();
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 4 }}>상품 관리</h1>
      <p style={{ fontSize: 14, color: 'var(--steel)', marginBottom: 24 }}>
        테스트 상품 정보 및 수수료율 수정 <span className="text-test-data">테스트 데이터</span>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {products.map(p => (
          <div key={p.id} className="card" style={{ padding: 16 }}>
            {editingId === p.id ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">상품명</label>
                    <input className="input-field" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">가격 (원)</label>
                    <input className="input-field" type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">수수료율 (%)</label>
                    <input className="input-field" type="number" step="0.1" value={editForm.commissionRate} onChange={e => setEditForm({ ...editForm, commissionRate: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">설명</label>
                  <input className="input-field" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn-buy btn-small" onClick={handleSave}>저장</button>
                  <button className="btn-ghost btn-small" onClick={() => setEditingId(null)}>취소</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <ProductImage name={p.name} infoReady={p.infoReady} size={64} rounded="var(--rounded-lg)" />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: 16 }}>{p.name}</strong>
                    {!p.infoReady && <span className="badge badge-warning" style={{ fontSize: 11 }}>정보 준비 중</span>}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--charcoal)', marginBottom: 4 }}>
                    {p.description || '설명 없음'}
                  </p>
                  <div style={{ fontSize: 13, color: 'var(--steel)' }}>
                    가격: {p.price ? formatKRW(p.price) : '미정'} · 수수료율: {formatPercent(p.commissionRate)}
                  </div>
                </div>
                <button className="btn-ghost btn-small" onClick={() => startEdit(p.id)}>수정</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-test-data" style={{ textAlign: 'center', marginTop: 16 }}>
        ※ 가격과 수수료율은 테스트 예시이며, 실제 판매 조건이 아닙니다.
      </p>
    </div>
  );
}
