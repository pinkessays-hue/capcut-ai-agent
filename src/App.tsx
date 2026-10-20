import { useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import TestModeBanner from './components/TestModeBanner';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CreatorDashboard from './pages/CreatorDashboard';
import CreatorProducts from './pages/CreatorProducts';
import CreatorLinks from './pages/CreatorLinks';
import CreatorOrders from './pages/CreatorOrders';
import CreatorSettlement from './pages/CreatorSettlement';
import CreatorProfile from './pages/CreatorProfile';
import CreatorWallet from './pages/CreatorWallet';
import CreatorBankAccount from './pages/CreatorBankAccount';
import AdminDashboard from './pages/AdminDashboard';
import AdminCreators from './pages/AdminCreators';
import AdminLinks from './pages/AdminLinks';
import AdminOrders from './pages/AdminOrders';
import AdminSettlement from './pages/AdminSettlement';
import AdminProducts from './pages/AdminProducts';
import AdminIntegrations from './pages/AdminIntegrations';

export type ViewMode = 'public' | 'creator' | 'admin';

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const viewMode: ViewMode = useMemo(() => {
    if (location.pathname.startsWith('/creator')) return 'creator';
    if (location.pathname.startsWith('/admin')) return 'admin';
    return 'public';
  }, [location.pathname]);

  const handleSwitchView = (mode: ViewMode) => {
    if (mode === 'public') navigate('/');
    else if (mode === 'creator') navigate('/creator');
    else navigate('/admin');
  };

  const isLanding = location.pathname === '/' || location.pathname === '';
  const isAuth = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TestModeBanner />
      {!isAuth && (
        <Navbar
          viewMode={viewMode}
          onSwitchView={handleSwitchView}
          isLanding={isLanding}
        />
      )}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage onApply={() => navigate(user ? '/creator' : '/register')} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/creator" element={<ProtectedRoute requiredRole="creator"><CreatorDashboard /></ProtectedRoute>} />
          <Route path="/creator/products" element={<ProtectedRoute requiredRole="creator"><CreatorProducts /></ProtectedRoute>} />
          <Route path="/creator/links" element={<ProtectedRoute requiredRole="creator"><CreatorLinks /></ProtectedRoute>} />
          <Route path="/creator/orders" element={<ProtectedRoute requiredRole="creator"><CreatorOrders /></ProtectedRoute>} />
          <Route path="/creator/settlement" element={<ProtectedRoute requiredRole="creator"><CreatorSettlement /></ProtectedRoute>} />
          <Route path="/creator/profile" element={<ProtectedRoute requiredRole="creator"><CreatorProfile /></ProtectedRoute>} />
          <Route path="/creator/wallet" element={<ProtectedRoute requiredRole="creator"><CreatorWallet /></ProtectedRoute>} />
          <Route path="/creator/bank-account" element={<ProtectedRoute requiredRole="creator"><CreatorBankAccount /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/creators" element={<ProtectedRoute requiredRole="admin"><AdminCreators /></ProtectedRoute>} />
          <Route path="/admin/links" element={<ProtectedRoute requiredRole="admin"><AdminLinks /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute requiredRole="admin"><AdminOrders /></ProtectedRoute>} />
          <Route path="/admin/settlement" element={<ProtectedRoute requiredRole="admin"><AdminSettlement /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute requiredRole="admin"><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/integrations" element={<ProtectedRoute requiredRole="admin"><AdminIntegrations /></ProtectedRoute>} />
        </Routes>
      </main>
      {!isLanding && !isAuth && (
        <footer style={{
          textAlign: 'center',
          padding: '24px 16px',
          fontSize: '12px',
          color: 'var(--stone)',
          borderTop: '1px solid var(--hairline-soft)',
          marginTop: 'auto',
        }}>
          홈앤힐 · 쉬어 크리에이터 파트너스
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
