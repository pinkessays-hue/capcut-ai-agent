import { useState, useEffect } from 'react';
import { getDashboardStats, getIntegrationStatus, resetTestData } from '../api/admin';
import { formatKRW } from '../types';
import type { IntegrationStatus } from '../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCreators: 0, activeCreators: 0, totalLinks: 0, totalClicks: 0,
    totalOrders: 0, totalSales: 0, totalCommission: 0, pendingSettlement: 0,
  });
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    getDashboardStats().then(res => { if (res.data) setStats(res.data); }).catch(() => {});
    getIntegrationStatus().then(res => { if (res.data) setIntegrations(res.data); }).catch(() => {});
  }, []);

  const handleReset = async () => {
    if (!confirm('테스트 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setResetting(true);
    try {
      await resetTestData();
      window.location.reload();
    } catch { /* silent */ } finally {
      setResetting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="section-title" style={{ marginBottom: 0 }}>운영자 대시보드</h1>
        <button className="btn-ghost" onClick={handleReset} disabled={resetting} style={{ color: 'var(--critical)' }}>
          {resetting ? '초기화 중...' : '테스트 데이터 초기화'}
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card"><div className="stat-label">크리에이터</div><div className="stat-value">{stats.totalCreators} <span style={{ fontSize: 13, color: 'var(--steel)', fontWeight: 400 }}>({stats.activeCreators} 활성)</span></div></div>
        <div className="stat-card"><div className="stat-label">총 링크</div><div className="stat-value">{stats.totalLinks}</div></div>
        <div className="stat-card"><div className="stat-label">총 클릭</div><div className="stat-value">{stats.totalClicks.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">총 주문</div><div className="stat-value">{stats.totalOrders}</div></div>
        <div className="stat-card"><div className="stat-label">총 매출</div><div className="stat-value">{formatKRW(stats.totalSales)}</div></div>
        <div className="stat-card"><div className="stat-label">총 수수료</div><div className="stat-value" style={{ color: 'var(--primary)' }}>{formatKRW(stats.totalCommission)}</div></div>
        <div className="stat-card"><div className="stat-label">정산 대기</div><div className="stat-value" style={{ color: 'var(--warning, #e67700)' }}>{formatKRW(stats.pendingSettlement)}</div></div>
      </div>

      {/* Integration status */}
      <h2 className="section-subtitle">연동 상태</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 32 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>카페24 (자사몰)</span>
            <span className={`badge ${integrations?.cafe24.connected ? 'badge-success' : 'badge-pending'}`}>
              {integrations?.cafe24.connected ? '연동됨' : '미연동'}
            </span>
          </div>
          {integrations?.cafe24.mallId && (
            <div style={{ fontSize: 12, color: 'var(--steel)', marginTop: 4 }}>Mall: {integrations.cafe24.mallId}</div>
          )}
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>정산 지급대행</span>
            <span className={`badge ${integrations?.payout.configured ? 'badge-success' : 'badge-pending'}`}>
              {integrations?.payout.configured ? '연동됨' : '미설정'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
