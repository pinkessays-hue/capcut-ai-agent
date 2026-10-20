import { useState, useCallback, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import ApplyPage from './pages/ApplyPage';
import CreatorDashboard from './pages/CreatorDashboard';
import CreatorProducts from './pages/CreatorProducts';
import CreatorLinks from './pages/CreatorLinks';
import CreatorOrders from './pages/CreatorOrders';
import CreatorSettlement from './pages/CreatorSettlement';
import CreatorProfile from './pages/CreatorProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminCreators from './pages/AdminCreators';
import AdminLinks from './pages/AdminLinks';
import AdminOrders from './pages/AdminOrders';
import AdminSettlement from './pages/AdminSettlement';
import AdminProducts from './pages/AdminProducts';

export type ViewMode = 'public' | 'creator' | 'admin';

export default function App() {
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('creator_1');
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const viewMode: ViewMode = useMemo(() => {
    if (location.pathname.startsWith('/creator')) return 'creator';
    if (location.pathname.startsWith('/admin')) return 'admin';
    return 'public';
  }, [location.pathname]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const handleSwitchView = (mode: ViewMode) => {
    if (mode === 'public') navigate('/');
    else if (mode === 'creator') navigate('/creator');
    else navigate('/admin');
  };

  const handleSelectCreator = (id: string) => {
    setSelectedCreatorId(id);
    navigate('/creator');
  };

  const isLanding = location.pathname === '/' || location.pathname === '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        viewMode={viewMode}
        onSwitchView={handleSwitchView}
        selectedCreatorId={selectedCreatorId}
        onSelectCreator={handleSelectCreator}
        isLanding={isLanding}
      />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage onApply={() => navigate('/apply')} />} />
          <Route path="/apply" element={<ApplyPage onSuccess={() => { navigate('/'); }} />} />
          <Route path="/creator" element={<CreatorDashboard creatorId={selectedCreatorId} key={refreshKey} />} />
          <Route path="/creator/products" element={<CreatorProducts creatorId={selectedCreatorId} onRefresh={refresh} key={refreshKey} />} />
          <Route path="/creator/links" element={<CreatorLinks creatorId={selectedCreatorId} onRefresh={refresh} key={refreshKey} />} />
          <Route path="/creator/orders" element={<CreatorOrders creatorId={selectedCreatorId} key={refreshKey} />} />
          <Route path="/creator/settlement" element={<CreatorSettlement creatorId={selectedCreatorId} key={refreshKey} />} />
          <Route path="/creator/profile" element={<CreatorProfile creatorId={selectedCreatorId} />} />
          <Route path="/admin" element={<AdminDashboard key={refreshKey} />} />
          <Route path="/admin/creators" element={<AdminCreators onRefresh={refresh} onSelectCreator={handleSelectCreator} key={refreshKey} />} />
          <Route path="/admin/links" element={<AdminLinks onRefresh={refresh} key={refreshKey} />} />
          <Route path="/admin/orders" element={<AdminOrders onRefresh={refresh} key={refreshKey} />} />
          <Route path="/admin/settlement" element={<AdminSettlement onRefresh={refresh} key={refreshKey} />} />
          <Route path="/admin/products" element={<AdminProducts onRefresh={refresh} key={refreshKey} />} />
        </Routes>
      </main>
      {!isLanding && (
        <footer style={{
          textAlign: 'center',
          padding: '24px 16px',
          fontSize: '12px',
          color: 'var(--stone)',
          borderTop: '1px solid var(--hairline-soft)',
          marginTop: 'auto',
        }}>
          <span className="text-test-data" style={{ marginRight: 8 }}>테스트 데이터</span>
          홈앤힐 · 쉬어 크리에이터 파트너스 — 테스트 MVP (실제 서비스 아님)
        </footer>
      )}
    </div>
  );
}
