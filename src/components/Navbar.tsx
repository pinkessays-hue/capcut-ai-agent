import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { ViewMode } from '../App';
import { getCreators } from '../store/data';

interface NavbarProps {
  viewMode: ViewMode;
  onSwitchView: (mode: ViewMode) => void;
  selectedCreatorId: string;
  onSelectCreator: (id: string) => void;
  isLanding: boolean;
}

export default function Navbar({ viewMode, onSwitchView, selectedCreatorId, onSelectCreator, isLanding }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const creators = getCreators().filter(c => c.status === 'approved');
  const selectedCreator = creators.find(c => c.id === selectedCreatorId);

  const creatorLinks = [
    { path: '/creator', label: '대시보드' },
    { path: '/creator/products', label: '상품' },
    { path: '/creator/links', label: '링크' },
    { path: '/creator/orders', label: '실적' },
    { path: '/creator/settlement', label: '정산' },
    { path: '/creator/profile', label: '프로필' },
  ];

  const adminLinks = [
    { path: '/admin', label: '현황' },
    { path: '/admin/creators', label: '크리에이터' },
    { path: '/admin/products', label: '상품' },
    { path: '/admin/links', label: '링크' },
    { path: '/admin/orders', label: '주문' },
    { path: '/admin/settlement', label: '정산' },
  ];

  const navLinks = viewMode === 'creator' ? creatorLinks : viewMode === 'admin' ? adminLinks : [];

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'var(--canvas)',
      borderBottom: '1px solid var(--hairline-soft)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        gap: 16,
      }}>
        <Link to="/" onClick={() => onSwitchView('public')} style={{
          fontWeight: 700,
          fontSize: 16,
          color: 'var(--ink-deep)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          홈앤힐 · 쉬어
        </Link>

        {!isLanding && (
          <div className="nav-pills-desktop" style={{
            display: 'flex',
            gap: 6,
            overflow: 'auto',
            flexShrink: 1,
          }}>
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`pill-tab ${location.pathname === link.path ? 'active' : ''}`}
                style={{ textDecoration: 'none', fontSize: 13 }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!isLanding && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className={`pill-tab ${viewMode === 'creator' ? 'active' : ''}`}
                onClick={() => onSwitchView('creator')}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                크리에이터
              </button>
              <button
                className={`pill-tab ${viewMode === 'admin' ? 'active' : ''}`}
                onClick={() => onSwitchView('admin')}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                운영자
              </button>
            </div>
          )}

          {!isLanding && viewMode === 'creator' && (
            <select
              value={selectedCreatorId}
              onChange={e => onSelectCreator(e.target.value)}
              style={{
                fontSize: 12,
                padding: '6px 8px',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--rounded-lg)',
                background: 'var(--canvas)',
                color: 'var(--ink)',
                maxWidth: 120,
              }}
              aria-label="데모 크리에이터 선택"
            >
              {creators.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {!isLanding && (
            <button
              className="nav-hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="메뉴 열기"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                border: '1px solid var(--hairline)',
              }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          )}
        </div>
      </div>

      {menuOpen && !isLanding && (
        <div className="nav-mobile-menu" style={{
          background: 'var(--canvas)',
          borderBottom: '1px solid var(--hairline-soft)',
          padding: '8px 16px 16px',
        }}>
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                padding: '10px 0',
                fontSize: 15,
                fontWeight: location.pathname === link.path ? 700 : 400,
                color: location.pathname === link.path ? 'var(--primary)' : 'var(--ink)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--hairline-soft)',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .nav-pills-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
        @media (min-width: 768px) {
          .nav-mobile-menu { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
