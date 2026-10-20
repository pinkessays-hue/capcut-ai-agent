import { useState, useEffect, type FormEvent } from 'react';
import { getIntegrationStatus, updateCafe24Config, syncCafe24Orders } from '../api/admin';
import type { IntegrationStatus } from '../types';

export default function AdminIntegrations() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [mallId, setMallId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getIntegrationStatus()
      .then(res => {
        if (res.data) {
          setStatus(res.data);
          if (res.data.cafe24.mallId) setMallId(res.data.cafe24.mallId);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveCafe24 = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!mallId || !clientId || !clientSecret) {
      setMessage('모든 항목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await updateCafe24Config({ mallId, clientId, clientSecret });
      setMessage('카페24 설정이 저장되었습니다.');
      setClientSecret('');
      const res = await getIntegrationStatus();
      if (res.data) setStatus(res.data);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setMessage('');
    setSyncing(true);
    try {
      const res = await syncCafe24Orders();
      setMessage(res.data ? `${res.data.synced}건의 주문이 동기화되었습니다.` : '동기화가 완료되었습니다.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : '동기화에 실패했습니다.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 4 }}>연동 관리</h1>
      <p style={{ fontSize: 14, color: 'var(--steel)', marginBottom: 24 }}>
        외부 서비스 연동 상태 및 설정
      </p>

      {/* Cafe24 */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>카페24 (자사몰)</h2>
          <span className={`badge ${status?.cafe24.connected ? 'badge-success' : 'badge-pending'}`}>
            {status?.cafe24.connected ? '연동됨' : '미연동'}
          </span>
        </div>
        {status?.cafe24.connected && status.cafe24.lastSync && (
          <p style={{ fontSize: 13, color: 'var(--steel)', marginBottom: 12 }}>
            마지막 동기화: {status.cafe24.lastSync}
          </p>
        )}
        <p style={{ fontSize: 13, color: 'var(--charcoal)', marginBottom: 16 }}>
          카페24 OpenAPI를 통해 주문 데이터를 동기화합니다.
          Mall ID, Client ID, Client Secret은 카페24 관리자 &gt; 앱 관리에서 발급받을 수 있습니다.
          인증 정보는 서버 환경 변수에 안전하게 저장됩니다.
        </p>

        <form onSubmit={handleSaveCafe24}>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Mall ID</label>
            <input className="input-field" value={mallId} onChange={e => setMallId(e.target.value)} placeholder="your-mall-id" disabled={saving} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Client ID</label>
            <input className="input-field" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="카페24 앱 Client ID" disabled={saving} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Client Secret</label>
            <input className="input-field" type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="카페24 앱 Client Secret" disabled={saving} autoComplete="off" />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-buy" type="submit" disabled={saving}>{saving ? '저장 중...' : '설정 저장'}</button>
            {status?.cafe24.connected && (
              <button className="btn-ghost" type="button" disabled={syncing} onClick={handleSync}>
                {syncing ? '동기화 중...' : '주문 동기화'}
              </button>
            )}
          </div>
        </form>

        {message && (
          <div style={{ marginTop: 12, fontSize: 13, color: message.includes('실패') ? 'var(--critical)' : 'var(--success)' }}>
            {message}
          </div>
        )}
      </div>

      {/* Payout Provider */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>정산 지급대행</h2>
          <span className={`badge ${status?.payout.configured ? 'badge-success' : 'badge-pending'}`}>
            {status?.payout.configured ? `연동됨 (${status.payout.provider})` : '미설정'}
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--charcoal)', marginBottom: 8 }}>
          정산 자동 지급을 위한 지급대행사를 설정합니다.
        </p>
        <div style={{ background: 'var(--surface-soft)', borderRadius: 12, padding: 16, fontSize: 13, color: 'var(--steel)' }}>
          <strong style={{ color: 'var(--charcoal)' }}>아직 활성화되지 않음</strong>
          <br /><br />
          지급대행사 연동에는 사업자 등록 및 별도 계약이 필요합니다.
          서버에 PayoutProvider 인터페이스가 구현되어 있으며,
          지급대행사 선정 후 환경 변수 설정으로 활성화할 수 있습니다.
          <br /><br />
          필요한 환경 변수: <code>PAYOUT_PROVIDER</code>, <code>PAYOUT_API_KEY</code>, <code>PAYOUT_API_SECRET</code>
        </div>
      </div>
    </div>
  );
}
