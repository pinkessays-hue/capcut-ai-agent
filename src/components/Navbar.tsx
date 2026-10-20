import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ViewMode } from '../App';

interface Props {
  viewMode: ViewMode;
  onSwitchView: (mode: ViewMode) => void;
  isLanding: boolean;
}

const CREATOR_NAV = [
  { label: '대시보드', path: '/creator' },
  { label: '상품', path: '/creator/products' },
  { label: '링크', path: '/creator/links' },
  { label: '주문', path: '/creator/orders' },
  { label: '포인트', path: '/creator/wallet' },
  { label: '정산', path: '/creator/settlement' },
  { label: '계좌', path: '/creator/bank-account' },
  { label: '프로필', path: '/creator/profile' },
];

const ADMIN_NAV = [
  { label: '대시보드', path: '/admin' },
  { label: '크리에이터', path: '/admin/creators' },
  { label: '상품', path: '/admin/products' },
  { label: '링크', path: '/admin/links' },
  { label: '주문', path: '/admin/orders' },
  { label: '정산', path: '/admin/settlement' },
  { label: '연동', path: '/admin/integrations' },
];

export default function Navbar({ viewMode, onSwitchView, isLanding }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = viewMode === 'creator' ? CREATOR_NAV : viewMode === 'admin' ? ADMIN_NAV : [];

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: '#fff',
      borderBottom: '1px solid var(--hairline-soft)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        padding: '0 16px',
      }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 700, fontSize: 15 }}>
          홈앤힐 파트너스
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user ? (
            <>
              {user.role === 'admin' && viewMode !== 'admin' && (
                <button className="btn-ghost btn-small" onClick={() => onSwitchView('admin')}>운영자</button>
              )}
              {user.role === 'admin' && viewMode === 'admin' && (
                <button className="btn-ghost btn-small" onClick={() => onSwitchView('creator')}>크리에이터</button>
              )}
              <span style={{ fontSize: 13, color: 'var(--steel)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
              <button className="btn-ghost btn-small" onClick={logout}>로그아웃</button>
            </>
          ) : (
            !isLanding && (
              <>
                <Link to="/login" className="btn-ghost btn-small" style={{ textDecoration: 'none' }}>로그인</Link>
                <Link to="/register" className="btn-buy btn-small" style={{ textDecoration: 'none' }}>가입</Link>
              </>
            )
          )}
          {navItems.length > 0 && (
            <button
              className="btn-ghost btn-small"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ display: 'none', padding: '6px 10px' }}
              aria-label="메뉴"
              id="nav-hamburger"
            >
              ☰
            </button>
          )}
        </div>
      </div>

      {navItems.length > 0 && (
        <div
          className="container nav-pills-scroll"
          id="nav-pills"
          style={{
            display: 'flex',
            gap: 4,
            padding: '0 12px 10px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`pill-tab ${location.pathname === item.path ? 'pill-tab-active' : ''}`}
              style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {mobileOpen && navItems.length > 0 && (
        <div id="mobile-nav" style={{
          padding: '8px 16px 16px',
          borderTop: '1px solid var(--hairline-soft)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`pill-tab ${location.pathname === item.path ? 'pill-tab-active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
