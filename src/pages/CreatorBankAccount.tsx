import { useState, useEffect, type FormEvent } from 'react';
import { getMyBankAccounts, addBankAccount, deleteBankAccount, setDefaultBankAccount } from '../api/bank';
import { formatDate } from '../types';
import type { BankAccount } from '../types';

const BANKS = [
  '국민은행', '신한은행', '우리은행', '하나은행', '농협은행',
  'IBK기업은행', 'SC제일은행', '대구은행', '부산은행', '경남은행',
  '광주은행', '전북은행', '제주은행', '케이뱅크', '카카오뱅크', '토스뱅크',
];

export default function CreatorBankAccount() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadAccounts = () => {
    getMyBankAccounts().then(res => { if (res.data) setAccounts(res.data); }).catch(() => {});
  };

  useEffect(() => { loadAccounts(); }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!bankName || !accountNumber || !accountHolder) {
      setError('모든 항목을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await addBankAccount({ bankName, accountNumber, accountHolder });
      setBankName('');
      setAccountNumber('');
      setAccountHolder('');
      setShowForm(false);
      loadAccounts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '계좌 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('계좌를 삭제하시겠습니까?')) return;
    try {
      await deleteBankAccount(id);
      loadAccounts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultBankAccount(id);
      loadAccounts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '설정에 실패했습니다.');
    }
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>정산 계좌</h1>
          <p style={{ fontSize: 14, color: 'var(--steel)' }}>
            정산 시 사용할 계좌를 관리합니다. 계좌번호는 암호화되어 저장됩니다.
          </p>
        </div>
        {!showForm && (
          <button className="btn-buy" onClick={() => setShowForm(true)}>+ 계좌 등록</button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>새 계좌 등록</h3>
          {error && (
            <div style={{ background: 'var(--critical-soft)', color: 'var(--critical)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleAdd}>
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">은행</label>
              <select className="select-field" value={bankName} onChange={e => setBankName(e.target.value)} disabled={submitting}>
                <option value="">선택하세요</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">계좌번호</label>
              <input className="input-field" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="숫자만 입력" disabled={submitting} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">예금주</label>
              <input className="input-field" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder="예금주명" disabled={submitting} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-buy" type="submit" disabled={submitting}>{submitting ? '등록 중...' : '등록'}</button>
              <button className="btn-ghost" type="button" onClick={() => { setShowForm(false); setError(''); }}>취소</button>
            </div>
          </form>
        </div>
      )}

      {accounts.length === 0 && !showForm ? (
        <div className="empty-state"><p>등록된 계좌가 없습니다.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {accounts.map(acc => (
            <div key={acc.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                  {acc.bankName} {acc.accountNumberMasked}
                  {acc.isDefault && <span className="badge badge-success" style={{ marginLeft: 8 }}>기본</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--steel)' }}>
                  {acc.accountHolder} · 등록일 {formatDate(acc.createdAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!acc.isDefault && (
                  <button className="btn-ghost btn-small" onClick={() => handleSetDefault(acc.id)}>기본 설정</button>
                )}
                <button className="btn-ghost btn-small" style={{ color: 'var(--critical)' }} onClick={() => handleDelete(acc.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
