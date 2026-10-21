import { useState, useEffect, useRef } from 'react';
import { getProducts, updateProduct, createProduct, uploadThumbnail } from '../api/products';
import { formatKRW, formatPercent } from '../types';
import type { Product } from '../types';
import ProductImage from '../components/ProductImage';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOriginalName, setEditOriginalName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editRate, setEditRate] = useState(0);
  const [editStatus, setEditStatus] = useState<'active' | 'inactive' | 'preparing'>('active');
  const [editProductUrl, setEditProductUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOriginalName, setNewOriginalName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState(0);
  const [newRate, setNewRate] = useState(5);
  const [newStatus, setNewStatus] = useState<'active' | 'inactive' | 'preparing'>('active');
  const [newProductUrl, setNewProductUrl] = useState('');
  const [creating, setCreating] = useState(false);

  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const newThumbRef = useRef<HTMLInputElement>(null);
  const editThumbRef = useRef<HTMLInputElement>(null);
  const [newThumbPreview, setNewThumbPreview] = useState<string | null>(null);
  const [newThumbFile, setNewThumbFile] = useState<File | null>(null);

  const loadData = () => {
    getProducts().then(res => { if (res.data) setProducts(res.data); }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const startEdit = (p: Product) => {
    setEditId(p.id);
    setEditName(p.name);
    setEditOriginalName(p.originalName || '');
    setEditDesc(p.description);
    setEditPrice(p.price);
    setEditRate(p.commissionRate * 100);
    setEditStatus(p.saleStatus);
    setEditProductUrl(p.productUrl || '');
  };

  const handleSave = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await updateProduct(editId, {
        name: editName,
        originalName: editOriginalName || undefined,
        description: editDesc,
        price: editPrice,
        commissionRate: editRate / 100,
        saleStatus: editStatus,
        productUrl: editProductUrl || undefined,
      });
      setEditId(null);
      loadData();
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await createProduct({
        name: newName,
        originalName: newOriginalName || undefined,
        description: newDesc,
        price: newPrice,
        commissionRate: newRate / 100,
        saleStatus: newStatus,
        productUrl: newProductUrl || undefined,
        infoReady: true,
      });
      if (res.data && newThumbFile) {
        await uploadThumbnail(res.data.id, newThumbFile);
      }
      setShowCreate(false);
      setNewName(''); setNewOriginalName(''); setNewDesc('');
      setNewPrice(0); setNewRate(5); setNewStatus('active'); setNewProductUrl('');
      setNewThumbFile(null); setNewThumbPreview(null);
      loadData();
    } catch { /* silent */ } finally {
      setCreating(false);
    }
  };

  const handleThumbUpload = async (productId: string, file: File) => {
    setUploading(productId);
    setUploadMsg(null);
    try {
      await uploadThumbnail(productId, file);
      setUploadMsg('이미지가 업로드되었습니다.');
      loadData();
      setTimeout(() => setUploadMsg(null), 2000);
    } catch (err: unknown) {
      setUploadMsg(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(null);
    }
  };

  const handleNewThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewThumbFile(file);
    const reader = new FileReader();
    reader.onload = () => setNewThumbPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="section-title" style={{ marginBottom: 0 }}>상품 관리</h1>
        {!showCreate && (
          <button className="btn-buy" onClick={() => setShowCreate(true)}>+ 상품 추가</button>
        )}
      </div>

      {uploadMsg && (
        <div style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          {uploadMsg}
        </div>
      )}

      {showCreate && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>새 상품 등록</h3>

          <div style={{ marginBottom: 12 }}>
            <label className="form-label">썸네일 이미지</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {newThumbPreview ? (
                <div style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={newThumbPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: 8, background: 'var(--surface-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📷</div>
              )}
              <div>
                <input ref={newThumbRef} type="file" accept="image/*" onChange={handleNewThumbChange} style={{ display: 'none' }} />
                <button className="btn-ghost btn-small" onClick={() => newThumbRef.current?.click()}>
                  {newThumbFile ? '이미지 변경' : '이미지 선택'}
                </button>
                <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 4 }}>JPG, PNG, WebP (최대 5MB)</p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="form-label">표시명 *</label>
            <input className="input-field" value={newName} onChange={e => setNewName(e.target.value)} placeholder="고객에게 보여질 상품명" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">정식 상품명</label>
            <input className="input-field" value={newOriginalName} onChange={e => setNewOriginalName(e.target.value)} placeholder="카페24 등록 상품명 (선택)" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">설명</label>
            <textarea className="input-field" rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="상품 설명" style={{ resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">상품 URL</label>
            <input className="input-field" value={newProductUrl} onChange={e => setNewProductUrl(e.target.value)} placeholder="https://homeandheal.co.kr/product/..." />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 140px' }}>
              <label className="form-label">가격 (원)</label>
              <input className="input-field" type="number" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label className="form-label">수수료율 (%)</label>
              <input className="input-field" type="number" step="0.1" value={newRate} onChange={e => setNewRate(Number(e.target.value))} />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label className="form-label">판매 상태</label>
              <select className="select-field" value={newStatus} onChange={e => setNewStatus(e.target.value as typeof newStatus)}>
                <option value="active">판매 중</option>
                <option value="preparing">준비 중</option>
                <option value="inactive">판매 종료</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-buy" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? '등록 중...' : '상품 등록'}
            </button>
            <button className="btn-ghost" onClick={() => { setShowCreate(false); setNewThumbFile(null); setNewThumbPreview(null); }}>취소</button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="empty-state"><p>등록된 상품이 없습니다.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {products.map(p => (
            <div key={p.id} className="card" style={{ overflow: 'hidden' }}>
              {editId === p.id ? (
                <div style={{ padding: 20 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">썸네일 이미지</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                        <ProductImage product={p} size={80} />
                      </div>
                      <div>
                        <input
                          ref={editThumbRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleThumbUpload(p.id, file);
                          }}
                        />
                        <button className="btn-ghost btn-small" onClick={() => editThumbRef.current?.click()} disabled={uploading === p.id}>
                          {uploading === p.id ? '업로드 중...' : p.thumbnailUrl ? '이미지 변경' : '이미지 업로드'}
                        </button>
                        <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 4 }}>JPG, PNG, WebP (최대 5MB)</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">표시명</label>
                    <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">정식 상품명</label>
                    <input className="input-field" value={editOriginalName} onChange={e => setEditOriginalName(e.target.value)} placeholder="카페24 등록 상품명 (선택)" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">설명</label>
                    <textarea className="input-field" rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">상품 URL</label>
                    <input className="input-field" value={editProductUrl} onChange={e => setEditProductUrl(e.target.value)} placeholder="https://homeandheal.co.kr/product/..." />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 140px' }}>
                      <label className="form-label">가격 (원)</label>
                      <input className="input-field" type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} />
                    </div>
                    <div style={{ flex: '1 1 140px' }}>
                      <label className="form-label">수수료율 (%)</label>
                      <input className="input-field" type="number" step="0.1" value={editRate} onChange={e => setEditRate(Number(e.target.value))} />
                    </div>
                    <div style={{ flex: '1 1 140px' }}>
                      <label className="form-label">판매 상태</label>
                      <select className="select-field" value={editStatus} onChange={e => setEditStatus(e.target.value as typeof editStatus)}>
                        <option value="active">판매 중</option>
                        <option value="preparing">준비 중</option>
                        <option value="inactive">판매 종료</option>
                      </select>
                    </div>
                  </div>
                  {!p.infoReady && (
                    <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 12, fontStyle: 'italic' }}>
                      제품 정보 준비 중 — 정보가 확정되면 infoReady를 서버에서 활성화하세요.
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-buy" onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
                    <button className="btn-ghost" onClick={() => setEditId(null)}>취소</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 12, overflow: 'hidden' }}>
                    <ProductImage product={p} size={80} />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      {p.name}
                      {!p.infoReady && <span className="badge badge-pending" style={{ marginLeft: 8 }}>정보 미정</span>}
                      {p.saleStatus !== 'active' && <span className="badge badge-pending" style={{ marginLeft: 4 }}>{p.saleStatus === 'preparing' ? '준비 중' : '판매 종료'}</span>}
                    </div>
                    {p.originalName && <div style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 2 }}>{p.originalName}</div>}
                    <div style={{ fontSize: 13, color: 'var(--steel)' }}>
                      {p.infoReady ? `${formatKRW(p.price)} · 수수료 ${formatPercent(p.commissionRate)}` : '제품 정보 준비 중'}
                    </div>
                    {p.productUrl && <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2, wordBreak: 'break-all' }}>{p.productUrl}</div>}
                  </div>
                  <button className="btn-ghost btn-small" onClick={() => startEdit(p)}>수정</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
